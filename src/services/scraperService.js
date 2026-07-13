const FacebookAdsScraper = require('./facebookAdsScraper');
const GoogleMapsScraper = require('./googleMapsScraper');
const WebsiteScraper = require('./websiteScraper');
const ExportService = require('./exportService');
const { mergeAllPhones } = require('../utils/phoneExtractor');
const { mergeAllEmails } = require('../utils/emailExtractor');
const { normalizeUrl } = require('../utils/urlUtils');

class ScraperService {
  constructor() {
    this.facebookScraper = new FacebookAdsScraper();
    this.googleMapsScraper = new GoogleMapsScraper();
    this.websiteScraper = new WebsiteScraper();
    this.exportService = new ExportService();
    this.sessions = new Map();
  }

  createSession(type = 'facebook') {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const session = {
      id,
      type,
      status: 'idle',
      progress: 0,
      step: '',
      message: '',
      ads: [],
      results: [],
      totalBusinesses: 0,
      totalPhones: 0,
      totalEmails: 0,
      createdAt: new Date(),
      exportFileName: null,
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id) {
    return this.sessions.get(id);
  }

  async startExtraction(sessionId, adsUrl, onProgress) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.status = 'extracting_ads';

    try {
      const ads = await this.facebookScraper.scrape(adsUrl, (progress) => {
        let pct = 0;
        if (progress.step === 'facebook') {
          pct = Math.min(20, Math.round((progress.scrolls / 300) * 20));
        } else if (progress.step === 'facebook_details') {
          pct = 20 + Math.min(20, Math.round(((progress.current || 0) / (progress.total || 1)) * 20));
        }
        session.progress = Math.min(40, pct);
        session.step = progress.step;
        session.message = progress.message;
        if (onProgress) onProgress({ ...progress, sessionId, progress: session.progress });
      });

      session.ads = ads;
      session.totalBusinesses = ads.length;

      if (onProgress) {
        onProgress({
          sessionId,
          step: 'facebook_done',
          progress: 40,
          message: `Found ${ads.length} ads. Now visiting websites...`,
          adsFound: ads.length,
        });
      }

      session.status = 'crawling_websites';

      const uniqueWebsites = this._getUniqueWebsites(ads);
      const results = [];
      let completed = 0;
      const total = uniqueWebsites.length;

      const batchSize = 3;
      for (let i = 0; i < uniqueWebsites.length; i += batchSize) {
        const batch = uniqueWebsites.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(async (item) => {
            if (!item.websiteUrl) {
              return { ...item, phones: [], whatsappLinks: [], emails: [], pagesScanned: [], error: 'No website URL' };
            }

            let lastError;
            for (let retry = 0; retry <= 2; retry++) {
              try {
                return await this.websiteScraper.crawlWebsite(item.websiteUrl);
              } catch (err) {
                lastError = err;
                await new Promise((r) => setTimeout(r, 2000 * (retry + 1)));
              }
            }
            return { website: item.websiteUrl, phones: [], whatsappLinks: [], emails: [], pagesScanned: [], error: lastError?.message };
          })
        );

        batchResults.forEach((result, idx) => {
          const item = batch[idx];
          const fbPhones = item.phones || [];
          const fbWhatsApp = item.whatsappLinks || [];
          const fbEmails = item.emails || [];

          if (result.status === 'fulfilled') {
            const crawlData = result.value;
            const mergedPhones = mergeAllPhones([fbPhones, crawlData.phones]);
            const mergedWA = [...new Map(
              [...fbWhatsApp, ...(crawlData.whatsappLinks || [])]
                .map(w => [w.phone || w, w])
            ).values()];
            const mergedEmails = mergeAllEmails([fbEmails, crawlData.emails || []]);

            results.push({
              businessName: item.businessName,
              pageName: item.pageName,
              websiteUrl: item.websiteUrl,
              cta: item.cta,
              adLink: item.adLink,
              phones: mergedPhones,
              whatsappLinks: mergedWA,
              emails: mergedEmails,
              pagesScanned: crawlData.pagesScanned || [],
              error: crawlData.error || null,
            });
          } else {
            results.push({
              businessName: item.businessName,
              pageName: item.pageName,
              websiteUrl: item.websiteUrl,
              cta: item.cta,
              adLink: item.adLink,
              phones: fbPhones,
              whatsappLinks: fbWhatsApp,
              emails: fbEmails,
              pagesScanned: [],
              error: result.reason?.message || 'Unknown error',
            });
          }

          completed++;
          const pct = 40 + Math.round((completed / total) * 55);
          session.progress = Math.min(95, pct);

          if (onProgress) {
            onProgress({
              sessionId,
              step: 'crawling',
              progress: session.progress,
              message: `Visiting website ${completed}/${total}: ${item.websiteUrl || 'N/A'}`,
              completed,
              total,
            });
          }
        });
      }

      session.results = results;
      session.totalPhones = mergeAllPhones(results.map((r) => r.phones)).length;
      session.totalEmails = mergeAllEmails(results.map((r) => r.emails || [])).length;
      session.totalBusinesses = results.length;
      session.progress = 100;
      session.status = 'completed';

      if (onProgress) {
        onProgress({
          sessionId,
          step: 'completed',
          progress: 100,
          message: `Done! Found ${session.totalBusinesses} businesses, ${session.totalPhones} phones, ${session.totalEmails} emails.`,
          results,
          totalBusinesses: session.totalBusinesses,
          totalPhones: session.totalPhones,
          totalEmails: session.totalEmails,
        });
      }

      return session;
    } catch (err) {
      session.status = 'error';
      session.message = err.message;
      if (onProgress) {
        onProgress({
          sessionId,
          step: 'error',
          progress: session.progress,
          message: `Error: ${err.message}`,
          error: err.message,
        });
      }
      throw err;
    }
  }

  async startGoogleMapsExtraction(sessionId, { country, city, businessType }, onProgress) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.status = 'scraping_maps';

    try {
      const businesses = await this.googleMapsScraper.scrape({ country, city, businessType }, (progress) => {
        let pct = 0;
        if (progress.step === 'maps_scroll') {
          pct = Math.min(30, Math.round(((progress.scrolls || 0) / 50) * 30));
        } else if (progress.step === 'maps_extract') {
          pct = 30 + Math.min(10, Math.round(((progress.current || 0) / (progress.total || 1)) * 10));
        }
        session.progress = Math.min(40, pct);
        session.step = progress.step;
        session.message = progress.message;
        if (onProgress) onProgress({ ...progress, sessionId, progress: session.progress });
      });

      session.ads = businesses;
      session.totalBusinesses = businesses.length;

      if (onProgress) {
        onProgress({
          sessionId,
          step: 'maps_done',
          progress: 40,
          message: `Found ${businesses.length} businesses. Now visiting websites...`,
          businessesFound: businesses.length,
        });
      }

      session.status = 'crawling_websites';

      const websitesToCrawl = businesses.filter(b => b.website);
      const results = [];
      let completed = 0;
      const total = websitesToCrawl.length || 1;

      const batchSize = 3;
      for (let i = 0; i < websitesToCrawl.length; i += batchSize) {
        const batch = websitesToCrawl.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(async (item) => {
            let lastError;
            for (let retry = 0; retry <= 2; retry++) {
              try {
                const crawlData = await this.websiteScraper.crawlWebsite(item.website);
                return { itemId: item.businessName, crawlData };
              } catch (err) {
                lastError = err;
                await new Promise((r) => setTimeout(r, 2000 * (retry + 1)));
              }
            }
            return { itemId: item.businessName, crawlData: { phones: [], whatsappLinks: [], emails: [], pagesScanned: [], error: lastError?.message } };
          })
        );

        batchResults.forEach((result, idx) => {
          const item = batch[idx];
          const mapPhones = item.phones || [];
          const mapWA = item.whatsappLinks || [];
          const mapEmails = item.emails || [];

          if (result.status === 'fulfilled') {
            const crawlData = result.value.crawlData;
            const mergedPhones = mergeAllPhones([mapPhones, crawlData.phones]);
            const mergedWA = [...new Map(
              [...mapWA, ...(crawlData.whatsappLinks || [])].map(w => [w.phone || w, w])
            ).values()];
            const mergedEmails = mergeAllEmails([mapEmails, crawlData.emails || []]);

            results.push({
              businessName: item.businessName,
              pageName: item.businessName,
              address: item.address || '',
              phone: item.phone || '',
              websiteUrl: item.website || '',
              cta: item.category || '',
              adLink: '',
              phones: mergedPhones.length > 0 ? mergedPhones : mapPhones,
              whatsappLinks: mergedWA.length > 0 ? mergedWA : mapWA,
              emails: mergedEmails.length > 0 ? mergedEmails : mapEmails,
              rating: item.rating || '',
              reviews: item.reviews || '',
              hours: item.hours || '',
              pagesScanned: crawlData.pagesScanned || [],
              error: crawlData.error || null,
            });
          } else {
            results.push({
              businessName: item.businessName,
              pageName: item.businessName,
              address: item.address || '',
              phone: item.phone || '',
              websiteUrl: item.website || '',
              cta: item.category || '',
              adLink: '',
              phones: mapPhones,
              whatsappLinks: mapWA,
              emails: mapEmails,
              rating: item.rating || '',
              reviews: item.reviews || '',
              hours: item.hours || '',
              pagesScanned: [],
              error: result.reason?.message || 'Unknown error',
            });
          }

          completed++;
          const pct = 40 + Math.round((completed / total) * 55);
          session.progress = Math.min(95, pct);

          if (onProgress) {
            onProgress({
              sessionId,
              step: 'crawling',
              progress: session.progress,
              message: `Visiting website ${completed}/${total}: ${item.website || 'N/A'}`,
              completed,
              total,
            });
          }
        });
      }

      if (websitesToCrawl.length === 0) {
        for (const biz of businesses) {
          results.push({
            businessName: biz.businessName,
            pageName: biz.businessName,
            address: biz.address || '',
            phone: biz.phone || '',
            websiteUrl: biz.website || '',
            cta: biz.category || '',
            adLink: '',
            phones: biz.phones || [],
            whatsappLinks: biz.whatsappLinks || [],
            emails: biz.emails || [],
            rating: biz.rating || '',
            reviews: biz.reviews || '',
            hours: biz.hours || '',
            pagesScanned: [],
            error: null,
          });
        }
      }

      session.results = results;
      session.totalPhones = mergeAllPhones(results.map((r) => r.phones)).length;
      session.totalEmails = mergeAllEmails(results.map((r) => r.emails || [])).length;
      session.totalBusinesses = results.length;
      session.progress = 100;
      session.status = 'completed';

      if (onProgress) {
        onProgress({
          sessionId,
          step: 'completed',
          progress: 100,
          message: `Done! Found ${session.totalBusinesses} businesses, ${session.totalPhones} phones, ${session.totalEmails} emails.`,
          results,
          totalBusinesses: session.totalBusinesses,
          totalPhones: session.totalPhones,
          totalEmails: session.totalEmails,
        });
      }

      return session;
    } catch (err) {
      session.status = 'error';
      session.message = err.message;
      if (onProgress) {
        onProgress({
          sessionId,
          step: 'error',
          progress: session.progress,
          message: `Error: ${err.message}`,
          error: err.message,
        });
      }
      throw err;
    }
  }

  _getUniqueWebsites(ads) {
    const seen = new Set();
    const unique = [];
    for (const ad of ads) {
      const url = normalizeUrl(ad.websiteUrl) || ad.websiteUrl;
      const key = url || ad.adLink;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(ad);
      }
    }
    return unique;
  }

  async generateExport(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const fileName = await this.exportService.toExcel(session.results, session.type);
    session.exportFileName = fileName;
    return fileName;
  }
}

module.exports = new ScraperService();
