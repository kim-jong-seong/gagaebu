// ── 상태 ──────────────────────────────────────────────
const now = new Date();
let curYear  = now.getFullYear();
let curMonth = now.getMonth() + 1; // 1-indexed

let baseBudget       = 0;
let carryover        = 0;
let carryoverEnabled = true;
let carryoverCardOpen = false;
let spent            = 0;
let income           = 0;
let dailyData        = [];
let catData          = [];
let settings         = {};

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const CAT_COLORS  = ['#e67e22','#8e44ad','#2980b9','#16a085','#27ae60','#e74c3c','#f39c12','#7f8c8d'];

// ── 초기화 ────────────────────────────────────────────
async function init() {
  settings = await API.settings.get();
  carryoverEnabled = settings.carryover_enabled === 'true';
  updateMonthLabel();
  await loadAll();
}

async function loadAll() {
  await Promise.all([loadBudget(), loadSpent(), loadDailyData(), loadCatData()]);
  render();
}

// ── 데이터 로드 ────────────────────────────────────────
async function loadBudget() {
  const b = await API.budgets.get(curYear, curMonth);
  baseBudget = b.amount;
}

async function loadSpent() {
  const s = await API.transactions.summary(curYear, curMonth);
  spent  = s.expense;
  income = s.income;
}

async function loadDailyData() {
  dailyData = await API.transactions.daily(curYear, curMonth);
}

async function loadCatData() {
  catData = await API.transactions.byCategory(curYear, curMonth, 'expense');
}

// ── 이월 계산 ──────────────────────────────────────────
let _carryoverMonths = []; // { year, month, budget, spent } — calcCarryover에서 채워짐

async function calcCarryover() {
  if (!carryoverEnabled) { carryover = 0; _carryoverMonths = []; return; }

  const raw = Number(settings.carryover_max_months);
  const maxMonths = raw > 0 ? raw : 12; // 0 = '제한 없음' → 최대 12개월
  const fetches = [];
  for (let i = maxMonths; i >= 1; i--) {
    let m = curMonth - i, y = curYear;
    if (m < 1) { m += 12; y--; }
    fetches.push({ y, m });
  }

  const results = await Promise.all(
    fetches.map(({ y, m }) => API.transactions.summary(y, m))
  );

  _carryoverMonths = results.map((s, idx) => ({
    year: fetches[idx].y, month: fetches[idx].m,
    income: s.income, spent: s.expense,
  }));
  // 이월 = 실제 수입 - 지출 (거래 없는 달은 자동으로 0)
  carryover = _carryoverMonths.reduce((t, m) => t + Math.max(m.income - m.spent, 0), 0);
}

// ── 렌더링 ────────────────────────────────────────────
async function render() {
  await calcCarryover();

  const effectiveCarryover = carryoverEnabled ? carryover : 0;

  // ── 영역 1: 예산 (지출 한도 기준) ──
  const budgetRemain = baseBudget - spent;
  const pct          = baseBudget > 0 ? Math.min((spent / baseBudget) * 100, 100) : 0;
  const level        = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'safe';

  document.getElementById('formulaBase').textContent = baseBudget.toLocaleString('ko-KR');

  const bar = document.getElementById('progressBar');
  bar.style.width = pct + '%';
  bar.className   = `progress-bar ${level}`;

  const pctEl = document.getElementById('progressPct');
  pctEl.textContent = Math.round(pct) + '%';
  pctEl.className   = `progress-pct ${level}`;
  document.getElementById('progressDetail').textContent = `${fmt(spent)} / ${fmt(baseBudget)}`;

  const statusMsg = document.getElementById('statusMsg');
  statusMsg.className   = `status-msg ${baseBudget === 0 ? 'no-budget' : level}`;
  statusMsg.textContent = baseBudget === 0
    ? '예산을 설정해주세요'
    : level === 'over' ? `⚠️ 예산을 ${fmt(Math.abs(budgetRemain))} 초과했어요`
    : level === 'warn' ? `⚡ 예산의 80%를 넘었어요. 남은 금액 ${fmt(budgetRemain)}`
    :                    `✅ 양호해요. 남은 예산 ${fmt(budgetRemain)}`;

  // ── 영역 2: 실제 자금 흐름 ──
  const balance = income + effectiveCarryover - spent;

  document.getElementById('mfIncome').textContent    = fmt(income);
  document.getElementById('mfCarryover').textContent = fmt(effectiveCarryover);
  document.getElementById('mfSpent').textContent     = fmt(spent);

  const balEl = document.getElementById('mfBalance');
  balEl.textContent = (balance < 0 ? '-' : '') + fmt(Math.abs(balance));
  balEl.style.color = balance >= 0 ? 'var(--income)' : 'var(--expense)';

  // 이월 컬럼 — 설정에서 off면 숨김
  const showCarryover = carryoverEnabled;
  document.getElementById('mfCarryoverStat').style.display = showCarryover ? '' : 'none';
  document.getElementById('mfSepPlus').style.display       = showCarryover ? '' : 'none';

  // 가이드 카드
  renderGuide(baseBudget, budgetRemain);

  // 일별 스트립
  renderDailyStrip();

  // 카테고리
  renderCats(baseBudget);

  // 이월 카드
  renderCarryoverCard();
}

