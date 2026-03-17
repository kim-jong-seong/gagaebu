// ── 상태 ──────────────────────────────────────────────
const now = new Date();
let currentPeriod = 'year';
let currentYear   = now.getFullYear();
let currentMonth  = now.getMonth() + 1;
let _lastTrendData = null;
let _lastDailyData = null;

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DAY_NAMES   = ['일','월','화','수','목','금','토'];
const DONUT_COLORS = ['#e67e22','#8e44ad','#2980b9','#16a085','#27ae60','#e74c3c','#f39c12','#7f8c8d','#95a5a6'];

// ── 초기화 ────────────────────────────────────────────
function init() { render(); }

function setPeriod(btn, period) {
  currentPeriod = period;
  document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function changeRange(d) {
  if (currentPeriod === 'year') {
    currentYear += d;
  } else {
    currentMonth += d;
    if (currentMonth < 1)  { currentMonth = 12; currentYear--; }
    if (currentMonth > 12) { currentMonth = 1;  currentYear++; }
  }
  render();
}

async function render() {
  if (currentPeriod === 'year') await renderYear();
  else await renderMonth();
}

// ── 연간 뷰 ───────────────────────────────────────────
async function renderYear() {
  document.getElementById('rangeLabel').textContent  = `${currentYear}년`;
  document.getElementById('headerSub').textContent   = `${currentYear}년 연간 리포트`;
  document.getElementById('lIncome').textContent     = '연간 수입';
  document.getElementById('lExpense').textContent    = '연간 지출';
  document.getElementById('trendTitle').textContent  = '월별 수입·지출';
  document.getElementById('momTitle').textContent    = '전년도 대비 (월별)';
  document.getElementById('savingsTitle').textContent = '월별 저축률';
  document.getElementById('secSavings').style.display = '';
  document.getElementById('secDow').style.display    = 'none';
  document.getElementById('secWeeks').style.display  = 'none';

  const [trend, prevTrend] = await Promise.all([
    API.transactions.monthlyTrend(currentYear),
    API.transactions.monthlyTrend(currentYear - 1),
  ]);

  const totalIncome  = trend.reduce((s, d) => s + d.income,  0);
  const totalExpense = trend.reduce((s, d) => s + d.expense, 0);
  const saving       = totalIncome - totalExpense;
  const rate         = totalIncome > 0 ? Math.round((saving / totalIncome) * 100) : 0;

  document.getElementById('sumIncome').textContent  = fmtShort(totalIncome);
  document.getElementById('sumExpense').textContent = fmtShort(totalExpense);
  document.getElementById('sumSaving').textContent  = fmtShort(saving);
  document.getElementById('sumRate').textContent    = rate + '%';

  _lastTrendData = trend; _lastDailyData = null;
  drawTrendChart(trend);
  drawSavingsRate(trend);
  drawDonut(currentYear, null);
  drawMoM(trend, prevTrend, 'year');
}

// ── 월별 뷰 ───────────────────────────────────────────
async function renderMonth() {
  document.getElementById('rangeLabel').textContent  = `${currentYear}년 ${MONTH_NAMES[currentMonth - 1]}`;
  document.getElementById('headerSub').textContent   = `${currentYear}년 ${MONTH_NAMES[currentMonth - 1]} 리포트`;
  document.getElementById('lIncome').textContent     = '월 수입';
  document.getElementById('lExpense').textContent    = '월 지출';
  document.getElementById('trendTitle').textContent  = '일별 지출';
  document.getElementById('momTitle').textContent    = '전월 대비';
  document.getElementById('secSavings').style.display = 'none';
  document.getElementById('secDow').style.display    = 'none';
  document.getElementById('secWeeks').style.display  = '';

  let prevMonth = currentMonth - 1, prevYear = currentYear;
  if (prevMonth < 1) { prevMonth = 12; prevYear--; }

  const [summary, prevSummary, daily] = await Promise.all([
    API.transactions.summary(currentYear, currentMonth),
    API.transactions.summary(prevYear, prevMonth),
    API.transactions.daily(currentYear, currentMonth),
  ]);

  const saving = summary.income - summary.expense;
  const rate   = summary.income > 0 ? Math.round((saving / summary.income) * 100) : 0;

  document.getElementById('sumIncome').textContent  = fmtShort(summary.income);
  document.getElementById('sumExpense').textContent = fmtShort(summary.expense);
  document.getElementById('sumSaving').textContent  = fmtShort(saving);
  document.getElementById('sumRate').textContent    = rate + '%';

  _lastDailyData = daily; _lastTrendData = null;
  drawDailyChart(daily);
  drawWeekRows(daily);
  drawDonut(currentYear, currentMonth);
  drawMoMMonth(summary, prevSummary, prevMonth, prevYear);
}

// ── 차트: 월별 트렌드 (연간) ─────────────────────────
function drawTrendChart(data) {
  const canvas = document.getElementById('trendChart');
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth - 48;
  const cssH = 200;
  canvas.width  = cssW * dpr; canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const padL = 52, padR = 12, padT = 16, padB = 28;
  const cW = cssW - padL - padR, cH = cssH - padT - padB;
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1) * 1.15;
  const steps  = 4;

  for (let i = 0; i <= steps; i++) {
    const y = padT + cH - (cH / steps) * i;
    ctx.strokeStyle = '#e8e8e5'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cW, y); ctx.stroke();
    ctx.fillStyle = '#9a9a95'; ctx.font = `10px sans-serif`; ctx.textAlign = 'right';
    ctx.fillText(fmtY((maxVal / steps) * i), padL - 6, y + 3.5);
  }

  const groupW = cW / data.length;
  const barW   = Math.min(groupW * 0.26, 14);
  const gap    = 3;

  data.forEach((d, i) => {
    const cx   = padL + groupW * i + groupW / 2;
    const incH = (d.income  / maxVal) * cH;
    const expH = (d.expense / maxVal) * cH;

    ctx.fillStyle = 'rgba(45,122,79,.8)';
    ctx.beginPath(); ctx.roundRect(cx - barW - gap / 2, padT + cH - incH, barW, incH, [3,3,0,0]); ctx.fill();

    ctx.fillStyle = 'rgba(192,57,43,.75)';
    ctx.beginPath(); ctx.roundRect(cx + gap / 2, padT + cH - expH, barW, expH, [3,3,0,0]); ctx.fill();

    ctx.fillStyle = '#9a9a95'; ctx.font = `10px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(MONTH_NAMES[d.month - 1], cx, padT + cH + 18);
  });
}

// ── 차트: 일별 지출 (월별) ────────────────────────────
function drawDailyChart(daily) {
  const canvas = document.getElementById('trendChart');
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth - 48;
  const cssH = 120;
  canvas.width  = cssW * dpr; canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const padL = 8, padR = 8, padT = 8, padB = 18;
  const cW = cssW - padL - padR, cH = cssH - padT - padB;
  const maxVal = Math.max(...daily.map(d => d.expense), 1);
  const barW   = Math.max((cW / daily.length) - 2, 2);

  const todayDate = new Date().getDate();
  const isCurrentMonth = new Date().getFullYear() === currentYear && new Date().getMonth() + 1 === currentMonth;

  daily.forEach((d, i) => {
    const day  = i + 1;
    const x    = padL + (cW / daily.length) * i + (cW / daily.length - barW) / 2;
    const barH = d.expense > 0 ? Math.max((d.expense / maxVal) * cH, 3) : 0;
    const y    = padT + cH - barH;

    ctx.fillStyle = isCurrentMonth && day === todayDate ? 'var(--accent)' : 'rgba(192,57,43,.65)';
    if (barH > 0) {
      ctx.beginPath(); ctx.roundRect(x, y, barW, barH, [2,2,0,0]); ctx.fill();
    }

    if (day % 5 === 0 || day === 1) {
      ctx.fillStyle = '#9a9a95'; ctx.font = `9px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(day, padL + (cW / daily.length) * i + (cW / daily.length) / 2, padT + cH + 14);
    }
  });
}

