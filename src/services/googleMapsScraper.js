const { chromium } = require('playwright');
const config = require('../config');
const { extractPhonesFromText, extractWhatsAppLinks } = require('../utils/phoneExtractor');

const LOG_PREFIX = '[GoogleMaps]';

const BAD_NAMES = new Set([
  'results', 'google maps', 'google', 'maps', 'search', 'menu', 'sign in',
  'nearby', 'explore', 'more', 'less', 'settings', 'help', 'send feedback',
  'report a problem', 'data disclaimer', 'terms of use', 'privacy policy',
]);

function isValidBusinessName(name) {
  if (!name || name.length < 2 || name.length > 100) return false;
  if (BAD_NAMES.has(name.toLowerCase())) return false;
  if (/^\d+$/.test(name)) return false;
  if (/^(results|google|maps|search|menu|sign|nearby|explore|more|less)/i.test(name)) return false;
  return true;
}

class GoogleMapsScraper {

  async scrape({ country, city, businessType }, onProgress) {
    console.log(`${LOG_PREFIX} Starting Google Maps scrape...`);
    console.log(`${LOG_PREFIX} Query: ${businessType} in ${city || ''} ${country}`);

    const browser = await chromium.launch({
      headless: config.googleMaps.headless,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    });

    const context = await browser.newContext({
      userAgent: config.userAgent,
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      bypassCSP: true,
    });

    await context.addInitScript(() => {
      delete Object.getPrototypeOf(navigator).webdriver;
      Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    });

    const page = await context.newPage();

    try {
      const query = city
        ? `${businessType} in ${city} ${country}`
        : `${businessType} in ${country}`;
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

      console.log(`${LOG_PREFIX} Navigating to: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(config.googleMaps.waitAfterLoad);

      await this._handleCookieConsent(page);
      await page.waitForTimeout(3000);

      if (onProgress) {
        onProgress({
          step: 'maps_scroll',
          message: 'Scrolling through Google Maps results...',
          scrolls: 0,
          businessesFound: 0,
        });
      }

      const businesses = await this._scrollAndExtract(page, onProgress);
      console.log(`${LOG_PREFIX} Extracted ${businesses.length} businesses from Google Maps`);

      await browser.close();
      return businesses;

    } catch (err) {
      console.error(`${LOG_PREFIX} Fatal:`, err.message);
      await browser.close();
      throw err;
    }
  }

  async _handleCookieConsent(page) {
    const consentSelectors = [
      'button:has-text("Accept all")',
      'button:has-text("Accept")',
      'button:has-text("I agree")',
      'button:has-text("Agree")',
      'button:has-text("OK")',
      '#L2AGLb',
      'button[aria-label="Accept all"]',
    ];

    for (const sel of consentSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.count() > 0 && await el.isVisible({ timeout: 2000 })) {
          await el.click({ timeout: 3000 });
          console.log(`${LOG_PREFIX} Clicked consent: ${sel}`);
          await page.waitForTimeout(1500);
          return;
        }
      } catch {}
    }
  }

  async _scrollAndExtract(page, onProgress) {
    const maxScrolls = config.googleMaps.maxScrolls;
    const scrollDelay = config.googleMaps.scrollDelay;
    const seenNames = new Set();
    let prevCount = 0;
    let sameCount = 0;

    for (let i = 0; i < maxScrolls; i++) {
      try {
        await page.evaluate(() => {
          const feed = document.querySelector('div[role="feed"]');
          if (feed) {
            feed.scrollTop = feed.scrollHeight;
          } else {
            window.scrollBy(0, 800);
          }
        });
      } catch {
        break;
      }

      await page.waitForTimeout(scrollDelay);

      const currentCount = await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (!feed) return 0;
        return feed.querySelectorAll('a[href*="/maps/place/"]').length;
      });

      if (currentCount === prevCount) {
        sameCount++;
        if (sameCount >= 5) {
          console.log(`${LOG_PREFIX} No new results after ${i + 1} scrolls`);
          break;
        }
      } else {
        sameCount = 0;
        prevCount = currentCount;
      }

      if (onProgress && i % 3 === 0) {
        onProgress({
          step: 'maps_scroll',
          message: `Scrolling Google Maps... ${currentCount} results found (scroll ${i + 1})`,
          scrolls: i + 1,
          businessesFound: currentCount,
        });
      }
    }

    const totalCards = await page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]');
      if (!feed) return 0;
      return feed.querySelectorAll('a[href*="/maps/place/"]').length;
    });

    console.log(`${LOG_PREFIX} Total cards found: ${totalCards}`);

    const businesses = [];
    const maxExtract = Math.min(totalCards, 200);

    for (let i = 0; i < maxExtract; i++) {
      try {
        if (onProgress && i % 5 === 0) {
          onProgress({
            step: 'maps_extract',
            message: `Extracting business ${i + 1}/${maxExtract}... (${businesses.length} found)`,
            current: i + 1,
            total: maxExtract,
          });
        }

        const feed = await page.$('div[role="feed"]');
        if (!feed) {
          console.log(`${LOG_PREFIX} Feed not found, trying to recover...`);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(2000);
          const feedRetry = await page.$('div[role="feed"]');
          if (!feedRetry) break;
        }

        const feedEl = await page.$('div[role="feed"]');
        if (!feedEl) break;

        const cards = await feedEl.$$('a[href*="/maps/place/"]');
        if (i >= cards.length) {
          console.log(`${LOG_PREFIX} Card index ${i} >= ${cards.length}, stopping`);
          break;
        }

        await page.evaluate((cardIndex) => {
          const feed = document.querySelector('div[role="feed"]');
          if (!feed) return;
          const links = feed.querySelectorAll('a[href*="/maps/place/"]');
          if (links[cardIndex]) {
            links[cardIndex].scrollIntoView({ block: 'center' });
          }
        }, i);
        await page.waitForTimeout(600);

        const feedEl2 = await page.$('div[role="feed"]');
        if (!feedEl2) break;
        const cards2 = await feedEl2.$$('a[href*="/maps/place/"]');
        if (i >= cards2.length) break;

        await cards2[i].click({ timeout: 5000 });
        await page.waitForTimeout(3000);

        let panelOpened = false;
        let detailName = '';

        for (let wait = 0; wait < 8; wait++) {
          detailName = await page.evaluate(() => {
            const feed = document.querySelector('div[role="feed"]');
            if (!feed) return '';

            const content = feed.querySelector('div[role="main"], div.Nv2PK');
            if (content) {
              const h1 = content.querySelector('h1');
              if (h1) return h1.textContent.trim();
            }

            const allH1 = feed.querySelectorAll('h1');
            for (const h of allH1) {
              const text = h.textContent.trim();
              if (text && text.toLowerCase() !== 'results' && text.length > 1) {
                return text;
              }
            }

            const roleH1 = document.querySelector('[role="main"] h1, [data-attrid="title"] h1');
            if (roleH1) return roleH1.textContent.trim();

            return '';
          });

          if (detailName && isValidBusinessName(detailName)) {
            panelOpened = true;
            break;
          }

          await page.waitForTimeout(1000);
        }

        if (!panelOpened || !isValidBusinessName(detailName)) {
          console.log(`${LOG_PREFIX} [${i + 1}] Panel did not open or invalid name: "${detailName}", skipping`);
          try { await page.keyboard.press('Escape'); } catch {}
          await page.waitForTimeout(1000);
          continue;
        }

        const detail = await this._extractBusinessDetail(page);

        if (detail && detail.businessName && isValidBusinessName(detail.businessName) && !seenNames.has(detail.businessName.toLowerCase())) {
          seenNames.add(detail.businessName.toLowerCase());
          businesses.push(detail);
          console.log(`${LOG_PREFIX} [${businesses.length}] ${detail.businessName} - ${detail.phone || 'no phone'} - ${detail.emails?.length || 0} emails`);
        } else if (detail) {
          console.log(`${LOG_PREFIX} [${i + 1}] Skipped: name="${detail.businessName}" (invalid or duplicate)`);
        }

        try {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1500);
        } catch {}

        const feedStillExists = await page.$('div[role="feed"]');
        if (!feedStillExists) {
          console.log(`${LOG_PREFIX} Feed disappeared, recovering...`);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(2000);
        }

      } catch (err) {
        console.log(`${LOG_PREFIX} Error extracting card ${i}: ${err.message}`);
        try {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1500);
        } catch {}
      }
    }

    return businesses;
  }

  async _extractBusinessDetail(page) {
    try {
      const detail = await page.evaluate(() => {
        const findName = () => {
          const feed = document.querySelector('div[role="feed"]');
          if (feed) {
            const mainContent = feed.querySelector('div[role="main"], div.Nv2PK, div.m6QErb');
            if (mainContent) {
              const h1 = mainContent.querySelector('h1');
              if (h1) return h1.textContent.trim();
            }
            const allH1 = feed.querySelectorAll('h1');
            for (const h of allH1) {
              const text = h.textContent.trim();
              if (text && text.toLowerCase() !== 'results' && text.length > 1) {
                return text;
              }
            }
          }

          const roleMain = document.querySelector('[role="main"] h1');
          if (roleMain) return roleMain.textContent.trim();

          const h1s = document.querySelectorAll('h1');
          for (const h of h1s) {
            const text = h.textContent.trim();
            if (text && text.toLowerCase() !== 'results' && text.length > 2) {
              return text;
            }
          }
          return '';
        };

        const findAddress = () => {
          const items = document.querySelectorAll('button[data-item-id], div[data-item-id], a[data-item-id]');
          for (const item of items) {
            const id = item.getAttribute('data-item-id') || '';
            if (id.includes('address')) {
              const text = item.textContent.trim();
              if (text && text.length > 3) return text;
            }
          }
          const allText = document.body.innerText || '';
          const lines = allText.split('\n');
          for (const line of lines) {
            if (/\d+\s+\w+\s+(street|st|road|rd|avenue|ave|boulevard|blvd|drive|dr|lane|ln|way|place|pl)/i.test(line)) {
              return line.trim().substring(0, 200);
            }
          }
          return '';
        };

        const findPhone = () => {
          const items = document.querySelectorAll('button[data-item-id], a[data-item-id], div[data-item-id]');
          for (const item of items) {
            const id = item.getAttribute('data-item-id') || '';
            if (id.includes('phone')) {
              const text = item.textContent.trim().replace(/\s+/g, ' ');
              if (text && /\d{5,}/.test(text)) return text;
            }
          }
          const telLinks = document.querySelectorAll('a[href^="tel:"]');
          for (const link of telLinks) {
            const num = link.getAttribute('href').replace('tel:', '');
            if (num && num.length > 5) return num;
          }
          return '';
        };

        const findWebsite = () => {
          const items = document.querySelectorAll('a[data-item-id]');
          for (const item of items) {
            const id = item.getAttribute('data-item-id') || '';
            if (id.includes('authority') || id.includes('website')) {
              const href = item.getAttribute('href');
              if (href && !href.includes('google.com')) return href;
            }
          }
          const allLinks = document.querySelectorAll('a[href]');
          for (const link of allLinks) {
            const ariaLabel = (link.getAttribute('aria-label') || '').toLowerCase();
            const href = link.getAttribute('href') || '';
            if ((ariaLabel.includes('website') || ariaLabel.includes('open')) && href.includes('http') && !href.includes('google.com')) {
              return href;
            }
          }
          return '';
        };

        const findRating = () => {
          const spans = document.querySelectorAll('span[role="img"]');
          for (const span of spans) {
            const ariaLabel = span.getAttribute('aria-label') || '';
            const match = ariaLabel.match(/([\d.]+)\s*out of\s*5/);
            if (match) return match[1];
          }
          const text = document.body.innerText || '';
          const match = text.match(/([\d.]+)\s*out of\s*5\sstar/);
          if (match) return match[1];
          return '';
        };

        const findReviews = () => {
          const text = document.body.innerText || '';
          const match = text.match(/([\d,]+)\s*review/i);
          if (match) return match[1].replace(/,/g, '');
          return '';
        };

        const findCategory = () => {
          const text = document.body.innerText || '';
          const lines = text.split('\n').filter(l => l.trim());
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length >= 3 && trimmed.length <= 80) {
              if (/hospital|clinic|restaurant|hotel|school|store|shop|pharmacy|salon|garage|office|market|bank|cafe|park|gym|dentist|dental|vet|bakery|spa|travel|insurance|real estate/i.test(trimmed)) {
                return trimmed;
              }
            }
          }
          return '';
        };

        const findHours = () => {
          const text = document.body.innerText || '';
          const lines = text.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if ((trimmed.includes('AM') || trimmed.includes('PM') || trimmed.includes('Open') || trimmed.includes('Closed') || trimmed.includes('24 hours')) && trimmed.length < 100) {
              return trimmed;
            }
          }
          return '';
        };

        return {
          businessName: findName(),
          address: findAddress(),
          phone: findPhone(),
          website: findWebsite(),
          rating: findRating(),
          reviews: findReviews(),
          category: findCategory(),
          hours: findHours(),
        };
      });

      if (!detail.businessName || !isValidBusinessName(detail.businessName)) {
        return null;
      }

      const phones = [];
      if (detail.phone) {
        const extracted = extractPhonesFromText(detail.phone);
        phones.push(...extracted);
      }

      const emails = [];
      const whatsappLinks = [];

      return {
        businessName: detail.businessName,
        pageName: detail.businessName,
        address: detail.address,
        phone: detail.phone,
        website: detail.website,
        phones,
        emails,
        whatsappLinks,
        rating: detail.rating,
        reviews: detail.reviews,
        category: detail.category,
        hours: detail.hours,
        cta: '',
        adLink: '',
      };
    } catch (err) {
      console.log(`${LOG_PREFIX} Detail extraction error: ${err.message}`);
      return null;
    }
  }
}

module.exports = GoogleMapsScraper;
