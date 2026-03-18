// ── 상태 ──────────────────────────────────────────────
let appSettings = {};
let newCatType  = 'expense';
let selectedIcon = '🍔';

const ICON_OPTIONS = ['🍔','🚌','🏠','🎬','📚','💊','🛍','💵','💼','📈','🎁','✈️','🎮','🐾','🌿','🎵','🏋️','☕','🍷','🛒','📱','⚡','🏦','🎓','💻','👗','🏥'];

// ── 초기화 ────────────────────────────────────────────
async function init() {
  appSettings = await API.settings.get();
  await loadDefaultIncomeSelects();
  applySettings();
  loadProfileStats();
  loadAvatar();
}

async function loadDefaultIncomeSelects() {
  const [cats, pays] = await Promise.all([API.categories.list(), API.paymentMethods.list()]);
  const incomeCats = cats.filter(c => c.type === 'income');

  document.getElementById('setDefaultIncomeCat').innerHTML =
    `<option value="">분류 선택</option>` +
    incomeCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  document.getElementById('setDefaultIncomePay').innerHTML =
    `<option value="">입금수단 선택</option>` +
    pays.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

function applySettings() {
  document.getElementById('profileName').textContent = appSettings.profile_name || '사용자';

  // 일반 설정 반영
  setSelectValue('setCurrency',       appSettings.currency);
  setSelectValue('setStartDay',       appSettings.start_day);
  setSelectValue('setCarryoverMonths',appSettings.carryover_max_months);

  setToggle('setAbbr',      appSettings.abbreviation      === 'true');
  setToggle('setCarryover', appSettings.carryover_enabled === 'true');

  const budgetEl = document.getElementById('setDefaultBudget');
  if (budgetEl) budgetEl.value = appSettings.default_budget || '';

  const amtEl  = document.getElementById('setDefaultIncomeAmount');
  if (amtEl)  amtEl.value  = appSettings.default_income_amount || '';
  const nameEl = document.getElementById('setDefaultIncomeName');
  if (nameEl) nameEl.value = appSettings.default_income_name   || '';
  const dayEl  = document.getElementById('setDefaultIncomeDay');
  if (dayEl)  dayEl.value  = appSettings.default_income_day    || '';
  setSelectValue('setDefaultIncomeCat', appSettings.default_income_category_id);
  setSelectValue('setDefaultIncomePay', appSettings.default_income_payment_method_id);
}

function setSelectValue(id, value) {
  const el = document.getElementById(id);
  if (!el || !value) return;
  for (const opt of el.options) {
    if (opt.value === value) { opt.selected = true; break; }
  }
}

function setToggle(id, on) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('on', on);
}

// ── 프로필 통계 ────────────────────────────────────────
async function loadProfileStats() {
  try {
    const now = new Date();
    // 전체 거래 건수 (현재 연도 기준 간단 집계)
    const res = await API.transactions.list({ limit: 1 });
    document.getElementById('statTxCount').textContent = res.total + '건';

    // 올해 저축률
    const trend = await API.transactions.monthlyTrend(now.getFullYear());
    const months = trend.filter(d => d.income > 0);
    if (months.length) {
      const totalInc = months.reduce((s, d) => s + d.income, 0);
      const totalExp = months.reduce((s, d) => s + d.expense, 0);
      const rate     = Math.round(((totalInc - totalExp) / totalInc) * 100);
      document.getElementById('statSavingsRate').textContent = rate + '%';
    }
  } catch {}
}

// ── 아바타 ────────────────────────────────────────────
function loadAvatar() {
  const src = localStorage.getItem('avatarSrc') || appSettings.avatar_src;
  if (src) applyAvatar(src);
}

function changeAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    const src = e.target.result;
    localStorage.setItem('avatarSrc', src);
    applyAvatar(src);
    await API.settings.update({ avatar_src: src });
    showToast('프로필 사진을 변경했어요');
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function applyAvatar(src) {
  document.getElementById('avatarEl').innerHTML = `<img src="${src}" alt="avatar" />`;
}

// ── 패널 전환 ──────────────────────────────────────────
function showPanel(id, el) {
  document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.snav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  el.classList.add('active');
  if (id === 'category') renderAllLists();
}

// ── 설정 저장 ──────────────────────────────────────────
async function saveSetting(key, value) {
  appSettings[key] = value;
  await API.settings.update({ [key]: value });
  showToast('저장됐어요');
}

async function toggleBoolSetting(el, key) {
  el.classList.toggle('on');
  const val = el.classList.contains('on') ? 'true' : 'false';
  await saveSetting(key, val);
}