// ── 차트: 저축률 바 ────────────────────────────────────
function drawSavingsRate(data) {
  const el = document.getElementById('savingsRow');
  const months = data.filter(d => d.income > 0);
  if (!months.length) { el.innerHTML = '<div style="color:var(--text-muted);font-size:12px">데이터 없음</div>'; return; }

  const avg = months.reduce((s, d) => {
    const r = d.income > 0 ? Math.round(((d.income - d.expense) / d.income) * 100) : 0;
    return s + r;
  }, 0) / months.length;
  document.getElementById('savingsSub').textContent = `평균 ${Math.round(avg)}%`;

  el.innerHTML = months.map(d => {
    const rate  = d.income > 0 ? Math.max(Math.round(((d.income - d.expense) / d.income) * 100), 0) : 0;
    const color = rate >= 30 ? 'var(--income)' : rate >= 10 ? 'var(--warn)' : 'var(--expense)';
    return `<div class="savings-bar-row">
      <span class="savings-month">${MONTH_NAMES[d.month - 1]}</span>
      <div class="savings-bar-wrap"><div class="savings-bar" style="width:${rate}%;background:${color}"></div></div>
      <span class="savings-pct" style="color:${color}">${rate}%</span>
    </div>`;
  }).join('');
}

// ── 차트: 주차별 (월별) ────────────────────────────────
function drawWeekRows(daily) {
  const weeks = [];
  let weekIdx = 0;
  daily.forEach((d, i) => {
    const day = i + 1;
    const dow = new Date(currentYear, currentMonth - 1, day).getDay();
    if (day > 1 && dow === 0) weekIdx++;
    if (!weeks[weekIdx]) weeks[weekIdx] = { expense: 0, start: day, end: day };
    weeks[weekIdx].expense += d.expense;
    weeks[weekIdx].end = day;
  });

  const maxExp = Math.max(...weeks.map(w => w.expense), 1);
  document.getElementById('weekRows').innerHTML = weeks.map((w, i) => `
    <div class="week-row">
      <span class="week-label">${i + 1}주차</span>
      <div class="week-bar-wrap"><div class="week-bar" style="width:${(w.expense / maxExp) * 100}%"></div></div>
      <span class="week-amount">${fmtShort(w.expense)}</span>
    </div>`).join('');
}

