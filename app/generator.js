/**
 * generator.js
 * Creates a new client folder from the _template, pre-filling docs
 * with data scraped from their website.
 *
 * Security:
 *  - sanitizeName() strips all characters that could escape the target directory
 *  - All writes are constrained to the /clients/ directory
 *  - Path traversal attempts are rejected before any fs operation
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Root of the project (one level up from /app)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLIENTS_DIR = path.join(PROJECT_ROOT, 'clients');
const TEMPLATE_DIR = path.join(CLIENTS_DIR, '_template');
const CATEGORIES_DIR = path.join(PROJECT_ROOT, 'categories');

// ── Category-specific strategy defaults ─────────────────────────────────────
const CATEGORY_STRATEGY = {
  contractors: {
    goals: [
      'Generate 5+ qualified service leads per month from social media',
      'Build local brand awareness and trust in the service area',
      'Establish credibility through before/after content and customer reviews',
    ],
    platforms: [
      { name: 'Instagram', freq: '3×/week', format: 'Reels + Stories',  goal: 'Brand awareness & leads' },
      { name: 'Facebook',  freq: '3×/week', format: 'Video + Posts',    goal: 'Local reach & booking'  },
    ],
    pillars: [
      { name: 'Education',           desc: 'How-to tips, maintenance advice, DIY warnings',          example: '"3 signs your water heater is about to fail"' },
      { name: 'Before & After',      desc: 'Job transformation photos and videos',                   example: '"We fixed this burst pipe in under 2 hours"' },
      { name: 'Trust & Credibility', desc: 'Reviews, certifications, team intros',                   example: '"5-star review from [Neighborhood]"' },
      { name: 'Seasonal / Urgency',  desc: 'Timely prompts tied to season or weather',               example: '"Is your AC ready for summer?"' },
      { name: 'Local Connection',    desc: 'Community involvement, local landmarks, area references', example: '"Proud to serve the Carson Valley"' },
    ],
    schedule: [
      { day: 'Monday',    platform: 'Instagram & Facebook', type: 'Reel',           pillar: 'Education' },
      { day: 'Tuesday',   platform: 'Instagram',            type: 'Story',          pillar: 'Trust & Credibility' },
      { day: 'Wednesday', platform: 'Instagram & Facebook', type: 'Reel',           pillar: 'Before & After' },
      { day: 'Thursday',  platform: 'Facebook',             type: 'Post',           pillar: 'Seasonal / Urgency' },
      { day: 'Friday',    platform: 'Instagram & Facebook', type: 'Reel',           pillar: 'Local Connection' },
      { day: 'Saturday',  platform: 'Instagram',            type: 'Carousel / Post', pillar: 'Before & After' },
      { day: 'Sunday',    platform: '—',                    type: '—',              pillar: '—' },
    ],
  },
  retail: {
    goals: [
      'Drive foot traffic and in-store visits through social media promotions',
      'Build an engaged local following that keeps the brand top of mind',
      'Increase repeat purchases and customer loyalty',
    ],
    platforms: [
      { name: 'Instagram', freq: '4×/week', format: 'Reels + Stories + Product', goal: 'Discover & shop' },
      { name: 'Facebook',  freq: '3×/week', format: 'Posts + Events',            goal: 'Local reach & events' },
    ],
    pillars: [
      { name: 'Product Spotlight', desc: 'Feature products with context and story',            example: '"Why our customers keep buying this"' },
      { name: 'Behind the Scenes', desc: 'Store life, inventory updates, team moments',        example: '"New arrivals hitting the floor today"' },
      { name: 'Social Proof',      desc: 'Customer photos, reviews, testimonials',             example: '"Look what [Customer] picked up this week"' },
      { name: 'Education',         desc: 'How to use products, styling tips, care guides',     example: '"3 ways to style this for summer"' },
      { name: 'Promotions',        desc: 'Sales, events, limited-time offers',                 example: '"This weekend only — 20% off everything"' },
    ],
    schedule: [
      { day: 'Monday',    platform: 'Instagram',            type: 'Reel',  pillar: 'Product Spotlight' },
      { day: 'Tuesday',   platform: 'Instagram',            type: 'Story', pillar: 'Behind the Scenes' },
      { day: 'Wednesday', platform: 'Instagram & Facebook', type: 'Reel',  pillar: 'Education' },
      { day: 'Thursday',  platform: 'Facebook',             type: 'Post',  pillar: 'Promotions' },
      { day: 'Friday',    platform: 'Instagram & Facebook', type: 'Reel',  pillar: 'Social Proof' },
      { day: 'Saturday',  platform: 'Instagram',            type: 'Story', pillar: 'Promotions' },
      { day: 'Sunday',    platform: '—',                    type: '—',     pillar: '—' },
    ],
  },
  restaurants: {
    goals: [
      'Drive reservations and walk-ins through mouth-watering visual content',
      'Build a loyal local following and increase repeat visits',
      'Showcase the dining experience, team, and behind-the-scenes story',
    ],
    platforms: [
      { name: 'Instagram', freq: '5×/week', format: 'Reels + Stories + Food', goal: 'Discover & book' },
      { name: 'Facebook',  freq: '3×/week', format: 'Events + Promotions',    goal: 'Local reach & reservations' },
    ],
    pillars: [
      { name: 'Food Porn',          desc: 'Beautiful shots of dishes — the hero content',   example: '"This is our [dish] — yes it tastes as good as it looks"' },
      { name: 'Behind the Kitchen', desc: 'Prep, plating, chef moments',                    example: '"Watch how we make our signature [dish] from scratch"' },
      { name: 'Guest Experience',   desc: 'Ambiance, customer moments, reviews',            example: '"Date night done right 🍷" + customer tag' },
      { name: 'Staff & Culture',    desc: 'Team intros, values, what makes you different',  example: '"Meet [Name], who has been making our [dish] for 10 years"' },
      { name: 'Specials & Events',  desc: 'Weekly specials, seasonal menu, events',         example: '"Friday night special: [dish] — only 20 available"' },
    ],
    schedule: [
      { day: 'Monday',    platform: 'Instagram',            type: 'Reel',   pillar: 'Behind the Kitchen' },
      { day: 'Tuesday',   platform: 'Instagram & Facebook', type: 'Post',   pillar: 'Specials & Events' },
      { day: 'Wednesday', platform: 'Instagram',            type: 'Reel',   pillar: 'Food Porn' },
      { day: 'Thursday',  platform: 'Instagram & Facebook', type: 'Story',  pillar: 'Guest Experience' },
      { day: 'Friday',    platform: 'Instagram & Facebook', type: 'Reel',   pillar: 'Specials & Events' },
      { day: 'Saturday',  platform: 'Instagram',            type: 'Story',  pillar: 'Guest Experience' },
      { day: 'Sunday',    platform: 'Facebook',             type: 'Post',   pillar: 'Staff & Culture' },
    ],
  },
  default: {
    goals: [
      'Grow local brand awareness through consistent social media presence',
      'Convert social media engagement into leads and sales',
      'Build a loyal community of followers and repeat customers',
    ],
    platforms: [
      { name: 'Instagram', freq: '3×/week', format: 'Reels + Stories', goal: 'Brand awareness & engagement' },
      { name: 'Facebook',  freq: '3×/week', format: 'Posts + Video',   goal: 'Local reach & leads' },
    ],
    pillars: [
      { name: 'Education',         desc: 'Tips, how-tos, and expert advice in your niche',  example: '"The #1 mistake our customers make"' },
      { name: 'Trust',             desc: 'Reviews, testimonials, team, credentials',        example: '"5-star review from our last customer"' },
      { name: 'Behind the Scenes', desc: 'Your process, your space, your team',             example: '"A day in the life at [Business]"' },
      { name: 'Promotions',        desc: 'Offers, specials, seasonal campaigns',            example: '"This month only — [offer]"' },
      { name: 'Local',             desc: 'Community involvement, local references',         example: '"Proud to serve [City] since [year]"' },
    ],
    schedule: [
      { day: 'Monday',    platform: 'Instagram & Facebook', type: 'Reel',  pillar: 'Education' },
      { day: 'Tuesday',   platform: 'Instagram',            type: 'Story', pillar: 'Trust' },
      { day: 'Wednesday', platform: 'Instagram & Facebook', type: 'Reel',  pillar: 'Behind the Scenes' },
      { day: 'Thursday',  platform: 'Facebook',             type: 'Post',  pillar: 'Promotions' },
      { day: 'Friday',    platform: 'Instagram & Facebook', type: 'Reel',  pillar: 'Local' },
      { day: 'Saturday',  platform: 'Instagram',            type: 'Story', pillar: 'Trust' },
      { day: 'Sunday',    platform: '—',                    type: '—',     pillar: '—' },
    ],
  },
};

/**
 * Sanitizes a business name into a safe folder name.
 * Only allows lowercase letters, numbers, and hyphens.
 * Rejects anything that could be a path traversal attempt.
 */
