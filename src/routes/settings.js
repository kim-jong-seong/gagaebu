const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/settings
router.get('/', (req, res) => {
  const rows = db.prepare(`SELECT key, value FROM settings`).all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

// PUT /api/settings  — body: { key: value, ... }
router.put('/', (req, res) => {
  const upsert = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`);
  const upsertAll = db.transaction(pairs => {
    pairs.forEach(([k, v]) => upsert.run(k, String(v)));
  });
  upsertAll(Object.entries(req.body));
  res.json({ ok: true });
});

module.exports = router;