// ── 카테고리 렌더 ──────────────────────────────────────
async function renderAllLists() {
  const [cats, pays] = await Promise.all([
    API.categories.list(),
    API.paymentMethods.list(),
  ]);

  ['expense','income'].forEach(type => {
    const el = document.getElementById(type + 'CatList');
    el.innerHTML = cats.filter(c => c.type === type).map(c => `
      <div class="cat-manage-row">
        <div class="cat-manage-icon" style="background:${c.color}">${c.icon}</div>
        <span class="cat-manage-name">${c.name}</span>
        <span class="cat-manage-type ${type}">${type === 'expense' ? '지출' : '수입'}</span>
        <button class="cat-action-btn" onclick="deleteCat(${c.id},'${c.name}',${c.is_default})" title="삭제">✕</button>
      </div>`).join('');
  });

  document.getElementById('payMethodList').innerHTML = pays.map(p => `
    <div class="pay-manage-row">
      <span class="pay-manage-name">${p.name}</span>
      ${p.is_default ? '' : `<button class="cat-action-btn" onclick="deletePay(${p.id})" title="삭제">✕</button>`}
    </div>`).join('');
}

async function deleteCat(id, name, isDefault) {
  if (isDefault && name === '기타') { showToast('"기타" 카테고리는 삭제할 수 없어요'); return; }
  try {
    await API.categories.remove(id);
    showToast('카테고리를 삭제했어요');
    renderAllLists();
  } catch (e) { showToast(e.error || '삭제 실패'); }
}

async function deletePay(id) {
  try {
    await API.paymentMethods.remove(id);
    showToast('결제수단을 삭제했어요');
    renderAllLists();
  } catch (e) { showToast(e.error || '삭제 실패'); }
}

// ── 카테고리 모달 ──────────────────────────────────────
function openCatModal(type) {
  newCatType = type;
  selectedIcon = ICON_OPTIONS[0];
  document.getElementById('catNameInput').value = '';
  setCatType(type);
  document.getElementById('iconPicker').innerHTML = ICON_OPTIONS.map(ic =>
    `<div class="icon-opt${ic === selectedIcon ? ' selected' : ''}" onclick="pickIcon(this,'${ic}')">${ic}</div>`
  ).join('');
  document.getElementById('catModal').classList.add('open');
}

function setCatType(type) {
  newCatType = type;
  document.getElementById('catTypeExpense').className = 'type-opt expense' + (type === 'expense' ? ' sel' : '');
  document.getElementById('catTypeIncome').className  = 'type-opt income'  + (type === 'income'  ? ' sel' : '');
}

function pickIcon(el, icon) {
  selectedIcon = icon;
  document.querySelectorAll('.icon-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
}

async function saveCat() {
  const name = document.getElementById('catNameInput').value.trim();
  if (!name) { showToast('카테고리 이름을 입력해주세요'); return; }
  try {
    await API.categories.create({ type: newCatType, name, icon: selectedIcon });
    closeModal('catModal');
    renderAllLists();
    showToast(`'${name}' 카테고리를 추가했어요`);
  } catch (e) { showToast(e.error || '추가 실패'); }
}

// ── 결제수단 모달 ──────────────────────────────────────
function openPayModal() {
  document.getElementById('payNameInput').value = '';
  document.getElementById('payModal').classList.add('open');
}

async function savePay() {
  const name = document.getElementById('payNameInput').value.trim();
  if (!name) { showToast('결제수단 이름을 입력해주세요'); return; }
  try {
    await API.paymentMethods.create({ name });
    closeModal('payModal');
    renderAllLists();
    showToast(`'${name}' 결제수단을 추가했어요`);
  } catch (e) { showToast(e.error || '추가 실패'); }
}

// ── 프로필 모달 ────────────────────────────────────────
function openProfileModal() {
  document.getElementById('profileNameInput').value = document.getElementById('profileName').textContent;
  document.getElementById('profileModal').classList.add('open');
}

async function saveProfile() {
  const name = document.getElementById('profileNameInput').value.trim();
  if (!name) return;
  document.getElementById('profileName').textContent = name;
  await API.settings.update({ profile_name: name });
  closeModal('profileModal');
  showToast('프로필을 저장했어요');
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── 데이터 내보내기 ────────────────────────────────────
async function exportCSV() {
  const res = await API.transactions.list({ limit: 9999 });
  const rows = [['날짜','유형','내용','카테고리','결제수단','금액','메모']];
  res.data.forEach(t => {
    rows.push([t.date, t.type === 'income' ? '수입' : '지출', t.name,
      t.category_name || '', t.payment_name || '', t.amount, t.memo || '']);
  });
  const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `가계부_${today()}.csv`);
  showToast('CSV 파일을 내보냈어요');
}

async function exportJSON() {
  const res  = await API.transactions.list({ limit: 9999 });
  const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `가계부_백업_${today()}.json`);
  showToast('백업 파일을 내보냈어요');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function confirmReset() {
  if (!confirm('모든 거래 내역이 삭제됩니다. 정말 초기화할까요?')) return;
  if (!confirm('이 작업은 되돌릴 수 없어요. 계속할까요?')) return;
  // 전체 거래 삭제 (건별)
  const res = await API.transactions.list({ limit: 9999 });
  await Promise.all(res.data.map(t => API.transactions.remove(t.id)));
  showToast('초기화됐어요');
}

// ── 유틸 ──────────────────────────────────────────────
function today() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

init();
