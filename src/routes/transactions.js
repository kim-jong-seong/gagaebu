const express = require('express');
const router = express.Router();
const db = require('../db');

const JOIN = `
  LEFT JOIN categories      c ON t.category_id       = c.id
  LEFT JOIN payment_methods p ON t.payment_method_id = p.id
`;
const SELECT = `
  t.*,
  c.name  AS category_name,
  c.icon  AS category_icon,
  c.color AS category_color,
  p.name  AS payment_name
`;

// GET /api/transactions
router.get('/', (req, res) => {
  const { year, month, type, category_id, payment_method_id, q, page = 1, limit = 10 } = req.query;

  const where = [];
  const params = [];

  if (year && month) {
    where.push(`strftime('%Y-%m', t.date) = ?`);
    params.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  if (type)              { where.push(`t.type = ?`);               params.push(type); }
  if (category_id)       { where.push(`t.category_id = ?`);        params.push(category_id); }
  if (payment_method_id) { where.push(`t.payment_method_id = ?`);  params.push(payment_method_id); }
  if (q)                 { where.push(`(t.name LIKE ? OR t.memo LIKE ?)`); params.push(`%${q}%`, `%${q}%`); }

  const W = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM transactions t ${W}`).get(...params);
  const offset    = (Number(page) - 1) * Number(limit);
  const data      = db.prepare(
    `SELECT ${SELECT} FROM transactions t ${JOIN} ${W} ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(limit), offset);

  res.json({ total, page: Number(page), limit: Number(limit), data });
});

// GET /api/transactions/summary?year=&month=
router.get('/summary', (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year, month 필요' });

  const ym = `${year}-${String(month).padStart(2, '0')}`;
  const row = db.prepare(`
    SELECT
      SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
    FROM transactions
    WHERE strftime('%Y-%m', date) = ?
  `).get(ym);

  res.json({ income: row.income || 0, expense: row.expense || 0 });
});

// GET /api/transactions/by-category?year=&month=&type=
router.get('/by-category', (req, res) => {
  const { year, month, type } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year, month 필요' });

  const ym = `${year}-${String(month).padStart(2, '0')}`;
  const where = [`strftime('%Y-%m', t.date) = ?`];
  const params = [ym];

  if (type) { where.push(`t.type = ?`); params.push(type); }

  const rows = db.prepare(`
    SELECT
      c.id, c.name, c.icon, c.color,
      SUM(t.amount) AS total,
      COUNT(*)      AS count
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE ${where.join(' AND ')}
    GROUP BY t.category_id
    ORDER BY total DESC
  `).all(...params);

  res.json(rows);
});

// GET /api/transactions/monthly-trend?year=
router.get('/monthly-trend', (req, res) => {
  const { year } = req.query;
  if (!year) return res.status(400).json({ error: 'year 필요' });

  const rows = db.prepare(`
    SELECT
      CAST(strftime('%m', date) AS INTEGER) AS month,
      SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
    FROM transactions
    WHERE strftime('%Y', date) = ?
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month
  `).all(String(year));

  // 1~12월 빈 달도 포함
  const map = {};
  rows.forEach(r => { map[r.month] = r; });
  const result = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income:  map[i + 1]?.income  || 0,
    expense: map[i + 1]?.expense || 0,
  }));

  res.json(result);
});

// GET /api/transactions/daily?year=&month=
router.get('/daily', (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year, month 필요' });

  const ym = `${year}-${String(month).padStart(2, '0')}`;
  const rows = db.prepare(`
    SELECT
      CAST(strftime('%d', date) AS INTEGER) AS day,
      SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
    FROM transactions
    WHERE strftime('%Y-%m', date) = ?
    GROUP BY date
    ORDER BY day
  `).all(ym);

  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
  const map = {};
  rows.forEach(r => { map[r.day] = r; });
  const result = Array.from({ length: daysInMonth }, (_, i) => ({
    day:     i + 1,
    income:  map[i + 1]?.income  || 0,
    expense: map[i + 1]?.expense || 0,
  }));

  res.json(result);
});

// POST /api/transactions
router.post('/', (req, res) => {
  const { date, type, name, category_id, payment_method_id, amount, memo } = req.body;
  if (!date || !type || !name || !amount) return res.status(400).json({ error: '필수 항목 누락' });

  const result = db.prepare(`
    INSERT INTO transactions (date, type, name, category_id, payment_method_id, amount, memo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(date, type, name, category_id || null, payment_method_id || null, Number(amount), memo || '');

  const row = db.prepare(
    `SELECT ${SELECT} FROM transactions t ${JOIN} WHERE t.id = ?`
  ).get(result.lastInsertRowid);

  res.status(201).json(row);
});

// PUT /api/transactions/:id
router.put('/:id', (req, res) => {
  const { date, type, name, category_id, payment_method_id, amount, memo } = req.body;

  const result = db.prepare(`
    UPDATE transactions
    SET date=?, type=?, name=?, category_id=?, payment_method_id=?, amount=?, memo=?
    WHERE id=?
  `).run(date, type, name, category_id || null, payment_method_id || null, Number(amount), memo || '', req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: '없는 거래' });

  res.json(db.prepare(`SELECT ${SELECT} FROM transactions t ${JOIN} WHERE t.id = ?`).get(req.params.id));
});

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare(`DELETE FROM transactions WHERE id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '없는 거래' });
  res.json({ ok: true });
});

module.exports = router;