export function sanitizeName(name) {
  const sanitized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // strip special chars
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '');          // trim leading/trailing hyphens

  if (!sanitized || sanitized.length < 2) {
    throw new Error('Client name is too short or contains no valid characters');
  }

  // Explicitly block traversal patterns even after sanitization
  if (sanitized.includes('..') || sanitized.startsWith('/')) {
    throw new Error('Invalid client name');
  }

  return sanitized;
}

/**
 * Ensures the resolved path is strictly inside the allowed base directory.
 * Throws if path traversal is detected.
 */
function assertSafeTarget(targetPath, baseDir) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(baseDir);
  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
    throw new Error(`Path traversal detected: "${targetPath}" is outside "${baseDir}"`);
  }
}

/**
 * Recursively copies one directory to another.
 */
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Reads a file and replaces template placeholders with scraped data.
 */
async function fillTemplate(filePath, data) {
  let content = await fs.readFile(filePath, 'utf8');

  const replacements = {
    '[Client Name]': data.businessName || '[Client Name]',
    '[Month Year]': new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    content = content.replaceAll(placeholder, value);
  }

  await fs.writeFile(filePath, content, 'utf8');
}

/**
 * Pulls the relevant playbook for the detected category.
 */
async function getCategoryPlaybook(category) {
  const playbookPath = path.join(CATEGORIES_DIR, category, 'README.md');
  try {
    return await fs.readFile(playbookPath, 'utf8');
  } catch {
    return null; // category playbook may not exist yet
  }
}

