require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/transactions',    require('./routes/transactions'));
app.use('/api/categories',      require('./routes/categories'));
app.use('/api/payment-methods', require('./routes/paymentMethods'));
app.use('/api/budgets',         require('./routes/budgets'));
app.use('/api/settings',        require('./routes/settings'));

// SPA fallback — HTML 페이지는 직접 라우팅
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`가계부 서버 실행 중 → http://localhost:${PORT}`);
});
