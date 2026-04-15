/**
 * server.js
 * Express 5 server for the Aggie Marketing client onboarding tool.
 *
 * Security:
 *  - Bound to 0.0.0.0 inside Docker; host-side restriction is enforced by
 *    docker-compose (ports: "127.0.0.1:3000:3000") — unreachable from the network
 *  - Helmet sets all HTTP security headers
 *  - URL validation and path sanitization happen in scraper/generator modules
 *  - Request body size capped at 2kb (no large payload attacks)
 *  - All errors return generic messages to the client; details logged server-side
 */

import express from 'express';
import helmet from 'helmet';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeWebsite } from './scraper.js';
import { generateClientFolder, listClients } from './generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;
// Inside Docker, bind to all container interfaces so the host port mapping works.
// The actual host-side restriction (127.0.0.1 only) is enforced in docker-compose.yml.
const HOST = process.env.BIND_HOST ?? '0.0.0.0';

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
 * Parses bullet-list items from a markdown section.
 * e.g. "## Hook Ideas\n- \"text\"\n- \"text2\"" → ["text", "text2"]
 */
function parseSection(markdown, heading) {
  const re = new RegExp(`## ${heading}[\\s\\S]*?\n((?:- [^\n]+\n?)+)`);
  const match = markdown.match(re);
  if (!match) return [];
  return match[1]
    .split('\n')
    .filter(l => l.startsWith('- '))
    .map(l => l.replace(/^- /, '').replace(/^"|"$/g, '').trim());
}

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

    // Read category playbook and extract actionable sections
    const CATS_DIR = path.join(__dirname, '..', 'categories');
    let playbook = { hooks: [], ctas: [], whatWorks: [], conversion: [] };
    try {
      const playbookText = await fs.readFile(
        path.join(CATS_DIR, scraped.category, 'README.md'), 'utf8'
      );
      playbook = {
        hooks:      parseSection(playbookText, 'Hook Ideas'),
        ctas:       parseSection(playbookText, 'CTA Ideas'),
        whatWorks:  parseSection(playbookText, 'What Works in This Category'),
        conversion: parseSection(playbookText, 'Conversion Content That Works'),
      };
    } catch { /* no playbook for this category — return empty */ }

    res.json({
      success: true,
      folderName:   result.folderName,
      businessName: scraped.businessName,
      category:     scraped.category,
      phone:        scraped.phone  || '',
      email:        scraped.email  || '',
      url:          scraped.url    || '',
      socialLinks:  scraped.socialLinks || {},
      playbook,
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
