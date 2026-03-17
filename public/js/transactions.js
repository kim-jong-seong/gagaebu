// ── 상태 ──────────────────────────────────────────────
const now = new Date();
let curYear  = now.getFullYear();
let curMonth = now.getMonth() + 1;
let typeFilter  = 'all';
let curPage     = 1;
let searchTimer = null;
let modalType   = 'expense';
let editingId   = null;
let allCats     = [];
let allPays     = [];
let txCache     = {};

const PAGE_SIZE  = 10;
const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DAY_NAMES   = ['일','월','화','수','목','금','토'];

// ── 초기화 ────────────────────────────────────────────
async function init() {
  updateMonthLabel();
  await loadFilters();
  await loadList();
}

async function loadFilters() {
  allCats = await API.categories.list();
  allPays = await API.paymentMethods.list();

  const catSel = document.getElementById('catFilter');
  catSel.innerHTML = `<option value="">전체 카테고리</option>` +
    allCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  const paySel = document.getElementById('payFilter');
  paySel.innerHTML = `<option value="">전체 결제수단</option>` +
    allPays.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

// ── 데이터 로드 ────────────────────────────────────────
async function loadList() {
  const params = {
    year: curYear, month: curMonth,
    page: curPage, limit: PAGE_SIZE,
  };
  if (typeFilter !== 'all') params.type = typeFilter;
  const cat = document.getElementById('catFilter').value;
  const pay = document.getElementById('payFilter').value;
  const q   = document.getElementById('searchInput').value.trim();
  if (cat) params.category_id = cat;
  if (pay) params.payment_method_id = pay;
  if (q)   params.q = q;

  const [res, summary] = await Promise.all([
    API.transactions.list(params),
    API.transactions.summary(curYear, curMonth),
  ]);

  txCache = {};
  res.data.forEach(t => { txCache[t.id] = t; });
  renderSummary(summary);
  renderList(res);
  renderPagination(res.total, res.page, res.limit);
  updateHeaderSub(res.total);
}

function renderSummary(s) {
  document.getElementById('sumIncome').textContent  = '+' + fmt(s.income);
  document.getElementById('sumExpense').textContent = '-' + fmt(s.expense);
  const bal = s.income - s.expense;
  const el  = document.getElementById('sumBalance');
  el.textContent = (bal >= 0 ? '+' : '-') + fmt(Math.abs(bal));
  el.style.color = bal >= 0 ? 'var(--income)' : 'var(--expense)';
}

function renderList(res) {
  const el = document.getElementById('txList');
  if (!res.data.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">거래 내역이 없습니다</div><div class="empty-sub">검색 조건을 바꾸거나 새 거래를 추가해보세요</div></div>`;
    return;
  }

  const groups = {};
  res.data.forEach(t => { if (!groups[t.date]) groups[t.date] = []; groups[t.date].push(t); });

  el.innerHTML = Object.entries(groups).map(([date, items]) => {
    const d = new Date(date + 'T00:00:00');
    const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일`;
    const dayStr  = DAY_NAMES[d.getDay()] + '요일';

    const dayIncome  = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const dayExpense = items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    let dayTotal = '';
    if (dayIncome)  dayTotal += `<span style="color:var(--income)">+${fmt(dayIncome)}</span>`;
    if (dayExpense) dayTotal += `${dayIncome ? ' · ' : ''}<span style="color:var(--expense)">-${fmt(dayExpense)}</span>`;

    const rows = items.map(t => `
      <div class="tx-row" onclick="openEditModal(${t.id})">
        <div class="tx-icon-cell" style="background:${t.category_color || '#f5f5f5'}">${t.category_icon || '•'}</div>
        <div class="tx-main">
          <div class="tx-name">${t.name}</div>
          <div class="tx-memo">${t.memo || '—'}</div>
        </div>
        <div><span class="tx-category-badge">${t.category_name || '미분류'}</span></div>
        <div class="tx-payment">${t.payment_name || '—'}</div>
        <div class="tx-amount-cell ${t.type}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}</div>
        <button class="tx-delete" onclick="deleteTx(event,${t.id})">&#10005;</button>
      </div>`).join('');

    return `<div class="tx-date-group">
      <div class="tx-date-header">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="tx-date-str">${dateStr}</span>
          <span class="tx-date-day">${dayStr}</span>
        </div>
        <div>${dayTotal}</div>
      </div>${rows}</div>`;
  }).join('');
}

function renderPagination(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  document.getElementById('pageInfo').textContent =
    total === 0 ? '0건' : `${start}–${end} / ${total}건`;

  let html = `<button class="page-btn" onclick="goPage(-1)" ${page <= 1 ? 'disabled' : ''}>&#8249;</button>`;
  for (let p = 1; p <= totalPages; p++) {
    html += `<button class="page-btn${p === page ? ' active' : ''}" onclick="goToPage(${p})">${p}</button>`;
  }
  html += `<button class="page-btn" onclick="goPage(1)" ${page >= totalPages ? 'disabled' : ''}>&#8250;</button>`;
  document.getElementById('pageBtns').innerHTML = html;
}

function updateHeaderSub(total) {
  document.getElementById('headerSub').textContent =
    `${curYear}년 ${MONTH_NAMES[curMonth - 1]} · 총 ${total}건`;
}

// ── 컨트롤 ────────────────────────────────────────────
function changeMonth(d) {
  curMonth += d;
  if (curMonth < 1)  { curMonth = 12; curYear--; }
  if (curMonth > 12) { curMonth = 1;  curYear++; }
  curPage = 1;
  updateMonthLabel();
  loadList();
}

function updateMonthLabel() {
  document.getElementById('monthLabel').textContent = `${curYear}년 ${MONTH_NAMES[curMonth - 1]}`;
}

function setTypeFilter(btn, type) {
  typeFilter = type;
  document.querySelectorAll('.type-tab').forEach(b => b.className = 'type-tab');
  btn.classList.add(type === 'all' ? 'active-all' : type === 'income' ? 'active-income' : 'active-expense');
  curPage = 1;
  loadList();
}

function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { curPage = 1; loadList(); }, 300);
}

function goPage(d)    { curPage += d; loadList(); }
function goToPage(p)  { curPage = p;  loadList(); }

// ── 삭제 ──────────────────────────────────────────────
async function deleteTx(e, id) {
  e.stopPropagation();
  if (!confirm('이 거래를 삭제할까요?')) return;
  try {
    await API.transactions.remove(id);
    showToast('삭제했어요');
    loadList();
  } catch { showToast('삭제에 실패했어요'); }
}

// ── 모달 ──────────────────────────────────────────────
function openModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = '거래 추가';
  document.getElementById('submitBtn').textContent  = '추가하기';
  document.getElementById('mDate').value   = new Date().toISOString().split('T')[0];
  document.getElementById('mAmount').value = '';
  document.getElementById('mDesc').value   = '';
  document.getElementById('mMemo').value   = '';
  setModalType('expense');
  document.getElementById('modalOverlay').classList.add('open');
}

