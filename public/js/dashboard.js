// ── 상태 ──────────────────────────────────────────────
const now = new Date();
let curYear  = now.getFullYear();
let curMonth = now.getMonth() + 1; // 1-indexed

let categories    = { expense: [], income: [] };
let paymentMethods = [];
let currentType   = 'expense';
let defaultIncome = {};
let txFilter      = 'all';
let selectedCatId = null;
let selectedPayId = null;
let _lastTrendData = null;
let _lastWeekDaily = null;
let txCache      = {}; // [변경] 최근 거래 캐시 (수정 모달용)
let editingId    = null; // [변경] 수정 중인 거래 ID
let editModalType = 'expense'; // [변경] 수정 모달 유형

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DAY_NAMES   = ['일','월','화','수','목','금','토'];
const BAR_COLORS  = ['#e67e22','#8e44ad','#2980b9','#16a085','#27ae60','#c0392b','#d35400','#7f8c8d'];

// ── 초기화 ────────────────────────────────────────────
async function init() {
  updateMonthLabel();
  await Promise.all([loadCategories(), loadPaymentMethods(), loadDefaultIncome()]);
  renderCatGrid(currentType);
  document.getElementById('dateInput').value = now.toISOString().split('T')[0];
  await loadAll();
}

async function loadAll() {
  await Promise.all([
    loadSummary(),
    loadMonthlyTrend(),
    loadWeeklyChart(),
    loadBreakdown(),
    loadRecentTx(),
  ]);
}

// ── 월 네비게이션 ──────────────────────────────────────
function changeMonth(d) {
  curMonth += d;
  if (curMonth < 1)  { curMonth = 12; curYear--; }
  if (curMonth > 12) { curMonth = 1;  curYear++; }
  updateMonthLabel();
  loadAll();
}

function updateMonthLabel() {
  document.getElementById('monthLabel').textContent    = `${curYear}년 ${MONTH_NAMES[curMonth - 1]}`;
  document.getElementById('pageSubtitle').textContent  = `${curYear}년 ${MONTH_NAMES[curMonth - 1]} 지출 현황`;
  document.getElementById('weekChartLabel').textContent = `${curMonth}월`;
}

// ── 요약 카드 ──────────────────────────────────────────
async function loadSummary() {
  const s = await API.transactions.summary(curYear, curMonth);
  const balance = s.income - s.expense;

  document.getElementById('cardIncome').textContent  = '+' + fmt(s.income);
  document.getElementById('cardExpense').textContent = '-' + fmt(s.expense);

  const balEl = document.getElementById('cardBalance');
  balEl.textContent = (balance >= 0 ? '+' : '-') + fmt(Math.abs(balance));
  balEl.style.color = balance >= 0 ? 'var(--income)' : 'var(--expense)';

  const savingsRate = s.income > 0 ? Math.round((balance / s.income) * 100) : 0;
  document.getElementById('cardBalanceSub').textContent = `저축률 ${savingsRate}%`;

  // 예산 대비 %
  try {
    const budget = await API.budgets.get(curYear, curMonth);
    if (budget.amount > 0) {
      const pct = Math.round((s.expense / budget.amount) * 100);
      document.getElementById('cardExpenseSub').textContent = `예산의 ${pct}% 사용`;
    }
  } catch {}
}

// ── 월별 트렌드 차트 ──────────────────────────────────
async function loadMonthlyTrend() {
  const thisYear = await API.transactions.monthlyTrend(curYear);
  let combined = thisYear.slice(0, curMonth);
  if (combined.length < 6) {
    const prevYear = await API.transactions.monthlyTrend(curYear - 1);
    const needed = 6 - combined.length;
    combined = [...prevYear.slice(-needed), ...combined];
  }
  _lastTrendData = combined;
  drawMonthChart(_lastTrendData);
}