/**
 * Parses bullet-list items from a markdown section.
 * e.g. "## Hook Ideas\n- text\n- text2" → ["text", "text2"]
 */
function parseBullets(text, heading) {
  const re = new RegExp(`## ${heading}[\\s\\S]*?\n((?:- [^\n]+\n?)+)`);
  const match = text.match(re);
  if (!match) return [];
  return match[1]
    .split('\n')
    .filter(l => l.startsWith('- '))
    .map(l => l.replace(/^- /, '').replace(/^"|"$/g, '').trim())
    .filter(Boolean);
}

/**
 * Builds a fully populated strategy markdown document from scraped data + playbook.
 */
function buildStrategyMarkdown(scraped, playbookText) {
  const { businessName, category } = scraped;
  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const cfg = CATEGORY_STRATEGY[category] || CATEGORY_STRATEGY.default;

  // Pull hooks + CTAs from playbook; fall back to empty list
  const hooks = parseBullets(playbookText, 'Hook Ideas');
  const ctas  = parseBullets(playbookText, 'CTA Ideas');

  const goalsText = cfg.goals.map((g, i) => `${i + 1}. ${g}`).join('\n');

  const platformsText = cfg.platforms
    .map(p => `| ${p.name} | ${p.freq} | ${p.format} | ${p.goal} |`)
    .join('\n');

  const pillarsText = cfg.pillars
    .map((p, i) => `| ${i + 1}. ${p.name} | ${p.desc} | ${p.example} |`)
    .join('\n');

  const hookList = hooks.length > 0
    ? hooks.map(h => `- ${h}`).join('\n')
    : '- (Add hooks — see category playbook)';

  const ctaList = ctas.length > 0
    ? ctas.map(c => `- ${c}`).join('\n')
    : '- (Add CTAs — see category playbook)';

  const scheduleText = cfg.schedule
    .map(s => `| ${s.day} | ${s.platform} | ${s.type} | ${s.pillar} |`)
    .join('\n');

  return `# Content Strategy — ${businessName}
*Auto-generated ${month} from website scan. Review and customize with discovery call.*

## Goals for This Client
${goalsText}

## Platforms
| Platform | Posting Frequency | Content Format | Primary Goal |
|---|---|---|---|
${platformsText}

## Content Pillars
Define 3–5 recurring content themes that cover both brand recognition and conversion.

| Pillar | Description | Example |
|---|---|---|
${pillarsText}

## Hook Library
Running list of proven hooks to test and reuse.

${hookList}

## CTA Bank
Standard CTAs for this client — rotate to avoid fatigue.

${ctaList}

## Posting Schedule
| Day | Platform | Content Type | Pillar |
|---|---|---|---|
${scheduleText}

## Monthly Focus
<!-- What is the promotional or seasonal focus this month? -->
`;
}

