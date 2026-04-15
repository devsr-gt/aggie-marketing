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
 * Appends category playbook hints to the strategy doc.
 */
async function prefillStrategy(clientDir, scraped) {
  const strategyPath = path.join(clientDir, '02-strategy', 'README.md');
  const playbook = await getCategoryPlaybook(scraped.category);

  if (!playbook) return;

  let content = await fs.readFile(strategyPath, 'utf8');
  content += `\n---\n\n## Category Playbook Reference — ${scraped.category}\n\n`;

  // Extract just the hooks and CTAs sections from the playbook
  const hookMatch = playbook.match(/## Hook Ideas[\s\S]*?(?=##|$)/);
  const ctaMatch = playbook.match(/## CTA Ideas[\s\S]*?(?=##|$)/);

  if (hookMatch) content += hookMatch[0] + '\n';
  if (ctaMatch) content += ctaMatch[0] + '\n';

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
