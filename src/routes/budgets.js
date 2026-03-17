const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/budgets/:year/:month
router.get('/:year/:month', (req, res) => {
  const { year, month } = req.params;
  let budget = db.prepare(`SELECT * FROM budgets WHERE year=? AND month=?`).get(Number(year), Number(month));

  if (!budget) {
    const setting = db.prepare(`SELECT value FROM settings WHERE key='default_budget'`).get();
    budget = { id: null, year: Number(year), month: Number(month), amount: Number(setting?.value || 0) };
  }
  res.json(budget);
});

// PUT /api/budgets/:year/:month  (upsert)
router.put('/:year/:month', (req, res) => {
  const { year, month } = req.params;
  const { amount } = req.body;
  if (amount === undefined) return res.status(400).json({ error: 'amount 필요' });

  db.prepare(`
    INSERT INTO budgets (year, month, amount) VALUES (?, ?, ?)
    ON CONFLICT(year, month) DO UPDATE SET amount = excluded.amount
  `).run(Number(year), Number(month), Number(amount));

  res.json(db.prepare(`SELECT * FROM budgets WHERE year=? AND month=?`).get(Number(year), Number(month)));
});

module.exports = router;
