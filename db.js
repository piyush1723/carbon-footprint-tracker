const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    co2_kg REAL NOT NULL,
    flagged INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ---- CO2 factors (fixed, per the brief) ----
// car/bus/flight: kg per km | electricity: kg per kWh | meals: flat kg per meal
const FACTORS = {
  car: { unit: 'km', factor: 0.20, label: 'Car travel' },
  bus: { unit: 'km', factor: 0.08, label: 'Bus travel' },
  flight: { unit: 'km', factor: 0.25, label: 'Flight' },
  electricity: { unit: 'kWh', factor: 0.80, label: 'Electricity' },
  veg_meal: { unit: 'meal', factor: 0.5, label: 'Veg meal', flat: true },
  nonveg_meal: { unit: 'meal', factor: 2.0, label: 'Non-veg meal', flat: true },
};

// ---- DP2: sanity ceilings per type. Exceeding these requires confirmation. ----
const SANITY_LIMITS = {
  car: 1000,        // km/day
  bus: 1000,        // km/day
  flight: 20000,     // km/day (longest real flights are ~18,000km)
  electricity: 500,  // kWh/day
  veg_meal: 10,       // meals/day
  nonveg_meal: 10,    // meals/day
};

function calculateCO2(type, quantity) {
  const f = FACTORS[type];
  if (!f) throw new Error(`Unknown activity type: ${type}`);
  return Math.round(f.factor * quantity * 100) / 100;
}

function isAbsurd(type, quantity) {
  const limit = SANITY_LIMITS[type];
  return limit !== undefined && quantity > limit;
}

module.exports = { db, FACTORS, SANITY_LIMITS, calculateCO2, isAbsurd };
