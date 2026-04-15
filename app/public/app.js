/**
 * app.js — Frontend logic for the Aggie Marketing onboarding tool
 * Runs entirely client-side. Communicates with the local Express server.
 */

// ── Element refs ─────────────────────────────────────────
const stepScrape   = document.getElementById('step-scrape');
const stepReview   = document.getElementById('step-review');
const stepDone     = document.getElementById('step-done');

const scrapeForm   = document.getElementById('scrape-form');
const urlInput     = document.getElementById('url-input');
const scrapeBtn    = document.getElementById('scrape-btn');
const scrapeError  = document.getElementById('scrape-error');

const reviewForm       = document.getElementById('review-form');
const generateBtn      = document.getElementById('generate-btn');
const backBtn          = document.getElementById('back-btn');
const generateError    = document.getElementById('generate-error');
const folderNamePreview = document.getElementById('folder-name-preview');

const clientsList  = document.getElementById('clients-list');
const restartBtn   = document.getElementById('restart-btn');
const doneMessage  = document.getElementById('done-message');
const doneFolderPath = document.getElementById('done-folder-path');

// Holds the scraped data between steps
let scrapedData = null;

// ── Step transitions ─────────────────────────────────────
function showStep(el) {
  [stepScrape, stepReview, stepDone].forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('active');
  });
  el.classList.remove('hidden');
  el.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Helpers ──────────────────────────────────────────────
function setLoading(btn, loading, text) {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner"></span>${text}`
    : text;
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError(el) {
  el.classList.add('hidden');
  el.textContent = '';
}

/** Converts a business name to the sanitized folder name format */
function toFolderName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Load existing clients ────────────────────────────────
async function loadClients() {
  try {
    const res = await fetch('/api/clients');
    const { clients } = await res.json();

    clientsList.innerHTML = '';
    if (!clients || clients.length === 0) {
      clientsList.innerHTML = '<li class="muted">No clients yet — add one above</li>';
      return;
    }
    clients.forEach(name => {
      const li = document.createElement('li');
      li.textContent = name;
      clientsList.appendChild(li);
    });
  } catch {
    clientsList.innerHTML = '<li class="muted">Could not load client list</li>';
  }
}

// ── Step 1: Scrape ───────────────────────────────────────
scrapeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(scrapeError);

  const url = urlInput.value.trim();
  if (!url) return;

  setLoading(scrapeBtn, true, 'Scanning...');

  try {
    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const json = await res.json();

    if (!res.ok) {
      showError(scrapeError, json.error || 'Something went wrong');
      return;
    }

    scrapedData = json.data;
    populateReviewForm(scrapedData);
    showStep(stepReview);

  } catch {
    showError(scrapeError, 'Could not reach the server. Make sure the app is running.');
  } finally {
    setLoading(scrapeBtn, false, 'Scan Website');
  }
});

// ── Step 2: Populate review form ─────────────────────────
function populateReviewForm(data) {
  document.getElementById('f-name').value        = data.businessName || '';
  document.getElementById('f-description').value  = data.description || '';
  document.getElementById('f-phone').value        = data.phone || '';
  document.getElementById('f-email').value        = data.email || '';
  document.getElementById('f-address').value      = data.address || '';
  document.getElementById('f-instagram').value    = data.socialLinks?.instagram || '';
  document.getElementById('f-facebook').value     = data.socialLinks?.facebook || '';
  document.getElementById('f-tiktok').value       = data.socialLinks?.tiktok || '';
  document.getElementById('f-url').value          = data.url || '';

  // Set category dropdown
  const select = document.getElementById('f-category');
  const opt = [...select.options].find(o => o.value === data.category);
  if (opt) select.value = data.category;

  // Update folder name preview
  updateFolderPreview();
}

// ── Live folder name preview ─────────────────────────────
document.getElementById('f-name').addEventListener('input', updateFolderPreview);

function updateFolderPreview() {
  const name = document.getElementById('f-name').value;
  const folder = toFolderName(name) || '—';
  folderNamePreview.textContent = `clients/${folder}/`;
}

// ── Back button ──────────────────────────────────────────
backBtn.addEventListener('click', () => {
  hideError(generateError);
  showStep(stepScrape);
});

// ── Step 2: Generate ─────────────────────────────────────
reviewForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(generateError);

  // Collect field values back into scrapedData
  const updatedData = {
    ...scrapedData,
    businessName:  document.getElementById('f-name').value.trim(),
    description:   document.getElementById('f-description').value.trim(),
    phone:         document.getElementById('f-phone').value.trim(),
    email:         document.getElementById('f-email').value.trim(),
    address:       document.getElementById('f-address').value.trim(),
    category:      document.getElementById('f-category').value,
    url:           document.getElementById('f-url').value.trim(),
    socialLinks: {
      instagram: document.getElementById('f-instagram').value.trim(),
      facebook:  document.getElementById('f-facebook').value.trim(),
      tiktok:    document.getElementById('f-tiktok').value.trim(),
      google:    scrapedData?.socialLinks?.google || '',
    },
  };

  if (!updatedData.businessName) {
    showError(generateError, 'Business name is required');
    return;
  }

  setLoading(generateBtn, true, 'Creating folder...');

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scraped: updatedData }),
    });

    const json = await res.json();

    if (!res.ok) {
      showError(generateError, json.error || 'Something went wrong');
      return;
    }

    // Success
    doneMessage.textContent = `"${updatedData.businessName}" has been set up and is ready to work with.`;
    doneFolderPath.textContent = `clients/${json.folderName}/`;
    showStep(stepDone);
    loadClients(); // refresh the client list for next time

  } catch {
    showError(generateError, 'Could not reach the server.');
  } finally {
    setLoading(generateBtn, false, 'Create Client Folder');
  }
});

// ── Step 3: Restart ──────────────────────────────────────
restartBtn.addEventListener('click', () => {
  scrapedData = null;
  scrapeForm.reset();
  reviewForm.reset();
  hideError(scrapeError);
  hideError(generateError);
  showStep(stepScrape);
});

// ── Init ─────────────────────────────────────────────────
loadClients();
