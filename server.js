const express = require('express');
const path = require('path');
const { db, FACTORS, calculateCO2, isAbsurd } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- DP3: week helpers (Monday-Sunday calendar week) ----------
function getWeekBounds(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

// ---------- Factors (for frontend to render the log form) ----------
app.get('/api/factors', (req, res) => {
  res.json(FACTORS);
});

// ---------- Log an activity (with DP2 absurd-input confirm flow) ----------
app.post('/api/activities', (req, res) => {
  const { type, quantity, date, confirm } = req.body;

  if (!FACTORS[type]) {
    return res.status(400).json({ error: `Unknown activity type: ${type}` });
  }
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number.' });
  }

  const absurd = isAbsurd(type, qty);
  if (absurd && !confirm) {
    // DP2: don't save yet — ask the client to confirm this looks intentional.
    return res.status(409).json({
      needsConfirmation: true,
      message: `That's an unusually large amount for ${FACTORS[type].label} (${qty} ${FACTORS[type].unit}). Resubmit with confirm:true if this is correct.`,
    });
  }

  const activityDate = date || toISODate(new Date());
  const co2 = calculateCO2(type, qty);

  const stmt = db.prepare(
    `INSERT INTO activities (type, quantity, co2_kg, flagged, date) VALUES (?, ?, ?, ?, ?)`
  );
  const result = stmt.run(type, qty, co2, absurd ? 1 : 0, activityDate);

  res.status(201).json({
    id: result.lastInsertRowid,
    type,
    quantity: qty,
    co2_kg: co2,
    flagged: absurd,
    date: activityDate,
  });
});

// ---------- History & filter ----------
app.get('/api/activities', (req, res) => {
  const { type, from, to } = req.query;
  let query = 'SELECT * FROM activities WHERE 1=1';
  const params = [];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (from) {
    query += ' AND date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND date <= ?';
    params.push(to);
  }
  query += ' ORDER BY date DESC, id DESC';

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

app.delete('/api/activities/:id', (req, res) => {
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ---------- Dashboard: totals + per-category breakdown ----------
app.get('/api/dashboard', (req, res) => {
  const { start, end } = getWeekBounds();
  const startStr = toISODate(start);
  const endStr = toISODate(end);

  const weekRows = db
    .prepare('SELECT * FROM activities WHERE date >= ? AND date <= ?')
    .all(startStr, endStr);

  const allRows = db.prepare('SELECT * FROM activities').all();

  const breakdown = {};
  for (const type of Object.keys(FACTORS)) breakdown[type] = 0;
  for (const row of weekRows) breakdown[row.type] += row.co2_kg;

  const weekTotal = weekRows.reduce((sum, r) => sum + r.co2_kg, 0);
  const allTimeTotal = allRows.reduce((sum, r) => sum + r.co2_kg, 0);

  const target = db.prepare('SELECT value FROM settings WHERE key = ?').get('weekly_target');
  const weeklyTarget = target ? Number(target.value) : null;

  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon..7=Sun
  const daysElapsed = dayOfWeek;

  res.json({
    weekStart: startStr,
    weekEnd: endStr,
    daysElapsed,
    weekTotal: Math.round(weekTotal * 100) / 100,
    allTimeTotal: Math.round(allTimeTotal * 100) / 100,
    breakdown: Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
    weeklyTarget,
    overTarget: weeklyTarget !== null && weekTotal > weeklyTarget,
    percentOfTarget: weeklyTarget ? Math.round((weekTotal / weeklyTarget) * 100) : null,
  });
});

// ---------- Weekly target ----------
app.get('/api/target', (req, res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('weekly_target');
  res.json({ weeklyTarget: row ? Number(row.value) : null });
});

app.post('/api/target', (req, res) => {
  const { weeklyTarget } = req.body;
  const val = Number(weeklyTarget);
  if (!Number.isFinite(val) || val <= 0) {
    return res.status(400).json({ error: 'weeklyTarget must be a positive number.' });
  }
  db.prepare(
    `INSERT INTO settings (key, value) VALUES ('weekly_target', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(String(val));
  res.json({ weeklyTarget: val });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Carbon Tracker running on http://localhost:${PORT}`);
});
