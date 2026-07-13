const { chromium } = require('playwright');
const config = require('../config');
const { extractPhonesFromText, extractWhatsAppLinks } = require('../utils/phoneExtractor');

const LOG_PREFIX = '[GoogleMaps]';

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
        if (!feed) break;

        const cards = await feed.$$('a[href*="/maps/place/"]');
        if (i >= cards.length) {
          console.log(`${LOG_PREFIX} Card index ${i} >= ${cards.length}, stopping`);
          break;
        }

        const previousName = await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          return h1 ? h1.textContent.trim() : '';
        });

        await cards[i].scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await cards[i].click({ timeout: 5000 });
        await page.waitForTimeout(2500);

        let panelOpened = false;
        for (let wait = 0; wait < 5; wait++) {
          const newName = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            return h1 ? h1.textContent.trim() : '';
          });
          if (newName && newName !== previousName && newName.length > 1) {
            panelOpened = true;
            break;
          }
          await page.waitForTimeout(800);
        }

        if (!panelOpened) {
          console.log(`${LOG_PREFIX} [${i + 1}] Panel did not open, skipping`);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
          continue;
        }

        const detail = await this._extractBusinessDetail(page);

        if (detail && detail.businessName && !seenNames.has(detail.businessName.toLowerCase())) {
          seenNames.add(detail.businessName.toLowerCase());
          businesses.push(detail);
          console.log(`${LOG_PREFIX} [${businesses.length}] ${detail.businessName} - ${detail.phone || 'no phone'} - ${detail.emails?.length || 0} emails`);
        }

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1200);

        const feedStillExists = await page.$('div[role="feed"]');
        if (!feedStillExists) {
          console.log(`${LOG_PREFIX} Feed disappeared, scrolling back...`);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(1500);
        }

      } catch (err) {
        console.log(`${LOG_PREFIX} Error extracting card ${i}: ${err.message}`);
        try {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
        } catch {}
      }
    }

    return businesses;
  }

  async _extractBusinessDetail(page) {
    try {
      const detail = await page.evaluate(() => {
        const getName = () => {
          const h1 = document.querySelector('h1');
          return h1 ? h1.textContent.trim() : '';
        };

        const getAddress = () => {
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

        const getPhone = () => {
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

        const getWebsite = () => {
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

        const getRating = () => {
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

        const getReviews = () => {
          const text = document.body.innerText || '';
          const match = text.match(/([\d,]+)\s*review/i);
          if (match) return match[1].replace(/,/g, '');
          return '';
        };

        const getCategory = () => {
          const text = document.body.innerText || '';
          const lines = text.split('\n').filter(l => l.trim());
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length >= 3 && trimmed.length <= 80) {
              if (/hospital|clinic|restaurant|hotel|school|store|shop|pharmacy|salon|garage|office|market|bank|cafe|park|gym|dentist|vet|bakery|gym|spa|travel|insurance|real estate/i.test(trimmed)) {
                return trimmed;
              }
            }
          }
          return '';
        };

        const getHours = () => {
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
          businessName: getName(),
          address: getAddress(),
          phone: getPhone(),
          website: getWebsite(),
          rating: getRating(),
          reviews: getReviews(),
          category: getCategory(),
          hours: getHours(),
        };
      });

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
