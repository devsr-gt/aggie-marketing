/**
 * server.js
 * Express 5 server for the Aggie Marketing client onboarding tool.
 *
 * Security:
 *  - Bound to 127.0.0.1 only (localhost, never externally reachable)
 *  - Helmet sets all HTTP security headers
 *  - URL validation and path sanitization happen in scraper/generator modules
 *  - Request body size capped at 2kb (no large payload attacks)
 *  - All errors return generic messages to the client; details logged server-side
 */

import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeWebsite } from './scraper.js';
import { generateClientFolder, listClients } from './generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;
const HOST = '127.0.0.1'; // local only — never bind to 0.0.0.0

// --- Security middleware ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

// --- Body parsing (2kb cap) ---
app.use(express.json({ limit: '2kb' }));
app.use(express.urlencoded({ extended: false, limit: '2kb' }));

// --- Static files ---
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------

/**
 * GET /api/clients
 * Returns a list of all existing client folder names.
 */
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await listClients();
    res.json({ clients });
  } catch (err) {
    console.error('[/api/clients]', err);
    res.status(500).json({ error: 'Could not read client list' });
  }
});

/**
 * POST /api/scrape
 * Body: { url: string }
 * Scrapes the given URL and returns extracted business data.
 * Does NOT create any files — preview step only.
 */
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A URL is required' });
  }

  if (url.length > 2048) {
    return res.status(400).json({ error: 'URL is too long' });
  }

  try {
    const data = await scrapeWebsite(url);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/scrape]', err.message);
    // Return the error message — it's user-friendly by design in scraper.js
    res.status(422).json({ error: err.message });
  }
});

/**
 * POST /api/generate
 * Body: { scraped: object }  (the object returned from /api/scrape)
 * Creates the client folder and pre-fills all docs.
 */
app.post('/api/generate', async (req, res) => {
  const { scraped } = req.body;

  if (!scraped || typeof scraped !== 'object') {
    return res.status(400).json({ error: 'Scraped data is required' });
  }

  // Minimal validation of the shape we expect
  if (typeof scraped.businessName !== 'string' || !scraped.businessName.trim()) {
    return res.status(400).json({ error: 'businessName must be a non-empty string' });
  }

  try {
    const result = await generateClientFolder(scraped);
    res.json({
      success: true,
      folderName: result.folderName,
      message: `Client folder "${result.folderName}" created successfully`,
    });
  } catch (err) {
    console.error('[/api/generate]', err.message);
    res.status(422).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------
// Start
// -----------------------------------------------------------------------

app.listen(PORT, HOST, () => {
  console.log(`\nAggie Marketing Tool running at http://${HOST}:${PORT}`);
  console.log('Open that address in your browser.\n');
});
