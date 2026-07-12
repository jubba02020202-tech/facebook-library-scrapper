const URL = require('url').URL;

function normalizeUrl(raw) {
  if (!raw) return null;
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/+$/, '') || parsed.origin;
  } catch {
    return null;
  }
}

function isValidHttpUrl(str) {
  try {
    const parsed = new URL(str);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isSameDomain(url, baseDomain) {
  const domain = getDomain(url);
  if (!domain || !baseDomain) return false;
  return domain === baseDomain;
}

const CONTACT_PATHS = [
  '/contact', '/contact-us', '/contactus',
  '/about', '/about-us', '/aboutus',
  '/support', '/help',
  '/location', '/locations',
  '/store', '/stores',
  '/find-us',
];

module.exports = { normalizeUrl, isValidHttpUrl, getDomain, isSameDomain, CONTACT_PATHS };