function renderGuide(totalBudget, remain) {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === curYear && today.getMonth() + 1 === curMonth;
  const elapsed  = isCurrentMonth ? today.getDate() : new Date(curYear, curMonth, 0).getDate();
  const daysLeft = isCurrentMonth ? new Date(curYear, curMonth, 0).getDate() - elapsed : 0;
  const total    = new Date(curYear, curMonth, 0).getDate();

  const avgDaily  = elapsed > 0 ? Math.round(spent / elapsed) : 0;
  const perDay    = daysLeft > 0 && remain > 0 ? Math.round(remain / daysLeft) : 0;
  const forecast  = elapsed > 0 ? Math.round((spent / elapsed) * total) : 0;

  document.getElementById('guideDaily').textContent    = fmtShort(avgDaily);
  document.getElementById('guideDailySub').textContent = `${elapsed}일 기준`;
  document.getElementById('guidePerDay').textContent    = daysLeft > 0 ? fmtShort(perDay) : '—';
  document.getElementById('guidePerDaySub').textContent = daysLeft > 0 ? `남은 ${daysLeft}일` : '월 마감';
  document.getElementById('guideForecast').textContent  = fmtShort(forecast);
  const diff = forecast - totalBudget;
  document.getElementById('guideForecastSub').textContent =
    totalBudget > 0 ? (diff > 0 ? `예산 ${fmtShort(diff)} 초과 예상` : `예산 내 ${fmtShort(Math.abs(diff))} 여유`) : '';
}

function renderDailyStrip() {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === curYear && today.getMonth() + 1 === curMonth;
  const todayDate = isCurrentMonth ? today.getDate() : -1;
  const maxDay = Math.max(...dailyData.map(d => d.expense), 1);

  document.getElementById('stripLabel').textContent = `최대 ${fmtShort(maxDay)}`;

  document.getElementById('calendarStrip').innerHTML = dailyData.map((d, i) => {
    const day = i + 1;
    const h   = d.expense > 0 ? Math.max(Math.round((d.expense / maxDay) * 38), 2) : 0;
    const color = d.expense > 0 ? 'var(--expense)' : 'var(--border)';
    return `
      <div class="day-cell${day === todayDate ? ' day-today' : ''}">
        <div class="day-bar-col">
          <div class="day-bar" style="height:${h}px;background:${color};opacity:.75"></div>
        </div>
        <div class="day-num">${day}</div>
      </div>`;
  }).join('');
}

