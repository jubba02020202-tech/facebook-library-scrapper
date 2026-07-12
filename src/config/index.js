require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,

  facebook: {
    scrollDelay: parseInt(process.env.FB_SCROLL_DELAY, 10) || 2000,
    scrollTimeout: parseInt(process.env.FB_SCROLL_TIMEOUT, 10) || 90000,
    maxScrolls: parseInt(process.env.FB_MAX_SCROLLS, 10) || 300,
    headless: process.env.FB_HEADLESS !== 'false',
    waitAfterLoad: parseInt(process.env.FB_WAIT_AFTER_LOAD, 10) || 5000,

    selectors: {
      adCard: 'div[role="article"]',
      seeAdDetails: 'span:has-text("See ad details"), a:has-text("See ad details"), [role="button"]:has-text("See ad details")',
      adDialog: 'div[role="dialog"]',
      dialogCloseButton: '[aria-label="Close"], [role="button"]:has-text("Close")',
      businessName: '[role="dialog"] a[href*="/ads/library"], [role="dialog"] strong, [role="dialog"] h2, [role="dialog"] h3',
      pageName: '[role="dialog"] a[href*="facebook.com"]:not([href*="/ads/"])',
      websiteUrl: '[role="dialog"] a:has-text("Visit Website"), [role="dialog"] a[target="_blank"]:not([href*="facebook.com"])',
      cta: '[role="dialog"] [class*="cta"], [role="dialog"] a[role="button"]',
      adLink: 'a[href*="/ads/library/"][role="link"]',
      scrollContainer: 'div[role="main"]',
    },
  },

  crawler: {
    timeout: parseInt(process.env.CRAWL_TIMEOUT, 10) || 15000,
    maxConcurrent: parseInt(process.env.CRAWL_MAX_CONCURRENT, 10) || 3,
    maxRetries: parseInt(process.env.CRAWL_MAX_RETRIES, 10) || 2,
    maxLinksPerSite: parseInt(process.env.CRAWL_MAX_LINKS, 10) || 20,
  },

  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};
