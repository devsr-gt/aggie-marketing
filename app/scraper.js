/**
 * scraper.js
 * Fetches a business website and extracts useful info to pre-fill client docs.
 *
 * Security:
 *  - Blocks private/loopback IP ranges (SSRF protection)
 *  - Enforces http/https only
 *  - Hard timeout on every fetch (no hanging requests)
 *  - HTML is never executed — parsed read-only with cheerio
 */

import * as cheerio from 'cheerio';
import { URL } from 'url';

// Ranges that should never be reachable from a scraper
const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /^169\.254\./, // link-local
  /^fc00:/i,     // IPv6 ULA
  /^fe80:/i,     // IPv6 link-local
];

/**
 * Validates that the URL is safe to fetch.
 * Throws a descriptive error if not.
 */
function validateUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL — make sure it starts with http:// or https://');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }

  const hostname = parsed.hostname;
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new Error(`URL hostname "${hostname}" is not allowed (private/loopback address)`);
    }
  }

  return parsed.href;
}

/**
 * Cleans up a string extracted from HTML:
 * collapses whitespace, trims, truncates to maxLen.
 */
function clean(str, maxLen = 300) {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

/**
 * Main scrape function.
 * @param {string} rawUrl - The URL to scrape
 * @returns {Promise<object>} Extracted business data
 */
export async function scrapeWebsite(rawUrl) {
  const safeUrl = validateUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s hard limit

  let html;
  try {
    const response = await fetch(safeUrl, {
      signal: controller.signal,
      headers: {
        // Polite scraper — identify ourselves
        'User-Agent': 'AggieMarketing-ClientTool/1.0 (local business onboarding tool)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Site returned HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error(`Expected HTML but got "${contentType}" — try the homepage URL`);
    }

    html = await response.text();
  } finally {
    clearTimeout(timeout);
  }

  const $ = cheerio.load(html);

  // --- Extract data ---

  const businessName =
    clean($('meta[property="og:site_name"]').attr('content')) ||
    clean($('meta[name="application-name"]').attr('content')) ||
    clean($('title').first().text().split(/[-|–]/)[0]);

  const description =
    clean($('meta[property="og:description"]').attr('content')) ||
    clean($('meta[name="description"]').attr('content'));

  const phone = (() => {
    // Look for tel: links first, then common patterns in text
    const telLink = $('a[href^="tel:"]').first().attr('href');
    if (telLink) return telLink.replace('tel:', '').trim();
    const bodyText = $('body').text();
    const match = bodyText.match(/(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/);
    return match ? match[1].trim() : '';
  })();

  const email = (() => {
    const mailLink = $('a[href^="mailto:"]').first().attr('href');
    if (mailLink) return mailLink.replace('mailto:', '').split('?')[0].trim();
    return '';
  })();

  const address = (() => {
    // schema.org address markup
    const schemaAddr = $('[itemprop="address"]').first().text();
    if (schemaAddr) return clean(schemaAddr);
    // look for common address containers
    const candidates = ['address', '[class*="address"]', '[class*="location"]', 'footer'];
    for (const selector of candidates) {
      const text = $(selector).first().text();
      if (text && text.length < 200) return clean(text);
    }
    return '';
  })();

  const socialLinks = {
    instagram: '',
    facebook: '',
    tiktok: '',
    google: '',
  };
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!socialLinks.instagram && href.includes('instagram.com')) socialLinks.instagram = href;
    if (!socialLinks.facebook && href.includes('facebook.com')) socialLinks.facebook = href;
    if (!socialLinks.tiktok && href.includes('tiktok.com')) socialLinks.tiktok = href;
    if (!socialLinks.google && href.includes('google.com/maps')) socialLinks.google = href;
  });

  // Guess business category from page content
  const pageText = ($('body').text() || '').toLowerCase();
  const category = guessCategory(pageText, description.toLowerCase());

  return {
    url: safeUrl,
    businessName,
    description,
    phone,
    email,
    address,
    socialLinks,
    category,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Heuristic category detection based on common keywords.
 */
function guessCategory(bodyText, description) {
  const checks = [
    { category: 'restaurant', keywords: ['menu', 'reservation', 'dining', 'restaurant', 'cafe', 'food', 'eat', 'chef', 'cuisine'] },
    { category: 'retail', keywords: ['shop', 'store', 'boutique', 'buy', 'cart', 'collection', 'product'] },
    { category: 'health-wellness', keywords: ['gym', 'fitness', 'yoga', 'wellness', 'massage', 'therapy', 'health', 'workout'] },
    { category: 'real-estate', keywords: ['listing', 'realtor', 'property', 'homes for sale', 'real estate', 'mortgage'] },
    { category: 'contractors', keywords: ['contractor', 'roofing', 'plumbing', 'hvac', 'electrician', 'remodel', 'construction', 'landscaping'] },
  ];

  const combined = bodyText + ' ' + description;
  let best = { category: 'general', score: 0 };

  for (const { category, keywords } of checks) {
    const score = keywords.reduce((acc, kw) => acc + (combined.includes(kw) ? 1 : 0), 0);
    if (score > best.score) best = { category, score };
  }

  return best.category;
}
