const URL = require('url').URL;

function isValidFacebookAdsUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host !== 'facebook.com' && host !== 'm.facebook.com' && host !== 'mbasic.facebook.com') {
      return false;
    }
    if (!parsed.pathname.includes('/ads/library')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function sanitizeString(str) {
  if (!str) return '';
  return str.replace(/[,\n\r\t]+/g, ' ').trim();
}

module.exports = { isValidFacebookAdsUrl, sanitizeString };