/**
 * Appends pre-filled onboarding data to the client's onboarding doc.
 */
async function prefillOnboarding(clientDir, scraped) {
  const onboardingPath = path.join(clientDir, '00-onboarding', 'README.md');
  let content = await fs.readFile(onboardingPath, 'utf8');

  const contactSection = `
## Pre-filled from Website Scan
*Scraped ${scraped.scrapedAt} — verify all details with the client*

- **Website:** ${scraped.url}
- **Phone:** ${scraped.phone || '—'}
- **Email:** ${scraped.email || '—'}
- **Address:** ${scraped.address || '—'}
- **Detected Category:** ${scraped.category}

### Social Media Found
- **Instagram:** ${scraped.socialLinks.instagram || '—'}
- **Facebook:** ${scraped.socialLinks.facebook || '—'}
- **TikTok:** ${scraped.socialLinks.tiktok || '—'}
- **Google Maps:** ${scraped.socialLinks.google || '—'}
`;

  content += '\n---\n' + contactSection;
  await fs.writeFile(onboardingPath, content, 'utf8');
}

/**
 * Writes a fully populated strategy document, replacing the blank template.
 */
async function prefillStrategy(clientDir, scraped) {
  const strategyPath = path.join(clientDir, '02-strategy', 'README.md');
  const playbook = await getCategoryPlaybook(scraped.category);
  const content = buildStrategyMarkdown(scraped, playbook || '');
  await fs.writeFile(strategyPath, content, 'utf8');
}

/**
 * Appends auto-detected business description to the brand guide.
 */
async function prefillBrand(clientDir, scraped) {
  const brandPath = path.join(clientDir, '01-brand', 'README.md');
  let content = await fs.readFile(brandPath, 'utf8');

  const prefilled = `
## Pre-filled from Website Scan
*Verify and expand with discovery call notes*

- **Business Name:** ${scraped.businessName || '—'}
- **Website Description:** ${scraped.description || '—'}
- **Category:** ${scraped.category}
`;

  content = content.replace(
    '- **Business Name:**\n',
    prefilled
  );

  await fs.writeFile(brandPath, content, 'utf8');
}

/**
 * Main entry point — creates a full client folder from scraped data.
 * @param {object} scraped - Output from scrapeWebsite()
 * @returns {Promise<{folderName: string, clientDir: string}>}
 */
export async function generateClientFolder(scraped) {
  const folderName = sanitizeName(scraped.businessName || 'new-client');
  const clientDir = path.join(CLIENTS_DIR, folderName);

  // Safety check — ensure we're writing inside /clients/
  assertSafeTarget(clientDir, CLIENTS_DIR);

  // Check if folder already exists
  try {
    await fs.access(clientDir);
    throw new Error(`A client folder named "${folderName}" already exists. Rename it or use a different name.`);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    // ENOENT = folder doesn't exist = safe to create
  }

  // Copy template
  await copyDir(TEMPLATE_DIR, clientDir);

  // Replace placeholders in all markdown files
  const mdFiles = await findFiles(clientDir, '.md');
  for (const file of mdFiles) {
    await fillTemplate(file, scraped);
  }

  // Pre-fill specific docs with scraped data
  await prefillOnboarding(clientDir, scraped);
  await prefillBrand(clientDir, scraped);
  await prefillStrategy(clientDir, scraped);

  return { folderName, clientDir };
}

/**
 * Recursively finds all files with a given extension inside a directory.
 */
async function findFiles(dir, ext) {
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Lists all existing client folders (excludes _template).
 */
export async function listClients() {
  const entries = await fs.readdir(CLIENTS_DIR, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && !e.name.startsWith('_') && e.name !== 'README.md')
    .map(e => e.name);
}