function drawMonthChart(data) {
  const canvas = document.getElementById('monthChart');
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth - 48;
  const cssH = 200;

  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const recent = data.slice(-6);
  const padL = 48, padR = 12, padT = 16, padB = 28;
  const cW = cssW - padL - padR;
  const cH = cssH - padT - padB;
  const maxVal = Math.max(...recent.map(d => Math.max(d.income, d.expense)), 1) * 1.15;
  const steps  = 4;

  for (let i = 0; i <= steps; i++) {
    const y = padT + cH - (cH / steps) * i;
    ctx.strokeStyle = '#e8e8e5'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cW, y); ctx.stroke();
    ctx.fillStyle = '#9a9a95';
    ctx.font = `10px -apple-system, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(fmtY((maxVal / steps) * i), padL - 6, y + 3.5);
  }

  const groupW = cW / recent.length;
  const barW   = Math.min(groupW * 0.26, 18);
  const gap    = 3;

  recent.forEach((d, i) => {
    const cx = padL + groupW * i + groupW / 2;
    const incH = (d.income  / maxVal) * cH;
    const expH = (d.expense / maxVal) * cH;

    ctx.fillStyle = 'rgba(45,122,79,.80)';
    ctx.beginPath();
    ctx.roundRect(cx - barW - gap / 2, padT + cH - incH, barW, incH, [3,3,0,0]);
    ctx.fill();

    ctx.fillStyle = 'rgba(192,57,43,.75)';
    ctx.beginPath();
    ctx.roundRect(cx + gap / 2, padT + cH - expH, barW, expH, [3,3,0,0]);
    ctx.fill();

    const isLast = i === recent.length - 1;
    ctx.fillStyle  = isLast ? '#1a1a1a' : '#9a9a95';
    ctx.font       = `${isLast ? 'bold ' : ''}10px -apple-system, sans-serif`;
    ctx.textAlign  = 'center';
    ctx.fillText(MONTH_NAMES[d.month - 1], cx, padT + cH + 18);
  });
}

// ── 주차별 차트 ────────────────────────────────────────
async function loadWeeklyChart() {
  _lastWeekDaily = await API.transactions.daily(curYear, curMonth);
  const weekData = buildWeekData(_lastWeekDaily, curYear, curMonth);
  drawWeekChart(weekData);
  renderWeekSummary(weekData);
}

function buildWeekData(daily, year, month) {
  const weeks = [];
  const daysInMonth = daily.length;
  let weekNum = 0, weekStart = 1;

  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month - 1, day).getDay();
    if (day > 1 && dow === 0) { weekNum++; weekStart = day; }
    if (!weeks[weekNum]) weeks[weekNum] = { income: 0, expense: 0, start: weekStart, end: day };
    const d = daily[day - 1];
    weeks[weekNum].income  += d.income;
    weeks[weekNum].expense += d.expense;
    weeks[weekNum].end      = day;
  }

  return weeks.map((w, i) => ({
    label:   `${i + 1}주\n${month}/${w.start}~${month}/${w.end}`,
    days:    `${month}/${w.start} ~ ${month}/${w.end}`,
    income:  w.income,
    expense: w.expense,
  }));
}

function drawWeekChart(weekData) {
  const canvas = document.getElementById('weekChart');
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth - 48;
  const cssH = 180;

  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const padL = 48, padR = 12, padT = 16, padB = 36;
  const cW = cssW - padL - padR;
  const cH = cssH - padT - padB;
  const maxVal = Math.max(...weekData.map(d => Math.max(d.income, d.expense)), 1) * 1.15;
  const steps  = 4;

  for (let i = 0; i <= steps; i++) {
    const y = padT + cH - (cH / steps) * i;
    ctx.strokeStyle = '#e8e8e5'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cW, y); ctx.stroke();
    ctx.fillStyle = '#9a9a95';
    ctx.font = `10px -apple-system, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(fmtY((maxVal / steps) * i), padL - 6, y + 3.5);
  }

  const groupW   = cW / weekData.length;
  const point    = (d, i) => ({ cx: padL + groupW * i + groupW / 2, y: padT + cH - (d.expense / maxVal) * cH });
  const pointInc = (d, i) => ({ cx: padL + groupW * i + groupW / 2, y: padT + cH - (d.income  / maxVal) * cH });

  // Income area fill
  ctx.beginPath();
  weekData.forEach((d, i) => { const p = pointInc(d, i); i === 0 ? ctx.moveTo(p.cx, p.y) : ctx.lineTo(p.cx, p.y); });
  ctx.lineTo(pointInc(weekData[weekData.length - 1], weekData.length - 1).cx, padT + cH);
  ctx.lineTo(pointInc(weekData[0], 0).cx, padT + cH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(45,122,79,.08)';
  ctx.fill();

  // Income line
  ctx.beginPath();
  weekData.forEach((d, i) => { const p = pointInc(d, i); i === 0 ? ctx.moveTo(p.cx, p.y) : ctx.lineTo(p.cx, p.y); });
  ctx.strokeStyle = 'rgba(45,122,79,.8)'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

  // Income dots
  weekData.forEach((d, i) => {
    const p = pointInc(d, i);
    ctx.beginPath(); ctx.arc(p.cx, p.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#2d7a4f'; ctx.fill();
  });

  // Expense area fill
  ctx.beginPath();
  weekData.forEach((d, i) => {
    const p = point(d, i);
    i === 0 ? ctx.moveTo(p.cx, p.y) : ctx.lineTo(p.cx, p.y);
  });
  const last  = point(weekData[weekData.length - 1], weekData.length - 1);
  const first = point(weekData[0], 0);
  ctx.lineTo(last.cx, padT + cH);
  ctx.lineTo(first.cx, padT + cH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(192,57,43,.08)';
  ctx.fill();

  // Expense line
  ctx.beginPath();
  weekData.forEach((d, i) => { const p = point(d, i); i === 0 ? ctx.moveTo(p.cx, p.y) : ctx.lineTo(p.cx, p.y); });
  ctx.strokeStyle = 'rgba(192,57,43,.8)'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

  // Expense dots
  weekData.forEach((d, i) => {
    const p = point(d, i);
    ctx.beginPath(); ctx.arc(p.cx, p.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#c0392b'; ctx.fill();
  });

  // X labels
  weekData.forEach((d, i) => {
    const cx = padL + groupW * i + groupW / 2;
    const lines = d.label.split('\n');
    ctx.fillStyle = '#9a9a95'; ctx.font = `10px -apple-system, sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(lines[0], cx, padT + cH + 14);
    ctx.fillStyle = '#bbb'; ctx.font = `9px -apple-system, sans-serif`;
    ctx.fillText(lines[1], cx, padT + cH + 26);
  });
}

function renderWeekSummary(weekData) {
  document.getElementById('weekSummary').innerHTML = weekData.map((d, i) => `
    <div style="flex:1;padding:10px 12px;border-right:${i < weekData.length - 1 ? '1px solid var(--border)' : 'none'}">
      <div style="font-size:10px;font-weight:600;color:var(--text-muted);margin-bottom:6px">${d.days}</div>
      ${d.income > 0 ? `<div style="font-size:11px;color:var(--income);font-weight:600">+${fmtY(d.income)}</div>` : ''}
      <div style="font-size:11px;color:var(--expense);font-weight:600">-${fmtY(d.expense)}</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:3px">${d.income - d.expense >= 0 ? '+' : ''}${fmtY(d.income - d.expense)}</div>
    </div>
  `).join('');
}

// ── 카테고리 분해 ──────────────────────────────────────
async function loadBreakdown() {
  const data = await API.transactions.byCategory(curYear, curMonth, 'expense');
  const total = data.reduce((s, d) => s + d.total, 0);
  const el = document.getElementById('breakdownList');

  if (!data.length) {
    el.innerHTML = `<div class="empty-state">지출 내역이 없어요</div>`;
    return;
  }

  el.innerHTML = data.slice(0, 6).map((d, i) => {
    const pct = total > 0 ? Math.round((d.total / total) * 100) : 0;
    return `
      <div class="breakdown-item">
        <span class="breakdown-icon">${d.icon || '•'}</span>
        <span class="breakdown-name">${d.name || '미분류'}</span>
        <div class="breakdown-bar-wrap">
          <div class="breakdown-bar" style="width:${pct}%;background:${BAR_COLORS[i % BAR_COLORS.length]}"></div>
        </div>
        <span class="breakdown-amount">${fmt(d.total)}</span>
      </div>`;
  }).join('');
}

// ── 최근 거래 ──────────────────────────────────────────
async function loadRecentTx() {
  const params = { year: curYear, month: curMonth, limit: 20 };
  if (txFilter !== 'all') params.type = txFilter;
  const res = await API.transactions.list(params);
  renderRecentTx(res.data);
}

function renderRecentTx(txList) {
  const el = document.getElementById('recentTxList');
  if (!txList.length) {
    el.innerHTML = `<div class="empty-state">거래 내역이 없어요</div>`;
    return;
  }

  // [변경] 거래 데이터 캐시
  txCache = {};
  txList.forEach(t => { txCache[t.id] = t; });

  const groups = {};
  txList.forEach(t => { if (!groups[t.date]) groups[t.date] = []; groups[t.date].push(t); });

  el.innerHTML = Object.entries(groups).map(([date, items]) => {
    const d   = new Date(date + 'T00:00:00');
    const label = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}  ${DAY_NAMES[d.getDay()]}요일`;
    const rows = items.map(t => `
      <div class="transaction-item" onclick="openEditModal(${t.id})" style="cursor:pointer">
        <div class="tx-icon" style="background:${t.category_color || '#f5f5f5'}">${t.category_icon || '•'}</div>
        <div class="tx-info">
          <div class="tx-name">${t.name}</div>
          <div class="tx-category">${t.category_name || '미분류'}</div>
        </div>
        <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}</div>
      </div>`).join(''); // [변경] onclick 추가
    return `<div class="transaction-date-group"><div class="date-header">${label}</div>${rows}</div>`;
  }).join('');
}

function setTxFilter(btn, type) {
  txFilter = type;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadRecentTx();
}

// ── 카테고리/결제수단 로드 ─────────────────────────────
async function loadDefaultIncome() {
  const s = await API.settings.get();
  defaultIncome = {
    name:               s.default_income_name              || '',
    amount:             s.default_income_amount             || '',
    day:                Number(s.default_income_day)        || null,
    category_id:        s.default_income_category_id        || null,
    payment_method_id:  s.default_income_payment_method_id  || null,
  };
}

function applyDefaultIncome() {
  if (!defaultIncome.name && !defaultIncome.amount) {
    showToast('설정에서 기본 수입을 먼저 등록해주세요');
    return;
  }
  if (defaultIncome.amount) document.getElementById('amountInput').value = Number(defaultIncome.amount).toLocaleString('ko-KR');
  if (defaultIncome.name)   document.getElementById('descInput').value   = defaultIncome.name;
  if (defaultIncome.day) {
    const lastDay = new Date(curYear, curMonth, 0).getDate();
    const day = Math.min(defaultIncome.day, lastDay);
    document.getElementById('dateInput').value =
      `${curYear}-${String(curMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  if (defaultIncome.category_id) {
    const btn = document.querySelector(`#catGrid .cat-btn[data-id="${defaultIncome.category_id}"]`);
    if (btn) selectCat(btn);
  }
  if (defaultIncome.payment_method_id) {
    const btn = document.querySelector(`#payGrid .cat-btn[data-id="${defaultIncome.payment_method_id}"]`);
    if (btn) selectPay(btn);
  }
}

async function loadCategories() {
  const all = await API.categories.list();
  categories.expense = all.filter(c => c.type === 'expense');
  categories.income  = all.filter(c => c.type === 'income');
}

async function loadPaymentMethods() {
  paymentMethods = await API.paymentMethods.list();
}

function renderCatGrid(type) {
  const cats = categories[type] || [];
  const grid = document.getElementById('catGrid');
  grid.innerHTML = cats.map((c, i) => `
    <button class="cat-btn${i === 0 ? ' selected' : ''}" data-id="${c.id}" onclick="selectCat(this)">
      <span class="cat-icon">${c.icon}</span><span>${c.name}</span>
    </button>`).join('');
  selectedCatId = cats[0]?.id ?? null;

  const payGrid = document.getElementById('payGrid');
  payGrid.innerHTML = paymentMethods.map((p, i) => `
    <button class="cat-btn${i === 0 ? ' selected' : ''}" data-id="${p.id}"
      style="flex:1" onclick="selectPay(this)">${p.name}</button>`).join('');
  selectedPayId = paymentMethods[0]?.id ?? null;

  document.getElementById('catLabel').textContent  = type === 'expense' ? '카테고리' : '수입 분류';
  document.getElementById('payLabel').textContent  = type === 'expense' ? '결제수단' : '입금수단';
  document.getElementById('descInput').placeholder = type === 'expense' ? '거래 내용 입력' : '수입 내용 (예: 3월 급여)';
}

function setType(type) {
  currentType = type;
  document.getElementById('btnExpense').classList.toggle('active', type === 'expense');
  document.getElementById('btnIncome').classList.toggle('active', type === 'income');
  document.getElementById('defaultIncomeBtn').style.display = type === 'income' ? '' : 'none';
  renderCatGrid(type);
}

function selectCat(el) {
  document.getElementById('catGrid').querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedCatId = Number(el.dataset.id);
}

function selectPay(el) {
  document.getElementById('payGrid').querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedPayId = Number(el.dataset.id);
}

// ── 거래 추가 ──────────────────────────────────────────
async function addTransaction() {
  const amount = Number(document.getElementById('amountInput').value.replace(/,/g, ''));
  const name   = document.getElementById('descInput').value.trim();
  const date   = document.getElementById('dateInput').value;
  const memo   = document.getElementById('memoInput').value.trim();

  if (!amount || !name || !date) { showToast('금액, 내용, 날짜를 입력해주세요'); return; }

  try {
    await API.transactions.create({
      date, type: currentType, name, amount,
      category_id: selectedCatId,
      payment_method_id: selectedPayId,
      memo,
    });
    document.getElementById('amountInput').value = '';
    document.getElementById('descInput').value   = '';
    document.getElementById('memoInput').value   = '';
    showToast('거래를 추가했어요');
    if (typeof closeAddPanel === 'function') closeAddPanel();
    await loadAll();
  } catch (e) {
    showToast(e.error || '추가에 실패했어요');
  }
}

// ── 유틸 ──────────────────────────────────────────────
function fmt(n)  { return Number(n).toLocaleString('ko-KR') + '원'; }
function formatAmountInput(el) {
  const raw = el.value.replace(/[^0-9]/g, '');
  el.value = raw ? Number(raw).toLocaleString('ko-KR') : '';
}
function fmtY(n) {
  const a = Math.abs(n);
  if (a >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (a >= 10000)     return Math.round(n / 10000) + '만';
  return n.toLocaleString('ko-KR');
}

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// [변경] ── 수정 모달 ──────────────────────────────────────
function openEditModal(id) {
  const t = txCache[id];
  if (!t) return;

  editingId = id;
  setEditModalType(t.type);
  document.getElementById('mDate').value   = t.date;
  document.getElementById('mAmount').value = Number(t.amount).toLocaleString('ko-KR');
  document.getElementById('mDesc').value   = t.name;
  document.getElementById('mMemo').value   = t.memo || '';

  const catEl = document.getElementById('mCat');
  const payEl = document.getElementById('mPay');
  if (t.category_id)       { for (const o of catEl.options) if (Number(o.value) === t.category_id)       { o.selected = true; break; } }
  if (t.payment_method_id) { for (const o of payEl.options) if (Number(o.value) === t.payment_method_id) { o.selected = true; break; } }

  document.getElementById('editModalOverlay').classList.add('open');
}

function closeEditModal() {
  const overlay = document.getElementById('editModalOverlay');
  const modal = overlay.querySelector('.modal');
  if (!overlay.classList.contains('open')) return;
  modal.classList.add('closing');
  setTimeout(function() {
    overlay.classList.remove('open');
    modal.classList.remove('closing');
    editingId = null;
  }, 240);
}

let _editOverlayMouseDown = false;
function handleEditOverlayMouseDown(e) { _editOverlayMouseDown = e.target === document.getElementById('editModalOverlay'); }
function handleEditOverlayClick(e) { if (e.target === document.getElementById('editModalOverlay') && _editOverlayMouseDown) closeEditModal(); }

function setEditModalType(type) {
  editModalType = type;
  document.getElementById('mBtnExpense').classList.toggle('active', type === 'expense');
  document.getElementById('mBtnIncome').classList.toggle('active', type === 'income');

  const cats = categories[type] || [];
  document.getElementById('mCat').innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('mPay').innerHTML = paymentMethods.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  document.getElementById('mCatLabel').textContent = type === 'expense' ? '카테고리' : '수입 분류';
  document.getElementById('mPayLabel').textContent = type === 'expense' ? '결제수단' : '입금수단';
}

async function submitEditTransaction() {
  const amount = Number(document.getElementById('mAmount').value.replace(/,/g, ''));
  const name   = document.getElementById('mDesc').value.trim();
  const date   = document.getElementById('mDate').value;
  const catId  = document.getElementById('mCat').value;
  const payId  = document.getElementById('mPay').value;
  const memo   = document.getElementById('mMemo').value.trim();

  if (!amount || !name || !date) { showToast('금액, 내용, 날짜를 입력해주세요'); return; }

  try {
    await API.transactions.update(editingId, {
      date, type: editModalType, name, amount,
      category_id: catId || null,
      payment_method_id: payId || null,
      memo,
    });
    showToast('수정했어요');
    closeEditModal();
    await loadAll();
  } catch (err) {
    showToast(err.error || '수정에 실패했어요');
  }
}

let _resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    if (_lastTrendData) drawMonthChart(_lastTrendData);
    if (_lastWeekDaily) drawWeekChart(buildWeekData(_lastWeekDaily, curYear, curMonth));
  }, 150);
});

init();
