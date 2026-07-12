const { parsePhoneNumberFromString } = require('libphonenumber-js');

const PHONE_REGEX = /(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,9}(?:[-.\s]?\d{2,9})?/g;

function extractPhonesFromText(text) {
  if (!text) return [];
  const seen = new Set();
  const results = [];

  const matches = text.match(PHONE_REGEX) || [];
  for (const match of matches) {
    const cleaned = match.replace(/[^\d+]/g, '');
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length < 6 || digits.length > 15) continue;

    const normalized = normalizeToE164(cleaned);
    const key = normalized.replace(/\D/g, '');

    if (seen.has(key)) continue;
    seen.add(key);
    results.push(normalized);
  }

  return results;
}

function extractWhatsAppLinks(text) {
  if (!text) return [];
  const results = [];
  const seen = new Set();

  const regex = /(?:https?:\/\/)?(?:wa\.me|whatsapp\.com)\/(?:send\/?)?(?:\?phone=)?([\d\s\-\.\+]+)/gi;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const raw = m[1].replace(/[\s\-\.]/g, '');
    if (raw.length < 6) continue;
    const num = raw.replace(/^\+/, '');
    const key = num.replace(/\D/g, '');
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      phone: '+' + num,
      link: 'https://wa.me/' + num,
    });
  }

  return results;
}

function normalizeToE164(numberStr) {
  const cleaned = numberStr.replace(/[^\d+]/g, '');
  const digits = cleaned.replace(/\D/g, '');

  if (cleaned.startsWith('+')) return cleaned;

  if (digits.length >= 8 && digits.length <= 9 && (digits.startsWith('6') || digits.startsWith('7'))) {
    return '+252' + digits;
  }

  if (digits.length === 12 && digits.startsWith('252')) {
    return '+' + digits;
  }

  if (digits.length === 10 && digits.startsWith('0')) {
    const withoutZero = digits.substring(1);
    if (withoutZero.startsWith('6') || withoutZero.startsWith('7')) {
      return '+252' + withoutZero;
    }
  }

  return '+' + digits;
}

function deduplicatePhones(phones) {
  const seen = new Set();
  return phones.filter((p) => {
    const num = typeof p === 'string' ? p : (p.full || p);
    const key = normalizeToE164(num).replace(/\D/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeAllPhones(phoneArrays) {
  const all = phoneArrays.flat();
  return deduplicatePhones(all);
}

module.exports = {
  extractPhonesFromText, extractWhatsAppLinks,
  deduplicatePhones, mergeAllPhones,
};
