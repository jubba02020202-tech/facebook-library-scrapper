const FacebookAdsScraper = require('./facebookAdsScraper');
const WebsiteScraper = require('./websiteScraper');
const ExportService = require('./exportService');
const { mergeAllPhones } = require('../utils/phoneExtractor');
const { normalizeUrl } = require('../utils/urlUtils');

class ScraperService {
  constructor() {
    this.facebookScraper = new FacebookAdsScraper();
    this.websiteScraper = new WebsiteScraper();
    this.exportService = new ExportService();
    this.sessions = new Map();
  }

  createSession() {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const session = {
      id,
      status: 'idle',
      progress: 0,
      step: '',
      message: '',
      ads: [],
      results: [],
      totalBusinesses: 0,
      totalPhones: 0,
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
              return { ...item, phones: [], whatsappLinks: [], pagesScanned: [], error: 'No website URL' };
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
            return { website: item.websiteUrl, phones: [], whatsappLinks: [], pagesScanned: [], error: lastError?.message };
          })
        );

        batchResults.forEach((result, idx) => {
          const item = batch[idx];
          const fbPhones = item.phones || [];
          const fbWhatsApp = item.whatsappLinks || [];

          if (result.status === 'fulfilled') {
            const crawlData = result.value;
            const mergedPhones = mergeAllPhones([fbPhones, crawlData.phones]);
            const mergedWA = [...new Map(
              [...fbWhatsApp, ...(crawlData.whatsappLinks || [])]
                .map(w => [w.phone || w, w])
            ).values()];

            results.push({
              businessName: item.businessName,
              pageName: item.pageName,
              websiteUrl: item.websiteUrl,
              cta: item.cta,
              adLink: item.adLink,
              phones: mergedPhones,
              whatsappLinks: mergedWA,
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
      session.totalBusinesses = results.length;
      session.progress = 100;
      session.status = 'completed';

      if (onProgress) {
        onProgress({
          sessionId,
          step: 'completed',
          progress: 100,
          message: `Done! Found ${session.totalBusinesses} businesses and ${session.totalPhones} phone numbers.`,
          results,
          totalBusinesses: session.totalBusinesses,
          totalPhones: session.totalPhones,
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

    const fileName = await this.exportService.toExcel(session.results);
    session.exportFileName = fileName;
    return fileName;
  }
}

module.exports = new ScraperService();
