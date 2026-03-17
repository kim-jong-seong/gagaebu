const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { type } = req.query;
  const rows = type
    ? db.prepare(`SELECT * FROM categories WHERE type = ? ORDER BY sort_order, id`).all(type)
    : db.prepare(`SELECT * FROM categories ORDER BY type, sort_order, id`).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { type, name, icon, color, sort_order } = req.body;
  if (!type || !name) return res.status(400).json({ error: '필수 항목 누락' });

  const result = db.prepare(`
    INSERT INTO categories (type, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)
  `).run(type, name, icon || '•', color || '#f5f5f5', sort_order ?? 0);

  res.status(201).json(db.prepare(`SELECT * FROM categories WHERE id = ?`).get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, icon, color, sort_order } = req.body;
  const result = db.prepare(`
    UPDATE categories SET name=?, icon=?, color=?, sort_order=? WHERE id=?
  `).run(name, icon, color, sort_order, req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: '없는 카테고리' });
  res.json(db.prepare(`SELECT * FROM categories WHERE id = ?`).get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const cat = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(req.params.id);
  if (!cat) return res.status(404).json({ error: '없는 카테고리' });
  if (cat.is_default && cat.name === '기타') return res.status(400).json({ error: '"기타" 카테고리는 삭제할 수 없어요' });

  db.prepare(`DELETE FROM categories WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
