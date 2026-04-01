require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.use('/api/transactions',    require('./routes/transactions'));
app.use('/api/categories',      require('./routes/categories'));
app.use('/api/payment-methods', require('./routes/paymentMethods'));
app.use('/api/budgets',         require('./routes/budgets'));
app.use('/api/settings',        require('./routes/settings'));

// DB 파일 다운로드
app.get('/api/database/download', (req, res) => {
  const dbPath = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(__dirname, '../data/gagaebu.db');
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  res.download(dbPath, `gagaebu_${dateStr}.db`, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'DB 파일 다운로드에 실패했습니다' });
    }
  });
});

// SPA fallback — HTML 페이지는 직접 라우팅
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`가계부 서버 실행 중 → http://localhost:${PORT}`);
});
