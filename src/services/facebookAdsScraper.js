const { chromium } = require('playwright');
const config = require('../config');
const { extractPhonesFromText, extractWhatsAppLinks } = require('../utils/phoneExtractor');

const LOG_PREFIX = '[FB]';

class FacebookAdsScraper {

  async scrape(adsUrl, onProgress) {
    console.log(`${LOG_PREFIX} Starting...`);
    console.log(`${LOG_PREFIX} URL: ${adsUrl}`);

    const browser = await chromium.launch({
      headless: config.facebook.headless,
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

    page.on('response', (resp) => {
      if (resp.status() === 429) console.log(`${LOG_PREFIX} Rate limited (429): ${resp.url().substring(0, 80)}`);
    });

    try {
      console.log(`${LOG_PREFIX} Navigating...`);
      await page.goto(adsUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(5000);

      await this._handlePopups(page);

      if (await this._checkLoginWall(page)) {
        console.log(`${LOG_PREFIX} LOGIN REQUIRED - browser is open, please log in manually`);
        for (let i = 0; i < 120; i++) {
          if (onProgress) {
            onProgress({
              step: 'facebook', adsFound: 0, scrolls: 0,
              message: `Please log in to Facebook in the browser window... (${i * 3}s)`,
            });
          }
          await page.waitForTimeout(3000);
          if (!(await this._checkLoginWall(page))) {
            console.log(`${LOG_PREFIX} Login detected!`);
            break;
          }
        }
      }

      console.log(`${LOG_PREFIX} Scrolling to load all ads...`);
      await this._scrollAll(page, onProgress);

      console.log(`${LOG_PREFIX} Extracting ads from page text...`);
      const ads = await this._extractFromPageText(page);
      console.log(`${LOG_PREFIX} Extracted ${ads.length} ads`);

      if (ads.length > 0) {
        const sample = ads.slice(0, 3).map(a =>
          `${a.businessName}: url=${a.websiteUrl || 'none'}, phones=${a.phones.length}, wa=${a.whatsappLinks.length}`
        );
        console.log(`${LOG_PREFIX} Samples:`, JSON.stringify(sample));
      }

      return ads;

    } catch (err) {
      console.error(`${LOG_PREFIX} Fatal:`, err.message);
      throw err;
    } finally {
      await browser.close();
      console.log(`${LOG_PREFIX} Done`);
    }
  }

  async _handlePopups(page) {
    for (const sel of [
      'button:has-text("Allow")',
      'button:has-text("Accept")',
      'button:has-text("OK")',
      '[aria-label="Close"]',
    ]) {
      try {
        const el = page.locator(sel).first();
        if (await el.count() > 0) {
          await el.click({ timeout: 2000 });
          await page.waitForTimeout(500);
        }
      } catch {}
    }
  }

  async _checkLoginWall(page) {
    return page.evaluate(() => {
      const body = document.body;
      if (!body) return true;
      const t = body.innerText || '';
      return t.includes('Log in') && (t.includes('Email') || t.includes('Phone') || t.includes('Password'));
    });
  }

  async _scrollAll(page, onProgress) {
    const maxScrolls = config.facebook.maxScrolls;
    let prevCount = 0;
    let sameCount = 0;

    for (let i = 0; i < maxScrolls; i++) {
      await page.evaluate(() => {
        const main = document.querySelector('div[role="main"]');
        if (main) main.scrollTop = main.scrollHeight;
        else window.scrollBy(0, 1500);
      });

      await page.waitForTimeout(config.facebook.scrollDelay);

      const blocks = await page.evaluate(() => {
        const main = document.querySelector('div[role="main"]');
        const body = document.body;
        const text = (main ? main.innerText : (body ? body.innerText : '')) || '';
        return text.split('See ad details').length;
      });

      if (blocks === prevCount) {
        sameCount++;
        if (sameCount >= 6) {
          console.log(`${LOG_PREFIX} Scroll finished - no new ads after ${i + 1} scrolls`);
          break;
        }
      } else {
        sameCount = 0;
        prevCount = blocks;
      }

      if (onProgress && i % 5 === 0) {
        onProgress({
          step: 'facebook', adsFound: prevCount, scrolls: i + 1,
          message: `Scrolling... loaded ${prevCount} ads (scroll ${i + 1})`,
        });
      }
    }
  }

  async _extractFromPageText(page) {
    const raw = await page.evaluate(() => {
      const main = document.querySelector('div[role="main"]');
      const body = document.body;
      return (main ? main.innerText : (body ? body.innerText : '')) || '';
    });

    const blocks = raw.split('See ad details').filter(b => b.trim().length > 50);
    console.log(`${LOG_PREFIX} Found ${blocks.length} ad blocks`);

    const seen = new Set();
    const ads = [];

    for (const block of blocks) {
      try {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const fullBlock = block.replace(/\n/g, ' ');

        const sponsoredLineIdx = lines.findIndex(l => l.toLowerCase() === 'sponsored');
        const sponsoredInLineIdx = lines.findIndex(l => l.toLowerCase().includes('sponsored') && l !== 'sponsored');

        let businessName = '';
        if (sponsoredLineIdx > 0) {
          businessName = lines[sponsoredLineIdx - 1];
        } else if (sponsoredInLineIdx >= 0) {
          const txt = lines[sponsoredInLineIdx];
          const idx = txt.toLowerCase().indexOf('sponsored');
          businessName = txt.substring(0, idx).trim();
        } else {
          continue;
        }

        if (!businessName || businessName.length < 2) continue;
        const key = businessName.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const descriptionLines = sponsoredLineIdx >= 0
          ? lines.slice(sponsoredLineIdx + 1)
          : lines;
        const fullText = descriptionLines.join(' ');

        const urls = fullText.match(/https?:\/\/[^\s,]+/g) || [];
        const websiteUrl = urls.find(u =>
          !u.includes('facebook.com') && !u.includes('fb.com') &&
          !u.includes('whatsapp.com') && !u.includes('wa.me') &&
          !u.includes('api.whatsapp') && !u.includes('metastatus')
        ) || '';

        const phones = extractPhonesFromText(fullText);
        const waLinks = extractWhatsAppLinks(fullBlock);

        const ctaWords = ['shop now', 'book now', 'order now', 'buy now',
          'visit website', 'learn more', 'sign up', 'get started',
          'contact us', 'watch now', 'download', 'apply now'];
        const cta = ctaWords.find(k => fullText.toLowerCase().includes(k)) || '';

        const idMatch = block.match(/Library ID:\s*(\d+)/);
        const adLink = idMatch ? `https://www.facebook.com/ads/library/ad/?id=${idMatch[1]}` : '';

        ads.push({
          businessName,
          pageName: businessName,
          websiteUrl,
          cta,
          adLink,
          phones,
          whatsappLinks: waLinks,
        });

      } catch (err) {
        console.log(`${LOG_PREFIX} Parse error: ${err.message}`);
      }
    }

    console.log(`${LOG_PREFIX} Unique businesses: ${ads.length}`);
    return ads;
  }
}

module.exports = FacebookAdsScraper;