function renderCats(totalBudget) {
  if (!catData.length) {
    document.getElementById('catList').innerHTML = '<div style="color:var(--text-muted);font-size:13px">지출 내역이 없어요</div>';
    return;
  }
  const total = catData.reduce((s, c) => s + c.total, 0);
  document.getElementById('catList').innerHTML = catData.map((c, i) => {
    const pct    = total > 0 ? Math.round((c.total / total) * 100) : 0;
    const budPct = totalBudget > 0 ? Math.round((c.total / totalBudget) * 100) : 0;
    return `<div class="cat-row">
      <span class="cat-icon">${c.icon || '•'}</span>
      <span class="cat-name">${c.name || '미분류'}</span>
      <div class="cat-bar-wrap"><div class="cat-bar" style="width:${pct}%;background:${CAT_COLORS[i % CAT_COLORS.length]}"></div></div>
      <span class="cat-amount">${fmt(c.total)}</span>
      <span class="cat-pct">${budPct}%</span>
    </div>`;
  }).join('');
}

async function renderCarryoverCard() {
  const months = _carryoverMonths;
  const totalCarry = months.reduce((s, m) => s + Math.max(m.income - m.spent, 0), 0);
  document.getElementById('carryoverTotal').textContent = `총 이월 ${fmt(totalCarry)}`;

  // 거래가 있는 달만 표시
  const activMonths = months.filter(m => m.income > 0 || m.spent > 0);
  document.getElementById('carryoverHistory').innerHTML = activMonths.map((m, i) => {
    const remain = m.income - m.spent;
    const pct    = m.income > 0 ? Math.min(Math.round((m.spent / m.income) * 100), 100) : 0;
    return `
      <div class="co-month${i === activMonths.length - 1 ? ' co-current' : ''}">
        ${i < activMonths.length - 1 ? '<div class="co-arrow">›</div>' : ''}
        <div class="co-month-label">${m.year}년 ${MONTH_NAMES[m.month - 1]}</div>
        <div class="co-month-budget">수입 ${fmtShort(m.income)}</div>
        <div class="co-month-spent">지출 ${fmtShort(m.spent)}</div>
        <div class="co-month-remain${remain < 0 ? ' deficit' : ''}">${remain >= 0 ? '+' : ''}${fmtShort(remain)}</div>
        <div class="co-bar-wrap"><div class="co-bar" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

// ── 컨트롤 ────────────────────────────────────────────
function changeMonth(d) {
  curMonth += d;
  if (curMonth < 1)  { curMonth = 12; curYear--; }
  if (curMonth > 12) { curMonth = 1;  curYear++; }
  updateMonthLabel();
  loadAll();
}

function updateMonthLabel() {
  const label = `${curYear}년 ${MONTH_NAMES[curMonth - 1]}`;
  document.getElementById('monthLabel').textContent = label;
  document.getElementById('headerSub').textContent  = label;
}

function toggleCarryoverCard() {
  carryoverCardOpen = !carryoverCardOpen;
  document.getElementById('carryoverCard').classList.toggle('visible', carryoverCardOpen);
}


// ── 예산 편집 ──────────────────────────────────────────
function startEdit() {
  document.getElementById('displayMode').style.display = 'none';
  const editEl = document.getElementById('editMode');
  editEl.classList.add('visible');
  document.getElementById('heroInput').value = baseBudget;
  document.getElementById('heroInput').focus();
}

async function saveEdit() {
  const val = Number(document.getElementById('heroInput').value);
  if (!val || val < 0) { showToast('올바른 금액을 입력해주세요'); return; }
  baseBudget = val;
  await API.budgets.set(curYear, curMonth, val);
  cancelEdit();
  showToast('예산을 저장했어요');
  render();
}

function cancelEdit() {
  document.getElementById('displayMode').style.display = '';
  document.getElementById('editMode').classList.remove('visible');
}

// ── 유틸 ──────────────────────────────────────────────
function fmt(n)      { return Math.abs(Number(n)).toLocaleString('ko-KR') + '원'; }
function fmtShort(n) { const a = Math.abs(n); return a >= 10000 ? (a / 10000).toFixed(0) + '만원' : a.toLocaleString() + '원'; }

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

init();
