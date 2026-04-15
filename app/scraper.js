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
  const category = guessCategory(pageText, description.toLowerCase(), safeUrl);

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
 * Heuristic category detection based on URL and common keywords.
 * Checks the URL first (most reliable signal), then falls back to
 * keyword scoring against the page body + description.
 */
function guessCategory(bodyText, description, url) {
  // ── URL-based check first — very reliable ─────────────────────────────
  const urlLower = (url || '').toLowerCase();
  if (/plumb|hvac|heat(?:ing)?|cool(?:ing)?|furnace|electrician|roofi|landscap|construct|contract/.test(urlLower)) return 'contractors';
  if (/real.?estate|realtor|\.realty/.test(urlLower)) return 'real-estate';
  if (/gym|yoga|wellness|fitness|spa|massage|chiro|therapy/.test(urlLower)) return 'health-wellness';
  if (/restaurant|cafe|bistro|diner|pizz|sushi|taco|burger/.test(urlLower)) return 'restaurant';

  // ── Keyword scoring fallback ───────────────────────────────────────────
  const combined = bodyText + ' ' + description;
  const checks = [
    {
      category: 'contractors',
      // Weighted: specific trade words count 3x
      keywords: [
        { word: 'plumbing',       weight: 3 },
        { word: 'hvac',           weight: 3 },
        { word: 'heating',        weight: 3 },
        { word: 'cooling',        weight: 3 },
        { word: 'furnace',        weight: 3 },
        { word: 'water heater',   weight: 3 },
        { word: 'air conditioning', weight: 3 },
        { word: 'electrician',    weight: 3 },
        { word: 'roofing',        weight: 3 },
        { word: 'contractor',     weight: 2 },
        { word: 'construction',   weight: 2 },
        { word: 'remodel',        weight: 2 },
        { word: 'landscaping',    weight: 2 },
        { word: 'estimate',       weight: 1 },
        { word: 'licensed',       weight: 1 },
      ],
    },
    {
      category: 'restaurant',
      keywords: [
        { word: 'menu',        weight: 3 },
        { word: 'reservation', weight: 3 },
        { word: 'dining',      weight: 2 },
        { word: 'restaurant',  weight: 3 },
        { word: 'cafe',        weight: 3 },
        { word: 'cuisine',     weight: 2 },
        { word: 'chef',        weight: 2 },
        { word: 'food',        weight: 1 },
        { word: 'eat',         weight: 1 },
      ],
    },
    {
      category: 'health-wellness',
      keywords: [
        { word: 'gym',       weight: 3 },
        { word: 'fitness',   weight: 3 },
        { word: 'yoga',      weight: 3 },
        { word: 'wellness',  weight: 2 },
        { word: 'massage',   weight: 3 },
        { word: 'therapy',   weight: 2 },
        { word: 'workout',   weight: 2 },
        { word: 'health',    weight: 1 },
      ],
    },
    {
      category: 'real-estate',
      keywords: [
        { word: 'listing',       weight: 3 },
        { word: 'realtor',       weight: 3 },
        { word: 'homes for sale', weight: 3 },
        { word: 'real estate',   weight: 3 },
        { word: 'mortgage',      weight: 2 },
        { word: 'property',      weight: 1 },
      ],
    },
    {
      category: 'retail',
      keywords: [
        { word: 'boutique',    weight: 3 },
        { word: 'collection',  weight: 2 },
        { word: 'add to cart', weight: 3 },
        { word: 'shop now',    weight: 2 },
        { word: 'store',       weight: 1 },
      ],
    },
  ];

  let best = { category: 'general', score: 0 };
  for (const { category, keywords } of checks) {
    const score = keywords.reduce(
      (acc, { word, weight }) => acc + (combined.includes(word) ? weight : 0),
      0
    );
    if (score > best.score) best = { category, score };
  }

  return best.category;
}