async function openEditModal(id) {
  const t = txCache[id];
  if (!t) return;

  editingId = id;
  document.getElementById('modalTitle').textContent = '거래 수정';
  document.getElementById('submitBtn').textContent  = '수정하기';
  setModalType(t.type);
  document.getElementById('mDate').value   = t.date;
  document.getElementById('mAmount').value = t.amount;
  document.getElementById('mDesc').value   = t.name;
  document.getElementById('mMemo').value   = t.memo || '';

  const catEl = document.getElementById('mCat');
  const payEl = document.getElementById('mPay');
  if (t.category_id)       { for (const o of catEl.options) if (Number(o.value) === t.category_id)       { o.selected = true; break; } }
  if (t.payment_method_id) { for (const o of payEl.options) if (Number(o.value) === t.payment_method_id) { o.selected = true; break; } }

  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); editingId = null; }
function handleOverlayClick(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }

function setModalType(type) {
  modalType = type;
  document.getElementById('mBtnExpense').classList.toggle('active', type === 'expense');
  document.getElementById('mBtnIncome').classList.toggle('active', type === 'income');

  const cats = allCats.filter(c => c.type === type);
  const pays = allPays;

  document.getElementById('mCat').innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('mPay').innerHTML = pays.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  document.getElementById('mCatLabel').textContent = type === 'expense' ? '카테고리' : '수입 분류';
  document.getElementById('mPayLabel').textContent = type === 'expense' ? '결제수단' : '입금수단';
  document.getElementById('mDesc').placeholder     = type === 'expense' ? '지출 내용' : '수입 내용 (예: 3월 급여)';
}

async function submitTransaction() {
  const amount = Number(document.getElementById('mAmount').value);
  const name   = document.getElementById('mDesc').value.trim();
  const date   = document.getElementById('mDate').value;
  const catId  = document.getElementById('mCat').value;
  const payId  = document.getElementById('mPay').value;
  const memo   = document.getElementById('mMemo').value.trim();

  if (!amount || !name || !date) { showToast('금액, 내용, 날짜를 입력해주세요'); return; }

  const body = {
    date, type: modalType, name, amount,
    category_id: catId || null,
    payment_method_id: payId || null,
    memo,
  };

  try {
    if (editingId) {
      await API.transactions.update(editingId, body);
      showToast('수정했어요');
    } else {
      await API.transactions.create(body);
      curPage = 1;
      showToast('거래를 추가했어요');
    }
    closeModal();
    loadList();
  } catch (err) { showToast(err.error || '저장에 실패했어요'); }
}

// ── 유틸 ──────────────────────────────────────────────
function fmt(n) { return Number(n).toLocaleString('ko-KR') + '원'; }

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

init();
