const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  res.json(db.prepare(`SELECT * FROM payment_methods ORDER BY sort_order, id`).all());
});

router.post('/', (req, res) => {
  const { name, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: '이름 필요' });
  try {
    const result = db.prepare(`INSERT INTO payment_methods (name, sort_order) VALUES (?, ?)`).run(name, sort_order ?? 0);
    res.status(201).json(db.prepare(`SELECT * FROM payment_methods WHERE id = ?`).get(result.lastInsertRowid));
  } catch {
    res.status(400).json({ error: '이미 존재하는 결제수단' });
  }
});

router.put('/:id', (req, res) => {
  const { name, sort_order } = req.body;
  const result = db.prepare(`UPDATE payment_methods SET name=?, sort_order=? WHERE id=?`).run(name, sort_order, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '없는 결제수단' });
  res.json(db.prepare(`SELECT * FROM payment_methods WHERE id = ?`).get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const pm = db.prepare(`SELECT * FROM payment_methods WHERE id = ?`).get(req.params.id);
  if (!pm) return res.status(404).json({ error: '없는 결제수단' });
  if (pm.is_default) return res.status(400).json({ error: '기본 결제수단은 삭제할 수 없어요' });

  db.prepare(`DELETE FROM payment_methods WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
