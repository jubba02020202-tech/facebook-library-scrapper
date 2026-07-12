const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const config = require('../config');
const { normalizeUrl, isValidHttpUrl, isSameDomain, getDomain, CONTACT_PATHS } = require('../utils/urlUtils');
const { extractPhonesFromText, extractWhatsAppLinks } = require('../utils/phoneExtractor');

const LOG_PREFIX = '[WebsiteCrawler]';

class WebsiteScraper {
  constructor() {
    this.axiosInstance = axios.create({
      timeout: config.crawler.timeout,
      headers: {
        'User-Agent': config.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      maxRedirects: 5,
      decompress: true,
    });
  }

  async crawlWebsite(rawUrl) {
    const cleanedUrl = this._cleanFacebookRedirect(rawUrl);
    const url = normalizeUrl(cleanedUrl);

    if (!url) {
      console.log(`${LOG_PREFIX} Invalid URL: ${rawUrl}`);
      return { website: rawUrl, phones: [], whatsappLinks: [], pagesScanned: [], error: 'Invalid URL' };
    }

    const domain = getDomain(url);
    console.log(`${LOG_PREFIX} Crawling: ${url} (domain: ${domain})`);

    const allPhones = [];
    const allWhatsAppLinks = [];
    const pagesScanned = [];
    const errors = [];

    const pagesToVisit = new Set();
    pagesToVisit.add(url);

    for (const suffix of CONTACT_PATHS) {
      try {
        const contactUrl = new URL(suffix, url).href;
        pagesToVisit.add(contactUrl);
      } catch {}
    }

    let visited = 0;

    for (const pageUrl of pagesToVisit) {
      if (visited >= config.crawler.maxLinksPerSite) break;

      try {
        console.log(`${LOG_PREFIX} Fetching: ${pageUrl}`);
        const response = await this.axiosInstance.get(pageUrl, {
          timeout: config.crawler.timeout,
          validateStatus: (status) => status < 400,
        });

        if (!response.data || typeof response.data !== 'string') {
          console.log(`${LOG_PREFIX} No HTML data from ${pageUrl}`);
          continue;
        }

        pagesScanned.push(pageUrl);
        visited++;

        const $ = cheerio.load(response.data);

        $('script, style, iframe, noscript').remove();

        const pageText = $('body').text();

        const telLinks = this._extractTelLinks($);
        const phonesFromText = extractPhonesFromText(pageText);
        const waLinks = extractWhatsAppLinks(pageText);

        const allPhonesOnPage = [...telLinks, ...phonesFromText];
        console.log(`${LOG_PREFIX} ${pageUrl}: ${allPhonesOnPage.length} phones, ${waLinks.length} WhatsApp links`);

        allPhonesOnPage.forEach((p) => allPhones.push(p));
        waLinks.forEach((w) => allWhatsAppLinks.push(w));

        if (visited === 1) {
          const internalLinks = this._extractInternalLinks($, url, domain);
          console.log(`${LOG_PREFIX} Found ${internalLinks.length} internal contact links on homepage`);
          for (const link of internalLinks) {
            if (pagesToVisit.size < config.crawler.maxLinksPerSite) {
              pagesToVisit.add(link);
            }
          }
        }

      } catch (err) {
        console.log(`${LOG_PREFIX} Error fetching ${pageUrl}: ${err.message}`);
        errors.push(`${pageUrl}: ${err.message}`);
      }
    }

    const { deduplicatePhones } = require('../utils/phoneExtractor');

    const result = {
      website: url,
      phones: deduplicatePhones(allPhones),
      whatsappLinks: [...new Map(allWhatsAppLinks.map((w) => [w.phone || w, w])).values()],
      pagesScanned,
      errors,
    };

    console.log(`${LOG_PREFIX} Done crawling ${url}: ${result.phones.length} phones, ${result.whatsappLinks.length} WhatsApp`);
    return result;
  }

  _extractTelLinks($) {
    const phones = [];
    $('a[href^="tel:"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        const number = href.replace('tel:', '').trim();
        if (number && number.length > 5) {
          phones.push(number.replace(/[^\d+]/g, ''));
        }
      }
    });
    return phones;
  }

  _cleanFacebookRedirect(url) {
    if (!url) return url;
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('facebook.com') || parsed.hostname.includes('fb.com')) {
        const uParam = parsed.searchParams.get('u');
        if (uParam) {
          console.log(`${LOG_PREFIX} Extracted URL from Facebook redirect: ${uParam}`);
          return uParam;
        }
      }
    } catch {}
    return url;
  }

  _extractInternalLinks($, baseUrl, domain) {
    const links = [];
    const seen = new Set();

    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      try {
        const absolute = new URL(href, baseUrl).href;

        if (!isSameDomain(absolute, domain)) return;
        if (!isValidHttpUrl(absolute)) return;

        const parsed = new URL(absolute);
        const path = parsed.pathname.replace(/\/+$/, '').toLowerCase();
        if (!path || path === '' || path === '/') return;

        const skipExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
          '.mp4', '.mp3', '.zip', '.rar', '.doc', '.docx', '.xls', '.xlsx', '.css', '.js'];
        const ext = path.split('.').pop();
        if (skipExtensions.includes('.' + ext)) return;

        const hasContactKeyword = /contact|about|support|help|location|store|find|reach|call|phone|touch|footer|info/i.test(path);
        if (!hasContactKeyword) return;

        const cleanUrl = parsed.origin + parsed.pathname;
        if (!seen.has(cleanUrl)) {
          seen.add(cleanUrl);
          links.push(cleanUrl);
        }
      } catch {}
    });

    return links.slice(0, 10);
  }
}

module.exports = WebsiteScraper;
