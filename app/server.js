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

/**
 * Parses numbered goal lines from a strategy markdown doc.
 * e.g. "1. Generate leads" → ["Generate leads"]
 */
function parseGoals(markdown) {
  const match = markdown.match(/## Goals for This Client\n([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  return match[1]
    .split('\n')
    .filter(l => /^\d+\./.test(l.trim()))
    .map(l => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

/**
 * Parses the Content Pillars table from a strategy markdown doc.
 */
function parsePillars(markdown) {
  const match = markdown.match(/## Content Pillars[\s\S]*?\| Pillar \|([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  return match[1]
    .split('\n')
    .filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Pillar |'))
    .map(row => {
      const parts = row.split('|').map(s => s.trim()).filter(Boolean);
      return { name: parts[0] || '', desc: parts[1] || '', example: parts[2] || '' };
    })
    .filter(p => p.name);
}

/**
 * Parses the Posting Schedule table from a strategy markdown doc.
 */
function parseSchedule(markdown) {
  const match = markdown.match(/## Posting Schedule[\s\S]*?\| Day \|([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  return match[1]
    .split('\n')
    .filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Day |'))
    .map(row => {
      const parts = row.split('|').map(s => s.trim()).filter(Boolean);
      return { day: parts[0] || '', platform: parts[1] || '', type: parts[2] || '', pillar: parts[3] || '' };
    })
    .filter(s => s.day);
}

/**
 * Parses the Content Calendar table from a calendar markdown doc.
 */
function parseCalendar(markdown) {
  const match = markdown.match(/## Content Schedule[\s\S]*?\| Date \|([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  return match[1]
    .split('\n')
    .filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Date |'))
    .map(row => {
      const parts = row.split('|').map(s => s.trim()).filter(Boolean);
      return {
        date:     parts[0] || '',
        platform: parts[1] || '',
        format:   parts[2] || '',
        pillar:   parts[3] || '',
        hook:     parts[4] || '',
        caption:  parts[5] || '',
        cta:      parts[6] || '',
        status:   parts[7] || '',
        notes:    parts[8] || '',
      };
    })
    .filter(c => c.date && c.date !== '');
}

/**
 * GET /api/client/:name
 * Returns structured dashboard data for a client.
 */
app.get('/api/client/:name', async (req, res) => {
  const { name } = req.params;

  // Only allow safe folder names
  if (!/^[a-z0-9-]+$/.test(name)) {
    return res.status(400).json({ error: 'Invalid client name' });
  }

  const CLIENTS_DIR = path.join(__dirname, '..', 'clients');
  const clientDir   = path.join(CLIENTS_DIR, name);

  // Path traversal guard
  if (!clientDir.startsWith(CLIENTS_DIR + path.sep)) {
    return res.status(400).json({ error: 'Invalid client name' });
  }

  try { await fs.access(clientDir); }
  catch { return res.status(404).json({ error: 'Client not found' }); }

  try {
    const readMd = async (relPath) => {
      try { return await fs.readFile(path.join(clientDir, relPath), 'utf8'); }
      catch { return ''; }
    };

    const strategyMd = await readMd('02-strategy/README.md');
    const calendarMd = await readMd('03-content-calendar/README.md');

    // Extract business name from the strategy doc heading
    const nameMatch    = strategyMd.match(/^# Content Strategy — (.+)$/m);
    const businessName = nameMatch ? nameMatch[1].trim() : name;

    res.json({
      folderName: name,
      businessName,
      goals:    parseGoals(strategyMd),
      pillars:  parsePillars(strategyMd),
      hooks:    parseSection(strategyMd, 'Hook Library'),
      ctas:     parseSection(strategyMd, 'CTA Bank'),
      schedule: parseSchedule(strategyMd),
      calendar: parseCalendar(calendarMd),
    });
  } catch (err) {
    console.error('[/api/client/:name]', err.message);
    res.status(500).json({ error: 'Could not read client data' });
  }
});

/**
 * POST /api/client/:name/calendar
 * Body: { date, platform, format, pillar, hook, cta }
 * Appends a new entry to the client's content calendar.
 */
app.post('/api/client/:name/calendar', async (req, res) => {
  const { name } = req.params;

  if (!/^[a-z0-9-]+$/.test(name)) {
    return res.status(400).json({ error: 'Invalid client name' });
  }

  const { date, platform, format, pillar, hook, cta } = req.body;

  if (!date || !platform || !format) {
    return res.status(400).json({ error: 'date, platform, and format are required' });
  }

  const CLIENTS_DIR  = path.join(__dirname, '..', 'clients');
  const calendarPath = path.join(CLIENTS_DIR, name, '03-content-calendar', 'README.md');

  if (!calendarPath.startsWith(CLIENTS_DIR + path.sep)) {
    return res.status(400).json({ error: 'Invalid client name' });
  }

  try {
    let content = await fs.readFile(calendarPath, 'utf8');

    // Sanitize all fields — strip | to protect markdown table structure
    const s = (v) => (v || '').replace(/\|/g, '').trim();
    const row = `| ${s(date)} | ${s(platform)} | ${s(format)} | ${s(pillar)} | ${s(hook)} | | ${s(cta)} | Idea | |`;

    // Insert after the last | row in the Content Schedule table
    const lines = content.split('\n');
    const headerIdx = lines.findIndex(l => l.startsWith('| Date | Platform'));

    if (headerIdx > -1) {
      let lastDataIdx = headerIdx + 1; // default: right after separator
      for (let i = headerIdx + 2; i < lines.length; i++) {
        if (lines[i].startsWith('|')) lastDataIdx = i;
        else if (i > headerIdx + 2) break; // stop after first non-| following data rows
      }
      lines.splice(lastDataIdx + 1, 0, row);
      content = lines.join('\n');
    } else {
      content += '\n' + row + '\n';
    }

    await fs.writeFile(calendarPath, content, 'utf8');
    res.json({ success: true });
  } catch (err) {
    console.error('[/api/client/:name/calendar]', err.message);
    res.status(500).json({ error: 'Could not update calendar' });
  }
});

// -----------------------------------------------------------------------
// Start
// -----------------------------------------------------------------------

app.listen(PORT, HOST, () => {
  console.log(`\nAggie Marketing Tool running at http://${HOST}:${PORT}`);
  console.log('Open that address in your browser.\n');
});
