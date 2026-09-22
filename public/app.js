let FACTORS = {};
let pendingSubmission = null; // holds {type, quantity, date} awaiting DP2 confirmation

const el = (id) => document.getElementById(id);

async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ---------- Init ----------
async function init() {
  const { data } = await api('/factors');
  FACTORS = data;

  const typeSelect = el('activity-type');
  const filterTypeSelect = el('filter-type');
  for (const [key, f] of Object.entries(FACTORS)) {
    const opt1 = document.createElement('option');
    opt1.value = key;
    opt1.textContent = f.label;
    typeSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = key;
    opt2.textContent = f.label;
    filterTypeSelect.appendChild(opt2);
  }
  updateUnitLabel();
  el('activity-date').value = new Date().toISOString().slice(0, 10);

  typeSelect.addEventListener('change', updateUnitLabel);

  await Promise.all([loadDashboard(), loadHistory(), loadTarget()]);
}

function updateUnitLabel() {
  const type = el('activity-type').value;
  el('unit-label').textContent = FACTORS[type]?.unit || '';
}

// ---------- Log activity (feature 1 + 2) ----------
el('activity-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = el('activity-type').value;
  const quantity = Number(el('activity-quantity').value);
  const date = el('activity-date').value;

  await submitActivity({ type, quantity, date });
});

async function submitActivity({ type, quantity, date }, confirm = false) {
  const { ok, status, data } = await api('/activities', {
    method: 'POST',
    body: JSON.stringify({ type, quantity, date, confirm }),
  });

  if (status === 409 && data.needsConfirmation) {
    // DP2: absurd input -> ask for confirmation before saving
    pendingSubmission = { type, quantity, date };
    el('confirm-message').textContent = data.message;
    el('confirm-modal').hidden = false;
    return;
  }

  if (!ok) {
    setStatus(data.error || 'Something went wrong.', 'error');
    return;
  }

  setStatus(
    `Logged: ${FACTORS[type].label} — ${data.co2_kg} kg CO₂${data.flagged ? ' (flagged as unusual)' : ''}`,
    'success'
  );
  el('activity-form').reset();
  el('activity-date').value = new Date().toISOString().slice(0, 10);
  updateUnitLabel();
  await Promise.all([loadDashboard(), loadHistory()]);
}

function setStatus(msg, type) {
  const node = el('log-status');
  node.textContent = msg;
  node.className = `status-msg ${type}`;
}

el('confirm-yes').addEventListener('click', async () => {
  el('confirm-modal').hidden = true;
  if (pendingSubmission) {
    await submitActivity(pendingSubmission, true);
    pendingSubmission = null;
  }
});
el('confirm-no').addEventListener('click', () => {
  el('confirm-modal').hidden = true;
  pendingSubmission = null;
  setStatus('Entry cancelled.', 'error');
});

// ---------- Weekly target (feature 4) ----------
async function loadTarget() {
  const { data } = await api('/target');
  renderTargetDisplay(data.weeklyTarget);
}

el('target-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const weeklyTarget = Number(el('target-input').value);
  const { ok, data } = await api('/target', {
    method: 'POST',
    body: JSON.stringify({ weeklyTarget }),
  });
  if (ok) {
    renderTargetDisplay(data.weeklyTarget);
    el('target-form').reset();
    await loadDashboard();
  }
});

function renderTargetDisplay(target) {
  const box = el('target-display');
  if (target) {
    box.innerHTML = `<p>Current target: <strong>${target} kg CO₂ / week</strong></p>`;
  } else {
    box.innerHTML = `<p id="no-target-msg">No target set yet.</p>`;
  }
}

// ---------- Dashboard (feature 3) ----------
async function loadDashboard() {
  const { data } = await api('/dashboard');

  el('week-total').textContent = data.weekTotal;
  el('alltime-total').textContent = data.allTimeTotal;

  const tbody = document.querySelector('#breakdown-table tbody');
  tbody.innerHTML = '';
  const maxVal = Math.max(...Object.values(data.breakdown), 1);
  for (const [type, value] of Object.entries(data.breakdown)) {
    const tr = document.createElement('tr');
    const pct = Math.round((value / maxVal) * 100);
    tr.innerHTML = `
      <td>${FACTORS[type]?.label || type}</td>
      <td>${value}</td>
      <td class="bar-cell"><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></td>
    `;
    tbody.appendChild(tr);
  }

  // DP3: week progress bar, Monday-Sunday, filled up to today
  const dayBar = el('day-segments');
  dayBar.innerHTML = '';
  for (let i = 1; i <= 7; i++) {
    const seg = document.createElement('div');
    seg.className = 'day-segment';
    if (i <= data.daysElapsed) seg.classList.add('filled');
    if (i === data.daysElapsed) seg.classList.add('today');
    dayBar.appendChild(seg);
  }
  el('week-progress-bar').hidden = false;

  // DP1: nudge, not block, not shame
  const banner = el('nudge-banner');
  if (data.weeklyTarget && data.overTarget) {
    banner.hidden = false;
    banner.className = 'nudge-banner warn';
    banner.textContent = `You're at ${data.percentOfTarget}% of your weekly target (${data.weekTotal} / ${data.weeklyTarget} kg). Try swapping a car trip for a bus ride, or skipping a non-veg meal, to bring it back down.`;
  } else if (data.weeklyTarget) {
    banner.hidden = false;
    banner.className = 'nudge-banner';
    banner.style.background = '#e6f4ea';
    banner.style.color = '#1e7d4f';
    banner.textContent = `You're at ${data.percentOfTarget}% of your weekly target. Keep it up!`;
  } else {
    banner.hidden = true;
  }
}

// ---------- History & filter (feature 5) ----------
async function loadHistory(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data } = await api(`/activities${qs ? '?' + qs : ''}`);

  const tbody = document.querySelector('#history-table tbody');
  tbody.innerHTML = '';
  for (const row of data) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.date}</td>
      <td>${FACTORS[row.type]?.label || row.type}</td>
      <td>${row.quantity} ${FACTORS[row.type]?.unit || ''}</td>
      <td>${row.co2_kg}</td>
      <td>${row.flagged ? '<span class="flag-badge">flagged</span>' : ''}</td>
      <td><button class="delete-btn" data-id="${row.id}">✕</button></td>
    `;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api(`/activities/${btn.dataset.id}`, { method: 'DELETE' });
      await Promise.all([loadDashboard(), loadHistory(currentFilters())]);
    });
  });
}

function currentFilters() {
  const params = {};
  const type = el('filter-type').value;
  const from = el('filter-from').value;
  const to = el('filter-to').value;
  if (type) params.type = type;
  if (from) params.from = from;
  if (to) params.to = to;
  return params;
}

el('apply-filters').addEventListener('click', () => loadHistory(currentFilters()));
el('clear-filters').addEventListener('click', () => {
  el('filter-type').value = '';
  el('filter-from').value = '';
  el('filter-to').value = '';
  loadHistory();
});

init();
