/**
 * app.js — Frontend logic for the Aggie Marketing onboarding tool
 * Runs entirely client-side. Communicates with the local Express server.
 */

// ── Element refs ─────────────────────────────────────────
const stepScrape     = document.getElementById('step-scrape');
const stepReview     = document.getElementById('step-review');
const stepDone       = document.getElementById('step-done');
const stepDashboard  = document.getElementById('step-dashboard');

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

// Active client for dashboard
let activeDashClient = null;

// ── Step transitions ─────────────────────────────────────
function showStep(el) {
  [stepScrape, stepReview, stepDone, stepDashboard].forEach(s => {
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
      const btn = document.createElement('button');
      btn.className = 'client-btn';
      btn.textContent = name;
      btn.addEventListener('click', () => openClientDashboard(name));
      li.appendChild(btn);
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

    // Success — populate rich Step 3
    const r = json;
    doneMessage.textContent = `"${r.businessName}" is set up and ready to work with.`;
    doneFolderPath.textContent = `clients/${r.folderName}/`;

    // Overview strip
    const overview = document.getElementById('done-overview');
    overview.innerHTML = [
      r.phone    && `<span>📞 ${r.phone}</span>`,
      r.email    && `<span>✉️ ${r.email}</span>`,
      r.url      && `<span><a href="${r.url}" target="_blank" rel="noopener">${r.url.replace(/^https?:\/\//, '')}</a></span>`,
      r.category && `<span class="badge">${r.category}</span>`,
      r.socialLinks?.instagram && `<span><a href="${r.socialLinks.instagram}" target="_blank" rel="noopener">Instagram</a></span>`,
      r.socialLinks?.facebook  && `<span><a href="${r.socialLinks.facebook}"  target="_blank" rel="noopener">Facebook</a></span>`,
    ].filter(Boolean).join('');

    // Content cards
    const cards = document.getElementById('done-content');
    cards.innerHTML = '';

    function makeCard(title, items, cls = '') {
      if (!items || items.length === 0) return '';
      const listItems = items.map(item =>
        `<li>${item} <button class="copy-btn" title="Copy" onclick="navigator.clipboard.writeText(${JSON.stringify(item)})">Copy</button></li>`
      ).join('');
      return `<div class="content-card ${cls}"><h4>${title}</h4><ul>${listItems}</ul></div>`;
    }

    cards.innerHTML = [
      makeCard('🎯 Hook Library', r.playbook?.hooks, 'card-hooks'),
      makeCard('📣 CTA Bank', r.playbook?.ctas, 'card-ctas'),
      makeCard('✅ What Works for This Category', r.playbook?.whatWorks, 'card-what'),
      makeCard('💰 Conversion Content', r.playbook?.conversion, 'card-conversion'),
    ].filter(Boolean).join('');

    showStep(stepDone);
    loadClients();

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

// ── Dashboard ────────────────────────────────────────────

async function openClientDashboard(folderName) {
  activeDashClient = folderName;
  showStep(stepDashboard);

  // Clear previous content
  document.getElementById('dash-business-name').textContent = folderName;
  document.getElementById('dash-category-badge').textContent = '';
  document.getElementById('dash-goals').innerHTML = '';
  document.getElementById('dash-pillars').innerHTML = '';
  document.getElementById('dash-schedule').innerHTML = '';
  document.getElementById('dash-hooks').innerHTML = '';
  document.getElementById('dash-ctas').innerHTML = '';
  document.getElementById('dash-calendar').innerHTML = '';
  document.getElementById('dash-calendar-empty').classList.remove('hidden');
  document.getElementById('calendar-wrap').classList.add('hidden');

  try {
    const res  = await fetch(`/api/client/${encodeURIComponent(folderName)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load client');

    document.getElementById('dash-business-name').textContent      = data.businessName;
    document.getElementById('dash-category-badge').textContent     = '';

    // Goals
    const goalsList = document.getElementById('dash-goals');
    (data.goals || []).forEach(g => {
      const li = document.createElement('li');
      li.textContent = g;
      goalsList.appendChild(li);
    });

    // Pillars
    const pillarsEl = document.getElementById('dash-pillars');
    (data.pillars || []).forEach(p => {
      const chip = document.createElement('span');
      chip.className = 'pillar-chip';
      chip.title = p.desc || '';
      chip.textContent = p.name;
      pillarsEl.appendChild(chip);
    });

    // Populate pillar dropdown in calendar builder
    const pillarSelect = document.getElementById('cal-pillar');
    pillarSelect.innerHTML = '';
    (data.pillars || []).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      pillarSelect.appendChild(opt);
    });
    if (!data.pillars || data.pillars.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '—';
      pillarSelect.appendChild(opt);
    }

    // Schedule
    const schedBody = document.getElementById('dash-schedule');
    (data.schedule || []).forEach(s => {
      if (s.platform === '—') return; // skip rest day
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s.day}</td><td>${s.platform}</td><td>${s.type}</td><td>${s.pillar}</td>`;
      schedBody.appendChild(tr);
    });

    // Hook library
    const hooksEl = document.getElementById('dash-hooks');
    (data.hooks || []).forEach(h => {
      hooksEl.appendChild(makeSelectableItem(h, 'hook'));
    });
    if (!data.hooks || data.hooks.length === 0) {
      hooksEl.innerHTML = '<li class="muted">No hooks yet — add some to the strategy doc</li>';
    }

    // CTA bank
    const ctasEl = document.getElementById('dash-ctas');
    (data.ctas || []).forEach(c => {
      ctasEl.appendChild(makeSelectableItem(c, 'cta'));
    });
    if (!data.ctas || data.ctas.length === 0) {
      ctasEl.innerHTML = '<li class="muted">No CTAs yet — add some to the strategy doc</li>';
    }

    // Calendar
    renderCalendar(data.calendar || []);

  } catch (err) {
    document.getElementById('dash-business-name').textContent = `Error: ${err.message}`;
  }
}

function makeSelectableItem(text, field) {
  const li  = document.createElement('li');
  const btn = document.createElement('button');
  btn.className = 'use-btn';
  btn.textContent = 'Use';
  btn.addEventListener('click', () => {
    document.getElementById(field === 'hook' ? 'cal-hook' : 'cal-cta').value = text;
    // Visual feedback
    document.querySelectorAll('.use-btn.used').forEach(b => b.classList.remove('used'));
    btn.classList.add('used');
    btn.textContent = '✓ Used';
    // Scroll to builder
    document.querySelector('.cal-builder').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  const span = document.createElement('span');
  span.textContent = text;
  li.appendChild(btn);
  li.appendChild(span);
  return li;
}

function renderCalendar(entries) {
  const tbody  = document.getElementById('dash-calendar');
  const empty  = document.getElementById('dash-calendar-empty');
  const wrap   = document.getElementById('calendar-wrap');

  tbody.innerHTML = '';

  const filled = entries.filter(e => e.date && e.platform && e.format);
  if (filled.length === 0) {
    empty.classList.remove('hidden');
    wrap.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  wrap.classList.remove('hidden');

  filled.forEach(e => {
    const tr = document.createElement('tr');
    const statusClass = `status-${(e.status || 'idea').toLowerCase().replace(/\s/g, '-')}`;
    tr.innerHTML = [
      `<td>${e.date}</td>`,
      `<td>${e.platform}</td>`,
      `<td>${e.format}</td>`,
      `<td>${e.pillar}</td>`,
      `<td>${e.hook}</td>`,
      `<td>${e.cta}</td>`,
      `<td class="${statusClass}">${e.status}</td>`,
    ].join('');
    tbody.appendChild(tr);
  });
}

// Dashboard back button
document.getElementById('dash-back-btn').addEventListener('click', () => {
  activeDashClient = null;
  showStep(stepScrape);
});

// Add to calendar
document.getElementById('cal-add-btn').addEventListener('click', async () => {
  const calError = document.getElementById('calendar-error');
  hideError(calError);

  if (!activeDashClient) return;

  const entry = {
    date:     document.getElementById('cal-date').value,
    platform: document.getElementById('cal-platform').value,
    format:   document.getElementById('cal-format').value,
    pillar:   document.getElementById('cal-pillar').value,
    hook:     document.getElementById('cal-hook').value.trim(),
    cta:      document.getElementById('cal-cta').value.trim(),
  };

  if (!entry.date) {
    showError(calError, 'Pick a date first');
    return;
  }

  const btn = document.getElementById('cal-add-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await fetch(`/api/client/${encodeURIComponent(activeDashClient)}/calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Could not save entry');

    // Clear fields
    document.getElementById('cal-date').value    = '';
    document.getElementById('cal-hook').value    = '';
    document.getElementById('cal-cta').value     = '';
    document.querySelectorAll('.use-btn.used').forEach(b => {
      b.classList.remove('used');
      b.textContent = 'Use';
    });

    // Reload calendar from server
    const clientRes  = await fetch(`/api/client/${encodeURIComponent(activeDashClient)}`);
    const clientData = await clientRes.json();
    renderCalendar(clientData.calendar || []);

  } catch (err) {
    showError(calError, err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add to Calendar';
  }
});

// ── Init ─────────────────────────────────────────────────
loadClients();