// ── 차트: 도넛 ────────────────────────────────────────
async function drawDonut(year, month) {
  const params = month ? { year, month, type: 'expense' } : undefined;
  let catRows;
  if (month) {
    catRows = await API.transactions.byCategory(year, month, 'expense');
  } else {
    // 연간: 각 달 집계
    const months = await Promise.all(
      Array.from({ length: 12 }, (_, i) => API.transactions.byCategory(year, i + 1, 'expense'))
    );
    const map = {};
    months.flat().forEach(c => {
      const key = c.id;
      if (!map[key]) map[key] = { ...c, total: 0 };
      map[key].total += c.total;
    });
    catRows = Object.values(map).sort((a, b) => b.total - a.total);
  }

  const total = catRows.reduce((s, c) => s + c.total, 0);
  document.getElementById('donutTotal').textContent = fmtShort(total);

  // Draw donut
  const canvas = document.getElementById('donutChart');
  const size   = 160;
  const dpr    = window.devicePixelRatio || 1;
  canvas.width  = size * dpr; canvas.height = size * dpr;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2, r = 68, innerR = 45;
  let angle = -Math.PI / 2;

  if (!total) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'var(--border)'; ctx.lineWidth = r - innerR; ctx.stroke();
  } else {
    catRows.forEach((c, i) => {
      const slice = (c.total / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = DONUT_COLORS[i % DONUT_COLORS.length];
      ctx.fill();
      angle += slice;
    });
    ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
  }

  // Category list
  document.getElementById('catList').innerHTML = catRows.slice(0, 6).map((c, i) => `
    <div class="cat-row">
      <div class="cat-dot" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></div>
      <span class="cat-name">${c.name || '미분류'}</span>
      <span class="cat-amount">${fmtShort(c.total)}</span>
      <span class="cat-pct">${total > 0 ? Math.round((c.total / total) * 100) : 0}%</span>
    </div>`).join('');
}

// ── 전년도 대비 (연간) ────────────────────────────────
function drawMoM(curr, prev, mode) {
  const maxVal = Math.max(...curr.map(d => d.expense), ...prev.map(d => d.expense), 1);
  document.getElementById('momGrid').innerHTML = curr.map((d, i) => {
    const p    = prev[i]?.expense || 0;
    const diff = d.expense - p;
    return `<div class="mom-row">
      <span class="mom-label">${MONTH_NAMES[d.month - 1]}</span>
      <div class="mom-bars">
        <div class="mom-bar-item prev" style="height:${(p / maxVal) * 32}px"></div>
        <div class="mom-bar-item curr" style="height:${(d.expense / maxVal) * 32}px"></div>
      </div>
      <span class="mom-diff${diff > 0 ? ' up' : diff < 0 ? ' dn' : ''}">${diff > 0 ? '+' : ''}${fmtShort(diff)}</span>
    </div>`;
  }).join('');
}

// ── 전월 대비 (월별) ──────────────────────────────────
function drawMoMMonth(curr, prev, prevMonth, prevYear) {
  const cats = [
    { label: '수입', curr: curr.income,  prev: prev.income },
    { label: '지출', curr: curr.expense, prev: prev.expense },
    { label: '저축', curr: curr.income - curr.expense, prev: prev.income - prev.expense },
  ];
  const maxVal = Math.max(...cats.map(c => Math.max(c.curr, c.prev, 0)), 1);
  document.getElementById('momTitle').textContent = `전월 대비 (${prevYear}년 ${MONTH_NAMES[prevMonth - 1]})`;
  document.getElementById('momGrid').innerHTML = cats.map(c => {
    const diff = c.curr - c.prev;
    return `<div class="mom-row">
      <span class="mom-label">${c.label}</span>
      <div class="mom-bars">
        <div class="mom-bar-item prev" style="height:${(Math.max(c.prev, 0) / maxVal) * 32}px"></div>
        <div class="mom-bar-item curr" style="height:${(Math.max(c.curr, 0) / maxVal) * 32}px"></div>
      </div>
      <span class="mom-diff${diff > 0 ? ' up' : diff < 0 ? ' dn' : ''}">${diff > 0 ? '+' : ''}${fmtShort(diff)}</span>
    </div>`;
  }).join('');
}

// ── 유틸 ──────────────────────────────────────────────
function fmtShort(n) {
  const a = Math.abs(n);
  if (a >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (a >= 10000)     return (n / 10000).toFixed(0) + '만';
  return n.toLocaleString();
}
function fmtY(n) { return (n / 10000).toFixed(0) + '만'; }

let _resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    if (_lastTrendData) { drawTrendChart(_lastTrendData); drawSavingsRate(_lastTrendData); }
    if (_lastDailyData) { drawDailyChart(_lastDailyData); drawWeekRows(_lastDailyData); }
  }, 150);
});
init();
