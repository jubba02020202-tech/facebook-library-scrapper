const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const IGNORED_DOMAINS = [
  'facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com',
  'youtube.com', 'google.com', 'apple.com', 'microsoft.com',
  'sentry.io', 'w3.org', 'schema.org', 'ogp.me',
];

const IGNORED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
  '.css', '.js', '.woff', '.woff2', '.ttf', '.eot',
];

function extractEmailsFromText(text) {
  if (!text) return [];
  const matches = text.match(EMAIL_REGEX) || [];
  return normalizeEmails(matches);
}

function extractEmailsFromHTML($) {
  const emails = new Set();

  $('a[href^="mailto:"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href) {
      const email = href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
      if (email && email.includes('@')) {
        emails.add(email);
      }
    }
  });

  const pageText = $('body').text() || '';
  const textEmails = pageText.match(EMAIL_REGEX) || [];
  textEmails.forEach(e => emails.add(e.toLowerCase()));

  return filterEmails([...emails]);
}

function normalizeEmails(emails) {
  const seen = new Set();
  const results = [];
  for (const email of emails) {
    const normalized = email.toLowerCase().trim();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    results.push(normalized);
  }
  return filterEmails(results);
}

function filterEmails(emails) {
  return emails.filter(email => {
    const lower = email.toLowerCase();

    for (const domain of IGNORED_DOMAINS) {
      if (lower.endsWith('@' + domain)) return false;
    }

    for (const ext of IGNORED_EXTENSIONS) {
      if (lower.includes(ext)) return false;
    }

    if (email.length < 5 || email.length > 254) return false;
    if (lower.startsWith('.') || lower.endsWith('.')) return false;
    if (lower.includes('..')) return false;

    return true;
  });
}

function mergeAllEmails(emailArrays) {
  const all = emailArrays.flat();
  return normalizeEmails(all);
}

module.exports = {
  extractEmailsFromText,
  extractEmailsFromHTML,
  normalizeEmails,
  filterEmails,
  mergeAllEmails,
};
