import React, { useState, useEffect, useCallback, useRef } from 'react';
import { COLORS } from '../constants';
import API from '../api';
import { showToast } from '../Toast';
import Portal from '../Portal';

const ICON_OPTIONS = ['🍔','🚌','🏠','🎬','📚','💊','🛍','💵','💼','📈','🎁','✈️','🎮','🐾','🌿','🎵','🏋️','☕','🍷','🛒','📱','⚡','🏦','🎓','💻','👗','🏥'];

const S = {
  bg: '#f7f7f5', surface: '#ffffff', border: '#e8e8e5',
  text: '#1a1a1a', textMuted: '#9a9a95',
  income: '#2d7a4f', incomeBg: '#edf7f1',
  expense: '#c0392b', expenseBg: '#fdf0ef',
  accent: '#3d5afe', accentLight: '#eef0ff',
  radius: 12, shadow: '0 1px 3px rgba(0,0,0,.06)',
};

// ── Toggle Component ──────────────────────────────────
function Toggle({ on, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 40, height: 22, background: on ? S.accent : S.border,
        borderRadius: 99, position: 'relative', cursor: 'pointer',
        transition: 'background .2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', width: 16, height: 16,
        background: '#fff', borderRadius: '50%',
        top: 3, left: on ? 21 : 3,
        transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }} />
    </div>
  );
}

// ── Nav Icons (inline SVGs) ───────────────────────────
const ProfileIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="7" r="3.5" /><path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" />
  </svg>
);
const GeneralIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);
const CategoryIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 2h10a1 1 0 0 1 1 1v16l-6-4-6 4V3a1 1 0 0 1 1-1z" />
  </svg>
);
const DataIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="10" cy="5" rx="7" ry="2.5" /><path d="M3 5v4c0 1.38 3.134 2.5 7 2.5S17 10.38 17 9V5" /><path d="M3 9v4c0 1.38 3.134 2.5 7 2.5S17 14.38 17 13V9" /><path d="M3 13v3c0 1.38 3.134 2.5 7 2.5S17 17.38 17 16v-3" />
  </svg>
);

const NAV_ITEMS = [
  { id: 'profile', label: '프로필', Icon: ProfileIcon },
  { id: 'general', label: '일반', Icon: GeneralIcon },
  { id: 'category', label: '카테고리', Icon: CategoryIcon },
  { id: 'data', label: '데이터', Icon: DataIcon },
];

// ── Utility ───────────────────────────────────────────
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Select arrow bg image ─────────────────────────────
const selectArrowBg = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239a9a95'/%3E%3C/svg%3E\")";

// ── Common inline styles ──────────────────────────────
const sectionCardStyle = {
  background: S.surface, border: `1px solid ${S.border}`,
  borderRadius: S.radius, boxShadow: S.shadow, overflow: 'hidden',
};

const sectionTitleStyle = {
  fontSize: 13, fontWeight: 700, color: S.textMuted,
  textTransform: 'uppercase', letterSpacing: 0.5,
  padding: '16px 20px 12px', borderBottom: `1px solid ${S.border}`,
  margin: 0,
};

const settingRowStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 20px', borderBottom: `1px solid ${S.border}`, gap: 16,
};

const settingRowLastStyle = { ...settingRowStyle, borderBottom: 'none' };

const settingLabelStyle = { fontSize: 13, fontWeight: 500 };
const settingDescStyle = { fontSize: 11, color: S.textMuted, marginTop: 2 };
const settingValueStyle = { fontSize: 12, color: S.textMuted };

const settingSelectStyle = {
  padding: '7px 28px 7px 10px', border: `1px solid ${S.border}`,
  borderRadius: 8, fontSize: 12, color: S.text, background: S.bg,
  outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
  backgroundImage: selectArrowBg,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
};

const settingInputStyle = {
  padding: '7px 10px', border: `1px solid ${S.border}`,
  borderRadius: 8, fontSize: 12, color: S.text, background: S.bg,
  outline: 'none', fontFamily: 'inherit', width: 160,
  transition: 'border-color .15s',
};

const formControlStyle = {
  width: '100%', padding: '10px 12px', border: `1px solid ${S.border}`,
  borderRadius: 8, fontSize: 13, color: S.text, background: S.bg,
  outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s',
  boxSizing: 'border-box',
};

const submitBtnStyle = {
  width: '100%', padding: 12, background: S.accent, color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
  transition: 'opacity .15s',
};

// ── Modal Overlay Component ───────────────────────────
function ModalOverlay({ open, onClose, isMobile, children }) {
  const mouseDownOnBg = useRef(false);

  if (!open) return null;

  return (
    <Portal>
      <div
        onMouseDown={(e) => { mouseDownOnBg.current = e.target === e.currentTarget; }}
        onClick={(e) => { if (e.target === e.currentTarget && mouseDownOnBg.current) onClose(); }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)',
          zIndex: 100, display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          paddingBottom: 0,
        }}
      >
        <div style={{
          background: S.surface, borderRadius: isMobile ? '16px 16px 0 0' : S.radius,
          padding: 28, width: isMobile ? '100%' : 380,
          maxWidth: isMobile ? '100%' : '90vw',
          boxShadow: '0 8px 32px rgba(0,0,0,.12)',
          animation: isMobile ? 'settingsSlideUp .25s ease' : 'settingsModalIn .18s ease',
        }}>
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: -16, paddingBottom: 8, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, backgroundColor: S.border, borderRadius: 2 }} />
            </div>
          )}
          {children}
        </div>
      </div>
    </Portal>
  );
}

// ── Main Settings Page ────────────────────────────────
export default function SettingsPage({ isActive, onLogout }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activePanel, setActivePanel] = useState('profile');

  // Data state
  const [settings, setSettings] = useState({});
  const [profileName, setProfileName] = useState('사용자');
  const [avatarSrc, setAvatarSrc] = useState(null);
  const [statTxCount, setStatTxCount] = useState('—');
  const [statSavingsRate, setStatSavingsRate] = useState('—');

  // Category/payment data
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  // Modal states
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);

  // Modal form state
  const [profileNameInput, setProfileNameInput] = useState('');
  const [newCatType, setNewCatType] = useState('expense');
  const [newCatName, setNewCatName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);
  const [newPayName, setNewPayName] = useState('');

  // General settings local state
  const [currency, setCurrency] = useState('KRW');
  const [startDay, setStartDay] = useState('1');
  const [abbreviation, setAbbreviation] = useState(false);
  const [carryoverEnabled, setCarryoverEnabled] = useState(false);
  const [defaultBudget, setDefaultBudget] = useState('');
  const [defaultIncomeAmount, setDefaultIncomeAmount] = useState('');
  const [defaultIncomeName, setDefaultIncomeName] = useState('');
  const [defaultIncomeDay, setDefaultIncomeDay] = useState('');
  const [defaultIncomeCatId, setDefaultIncomeCatId] = useState('');
  const [defaultIncomePayId, setDefaultIncomePayId] = useState('');

  // Income categories and payment methods for selects
  const [incomeCatsForSelect, setIncomeCatsForSelect] = useState([]);
  const [payMethodsForSelect, setPayMethodsForSelect] = useState([]);

  const avatarInputRef = useRef(null);
  const initDone = useRef(false);

  // ── Responsive ────────────────────────────────────
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Inject keyframes ──────────────────────────────
  useEffect(() => {
    const id = 'settings-page-keyframes';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
        @keyframes settingsModalIn { from { opacity:0; transform: scale(.96) translateY(8px); } to { opacity:1; transform: none; } }
        @keyframes settingsSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // ── Load initial data ─────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const s = await API.settings.get();
      setSettings(s);
      setProfileName(s.profile_name || '사용자');
      setCurrency(s.currency || 'KRW');
      setStartDay(s.start_day || '1');
      setAbbreviation(s.abbreviation === 'true');
      setCarryoverEnabled(s.carryover_enabled === 'true');
      setDefaultBudget(s.default_budget || '');
      setDefaultIncomeAmount(s.default_income_amount || '');
      setDefaultIncomeName(s.default_income_name || '');
      setDefaultIncomeDay(s.default_income_day || '');
      setDefaultIncomeCatId(s.default_income_category_id || '');
      setDefaultIncomePayId(s.default_income_payment_method_id || '');

      // Avatar
      const savedAvatar = localStorage.getItem('avatarSrc') || s.avatar_src;
      if (savedAvatar) setAvatarSrc(savedAvatar);

      // Load selects data
      const [cats, pays] = await Promise.all([API.categories.list(), API.paymentMethods.list()]);
      setIncomeCatsForSelect(cats.filter(c => c.type === 'income'));
      setPayMethodsForSelect(pays);
    } catch (e) {
      // silent
    }
  }, []);

  const loadProfileStats = useCallback(async () => {
    try {
      const now = new Date();
      const res = await API.transactions.list({ limit: 1 });
      setStatTxCount(res.total + '건');

      const trend = await API.transactions.monthlyTrend(now.getFullYear());
      const months = trend.filter(d => d.income > 0);
      if (months.length) {
        const totalInc = months.reduce((sum, d) => sum + d.income, 0);
        const totalExp = months.reduce((sum, d) => sum + d.expense, 0);
        const rate = Math.round(((totalInc - totalExp) / totalInc) * 100);
        setStatSavingsRate(rate + '%');
      }
    } catch (e) {
      // silent
    }
  }, []);

  const loadCategoryData = useCallback(async () => {
    try {
      const [cats, pays] = await Promise.all([API.categories.list(), API.paymentMethods.list()]);
      setAllCategories(cats);
      setExpenseCategories(cats.filter(c => c.type === 'expense'));
      setIncomeCategories(cats.filter(c => c.type === 'income'));
      setPaymentMethods(pays);
      setIncomeCatsForSelect(cats.filter(c => c.type === 'income'));
      setPayMethodsForSelect(pays);
    } catch (e) {
      // silent
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      initDone.current = true;
      loadData();
      loadProfileStats();
    }
  }, [isActive, loadData, loadProfileStats]);

  // Load category data when switching to category panel
  useEffect(() => {
    if (activePanel === 'category') {
      loadCategoryData();
    }
  }, [activePanel, loadCategoryData]);

  // ── Save setting helper ───────────────────────────
  const saveSetting = useCallback(async (key, value) => {
    try {
      await API.settings.update({ [key]: value });
      showToast('저장됐어요');
    } catch (e) {
      showToast('저장 실패');
    }
  }, []);

  // ── Avatar ────────────────────────────────────────
  const handleAvatarChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const src = ev.target.result;
      localStorage.setItem('avatarSrc', src);
      setAvatarSrc(src);
      await API.settings.update({ avatar_src: src });
      showToast('프로필 사진을 변경했어요');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  // ── Profile modal ─────────────────────────────────
  const openProfileModal = useCallback(() => {
    setProfileNameInput(profileName);
    setProfileModalOpen(true);
  }, [profileName]);

  const saveProfile = useCallback(async () => {
    const name = profileNameInput.trim();
    if (!name) return;
    setProfileName(name);
    await API.settings.update({ profile_name: name });
    setProfileModalOpen(false);
    showToast('프로필을 저장했어요');
  }, [profileNameInput]);

  // ── Category modal ────────────────────────────────
  const openCatModal = useCallback((type) => {
    setNewCatType(type);
    setSelectedIcon(ICON_OPTIONS[0]);
    setNewCatName('');
    setCatModalOpen(true);
  }, []);

  const saveCat = useCallback(async () => {
    const name = newCatName.trim();
    if (!name) { showToast('카테고리 이름을 입력해주세요'); return; }
    try {
      await API.categories.create({ type: newCatType, name, icon: selectedIcon });
      setCatModalOpen(false);
      loadCategoryData();
      showToast(`'${name}' 카테고리를 추가했어요`);
    } catch (e) {
      showToast(e.error || '추가 실패');
    }
  }, [newCatName, newCatType, selectedIcon, loadCategoryData]);

  const deleteCat = useCallback(async (id, name, isDefault) => {
    if (isDefault && name === '기타') {
      showToast('"기타" 카테고리는 삭제할 수 없어요');
      return;
    }
    try {
      await API.categories.remove(id);
      showToast('카테고리를 삭제했어요');
      loadCategoryData();
    } catch (e) {
      showToast(e.error || '삭제 실패');
    }
  }, [loadCategoryData]);

  // ── Payment modal ─────────────────────────────────
  const openPayModal = useCallback(() => {
    setNewPayName('');
    setPayModalOpen(true);
  }, []);

  const savePay = useCallback(async () => {
    const name = newPayName.trim();
    if (!name) { showToast('결제수단 이름을 입력해주세요'); return; }
    try {
      await API.paymentMethods.create({ name });
      setPayModalOpen(false);
      loadCategoryData();
      showToast(`'${name}' 결제수단을 추가했어요`);
    } catch (e) {
      showToast(e.error || '추가 실패');
    }
  }, [newPayName, loadCategoryData]);

  const deletePay = useCallback(async (id) => {
    try {
      await API.paymentMethods.remove(id);
      showToast('결제수단을 삭제했어요');
      loadCategoryData();
    } catch (e) {
      showToast(e.error || '삭제 실패');
    }
  }, [loadCategoryData]);

  // ── Export CSV ─────────────────────────────────────
  const exportCSV = useCallback(async () => {
    try {
      const res = await API.transactions.list({ limit: 9999 });
      const rows = [['날짜', '유형', '내용', '카테고리', '결제수단', '금액', '메모']];
      res.data.forEach(t => {
        rows.push([t.date, t.type === 'income' ? '수입' : '지출', t.name,
          t.category_name || '', t.payment_name || '', t.amount, t.memo || '']);
      });
      const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      downloadBlob(blob, `가계부_${todayStr()}.csv`);
      showToast('CSV 파일을 내보냈어요');
    } catch (e) {
      showToast('내보내기 실패');
    }
  }, []);

  // ── Export JSON ────────────────────────────────────
  const exportJSON = useCallback(async () => {
    try {
      const res = await API.transactions.list({ limit: 9999 });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `가계부_백업_${todayStr()}.json`);
      showToast('백업 파일을 내보냈어요');
    } catch (e) {
      showToast('백업 실패');
    }
  }, []);

  // ── Reset ─────────────────────────────────────────
  const confirmReset = useCallback(async () => {
    if (!window.confirm('모든 거래 내역이 삭제됩니다. 정말 초기화할까요?')) return;
    if (!window.confirm('이 작업은 되돌릴 수 없어요. 계속할까요?')) return;
    try {
      const res = await API.transactions.list({ limit: 9999 });
      await Promise.all(res.data.map(t => API.transactions.remove(t.id)));
      showToast('초기화됐어요');
    } catch (e) {
      showToast('초기화 실패');
    }
  }, []);

  // ── Panel: Profile ────────────────────────────────
  const renderProfilePanel = () => (
    <div style={{ display: activePanel === 'profile' ? 'flex' : 'none', flexDirection: 'column', gap: 16 }}>
      {/* My Profile card */}
      <div style={sectionCardStyle}>
        <div style={sectionTitleStyle}>내 프로필</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
          {/* Avatar */}
          <div
            onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
            style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, cursor: 'pointer' }}
            onMouseEnter={(e) => { const ov = e.currentTarget.querySelector('[data-avatar-overlay]'); if (ov) ov.style.opacity = 1; }}
            onMouseLeave={(e) => { const ov = e.currentTarget.querySelector('[data-avatar-overlay]'); if (ov) ov.style.opacity = 0; }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: S.accentLight,
              border: `2px solid ${S.border}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 22, transition: 'all .15s', overflow: 'hidden',
            }}>
              {avatarSrc ? (
                <img src={avatarSrc} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>😊</span>
              )}
            </div>
            <div data-avatar-overlay="" style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,.35)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity .15s', fontSize: 14, color: '#fff',
            }}>📷</div>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
          {/* Profile info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{profileName}</div>
            <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>가계부 사용 중</div>
          </div>
          {/* Edit button */}
          <button
            onClick={openProfileModal}
            style={{
              padding: '7px 14px', border: `1px solid ${S.border}`, borderRadius: 8,
              background: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              color: S.textMuted, fontFamily: 'inherit', transition: 'all .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = S.accent; e.currentTarget.style.color = S.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.color = S.textMuted; }}
          >
            수정
          </button>
        </div>
      </div>

      {/* Account stats card */}
      <div style={sectionCardStyle}>
        <div style={sectionTitleStyle}>계정 통계</div>
        <div style={settingRowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>총 거래 건수</div>
            <div style={settingDescStyle}>등록된 수입·지출 합계</div>
          </div>
          <div style={settingValueStyle}>{statTxCount}</div>
        </div>
        <div style={settingRowLastStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>평균 저축률</div>
            <div style={settingDescStyle}>전체 기간 평균</div>
          </div>
          <div style={{ fontSize: 12, color: S.income, fontWeight: 600 }}>{statSavingsRate}</div>
        </div>
      </div>
    </div>
  );

  // ── Panel: General ────────────────────────────────
  const renderGeneralPanel = () => (
    <div style={{ display: activePanel === 'general' ? 'flex' : 'none', flexDirection: 'column', gap: 16 }}>
      {/* Display settings */}
      <div style={sectionCardStyle}>
        <div style={sectionTitleStyle}>표시 설정</div>
        <div style={settingRowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>통화</div>
            <div style={settingDescStyle}>금액 표시 단위</div>
          </div>
          <select
            value={currency}
            onChange={(e) => { setCurrency(e.target.value); saveSetting('currency', e.target.value); }}
            style={settingSelectStyle}
          >
            <option value="KRW">₩ 원 (KRW)</option>
            <option value="USD">$ 달러 (USD)</option>
            <option value="JPY">¥ 엔 (JPY)</option>
            <option value="EUR">€ 유로 (EUR)</option>
          </select>
        </div>
        <div style={settingRowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>시작 요일</div>
            <div style={settingDescStyle}>달력·주간 통계 기준</div>
          </div>
          <select
            value={startDay}
            onChange={(e) => { setStartDay(e.target.value); saveSetting('start_day', e.target.value); }}
            style={settingSelectStyle}
          >
            <option value="1">월요일</option>
            <option value="0">일요일</option>
          </select>
        </div>
        <div style={settingRowLastStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>금액 단위 축약</div>
            <div style={settingDescStyle}>10,000원 → 1만원으로 표시</div>
          </div>
          <Toggle
            on={abbreviation}
            onChange={() => {
              const next = !abbreviation;
              setAbbreviation(next);
              saveSetting('abbreviation', next ? 'true' : 'false');
            }}
          />
        </div>
      </div>

      {/* Budget settings */}
      <div style={sectionCardStyle}>
        <div style={sectionTitleStyle}>예산 설정</div>
        <div style={settingRowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>이월 예산 적용</div>
            <div style={settingDescStyle}>전달 남은 예산을 이번 달로 넘김</div>
          </div>
          <Toggle
            on={carryoverEnabled}
            onChange={() => {
              const next = !carryoverEnabled;
              setCarryoverEnabled(next);
              saveSetting('carryover_enabled', next ? 'true' : 'false');
            }}
          />
        </div>
        <div style={settingRowLastStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>기본 월 예산</div>
            <div style={settingDescStyle}>새 달 시작 시 자동 적용</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              value={defaultBudget}
              onChange={(e) => setDefaultBudget(e.target.value)}
              onBlur={() => saveSetting('default_budget', defaultBudget)}
              style={{ ...settingInputStyle, width: 120 }}
              onFocus={(e) => { e.target.style.borderColor = S.accent; e.target.style.background = '#fff'; }}
              onBlurCapture={(e) => { e.target.style.borderColor = S.border; e.target.style.background = S.bg; }}
            />
            <span style={{ fontSize: 12, color: S.textMuted }}>원</span>
          </div>
        </div>
      </div>

      {/* Default income settings */}
      <div style={sectionCardStyle}>
        <div style={sectionTitleStyle}>기본 수입 설정</div>
        <div style={settingRowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>금액</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              value={defaultIncomeAmount}
              onChange={(e) => setDefaultIncomeAmount(e.target.value)}
              onBlur={() => saveSetting('default_income_amount', defaultIncomeAmount)}
              style={{ ...settingInputStyle, width: 120 }}
              onFocus={(e) => { e.target.style.borderColor = S.accent; e.target.style.background = '#fff'; }}
              onBlurCapture={(e) => { e.target.style.borderColor = S.border; e.target.style.background = S.bg; }}
            />
            <span style={{ fontSize: 12, color: S.textMuted }}>원</span>
          </div>
        </div>
        <div style={settingRowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>내용</div>
            <div style={settingDescStyle}>수입 추가 시 자동 입력될 내용</div>
          </div>
          <input
            type="text"
            value={defaultIncomeName}
            onChange={(e) => setDefaultIncomeName(e.target.value)}
            onBlur={() => saveSetting('default_income_name', defaultIncomeName)}
            placeholder="예: 월급"
            style={settingInputStyle}
            onFocus={(e) => { e.target.style.borderColor = S.accent; e.target.style.background = '#fff'; }}
            onBlurCapture={(e) => { e.target.style.borderColor = S.border; e.target.style.background = S.bg; }}
          />
        </div>
        <div style={settingRowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>날짜</div>
            <div style={settingDescStyle}>매달 고정 입금일</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              value={defaultIncomeDay}
              onChange={(e) => setDefaultIncomeDay(e.target.value)}
              onBlur={() => saveSetting('default_income_day', defaultIncomeDay)}
              min="1" max="31" placeholder="예: 25"
              style={{ ...settingInputStyle, width: 80 }}
              onFocus={(e) => { e.target.style.borderColor = S.accent; e.target.style.background = '#fff'; }}
              onBlurCapture={(e) => { e.target.style.borderColor = S.border; e.target.style.background = S.bg; }}
            />
            <span style={{ fontSize: 12, color: S.textMuted }}>일</span>
          </div>
        </div>
        <div style={settingRowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>수입 분류</div>
          </div>
          <select
            value={defaultIncomeCatId}
            onChange={(e) => { setDefaultIncomeCatId(e.target.value); saveSetting('default_income_category_id', e.target.value); }}
            style={settingSelectStyle}
          >
            <option value="">분류 선택</option>
            {incomeCatsForSelect.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div style={settingRowLastStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>입금수단</div>
          </div>
          <select
            value={defaultIncomePayId}
            onChange={(e) => { setDefaultIncomePayId(e.target.value); saveSetting('default_income_payment_method_id', e.target.value); }}
            style={settingSelectStyle}
          >
            <option value="">입금수단 선택</option>
            {payMethodsForSelect.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  // ── Panel: Category ───────────────────────────────
  const renderCategoryPanel = () => (
    <div style={{ display: activePanel === 'category' ? 'flex' : 'none', flexDirection: 'column', gap: 16 }}>
      {/* Expense categories */}
      <div style={sectionCardStyle}>
        <div style={sectionTitleStyle}>지출 카테고리</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {expenseCategories.map(c => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px', borderBottom: `1px solid ${S.border}`,
                transition: 'background .1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = S.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 16,
                flexShrink: 0, background: c.color || S.expenseBg,
              }}>
                {c.icon}
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c.name}</span>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20,
                background: S.expenseBg, color: S.expense,
              }}>지출</span>
              <button
                onClick={() => deleteCat(c.id, c.name, c.is_default)}
                title="삭제"
                style={{
                  width: 26, height: 26, borderRadius: 6, border: `1px solid ${S.border}`,
                  background: 'none', cursor: 'pointer', fontSize: 11, color: S.textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = S.expenseBg; e.currentTarget.style.color = S.expense; e.currentTarget.style.borderColor = S.expense; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = S.textMuted; e.currentTarget.style.borderColor = S.border; }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px' }}>
          <button
            onClick={() => openCatModal('expense')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
              fontWeight: 500, color: S.accent, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = 0.75; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = 1; }}
          >
            + 카테고리 추가
          </button>
        </div>
      </div>

      {/* Income categories */}
      <div style={sectionCardStyle}>
        <div style={sectionTitleStyle}>수입 카테고리</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {incomeCategories.map(c => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px', borderBottom: `1px solid ${S.border}`,
                transition: 'background .1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = S.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 16,
                flexShrink: 0, background: c.color || S.incomeBg,
              }}>
                {c.icon}
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c.name}</span>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20,
                background: S.incomeBg, color: S.income,
              }}>수입</span>
              <button
                onClick={() => deleteCat(c.id, c.name, c.is_default)}
                title="삭제"
                style={{
                  width: 26, height: 26, borderRadius: 6, border: `1px solid ${S.border}`,
                  background: 'none', cursor: 'pointer', fontSize: 11, color: S.textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = S.expenseBg; e.currentTarget.style.color = S.expense; e.currentTarget.style.borderColor = S.expense; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = S.textMuted; e.currentTarget.style.borderColor = S.border; }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px' }}>
          <button
            onClick={() => openCatModal('income')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
              fontWeight: 500, color: S.accent, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = 0.75; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = 1; }}
          >
            + 카테고리 추가
          </button>
        </div>
      </div>

      {/* Payment methods */}
      <div style={sectionCardStyle}>
        <div style={sectionTitleStyle}>결제수단</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {paymentMethods.map(p => (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px', borderBottom: `1px solid ${S.border}`,
                transition: 'background .1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = S.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.name}</span>
              {!p.is_default && (
                <button
                  onClick={() => deletePay(p.id)}
                  title="삭제"
                  style={{
                    width: 26, height: 26, borderRadius: 6, border: `1px solid ${S.border}`,
                    background: 'none', cursor: 'pointer', fontSize: 11, color: S.textMuted,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = S.expenseBg; e.currentTarget.style.color = S.expense; e.currentTarget.style.borderColor = S.expense; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = S.textMuted; e.currentTarget.style.borderColor = S.border; }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px' }}>
          <button
            onClick={openPayModal}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
              fontWeight: 500, color: S.accent, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = 0.75; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = 1; }}
          >
            + 결제수단 추가
          </button>
        </div>
      </div>
    </div>
  );

  // ── Panel: Data ───────────────────────────────────
  const renderDataPanel = () => (
    <div style={{ display: activePanel === 'data' ? 'flex' : 'none', flexDirection: 'column', gap: 16 }}>
      {/* Export */}
      <div style={sectionCardStyle}>
        <div style={sectionTitleStyle}>내보내기</div>
        <div style={settingRowLastStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>DB 파일 내보내기</div>
            <div style={settingDescStyle}>데이터베이스 파일 직접 다운로드</div>
          </div>
          <button
            onClick={() => {
              const a = document.createElement('a');
              a.href = '/api/database/download';
              a.click();
            }}
            style={{
              padding: '7px 14px', border: `1px solid ${S.accent}`, borderRadius: 8,
              background: S.accentLight, color: S.accent, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = S.accent; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = S.accentLight; e.currentTarget.style.color = S.accent; }}
          >
            내보내기
          </button>
        </div>
        <div style={settingRowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>CSV로 내보내기</div>
            <div style={settingDescStyle}>거래 내역 전체를 스프레드시트 형식으로</div>
          </div>
          <button
            onClick={exportCSV}
            style={{
              padding: '7px 14px', border: `1px solid ${S.accent}`, borderRadius: 8,
              background: S.accentLight, color: S.accent, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = S.accent; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = S.accentLight; e.currentTarget.style.color = S.accent; }}
          >
            내보내기
          </button>
        </div>
        <div style={settingRowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>JSON 백업파일 내보내기</div>
            <div style={settingDescStyle}>모든 거래 데이터를 JSON으로 백업</div>
          </div>
          <button
            onClick={exportJSON}
            style={{
              padding: '7px 14px', border: `1px solid ${S.accent}`, borderRadius: 8,
              background: S.accentLight, color: S.accent, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = S.accent; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = S.accentLight; e.currentTarget.style.color = S.accent; }}
          >
            내보내기
          </button>
        </div>
      </div>

      {/* Reset */}
      <div style={sectionCardStyle}>
        <div style={sectionTitleStyle}>초기화</div>
        <div style={settingRowLastStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...settingLabelStyle, color: S.expense }}>전체 데이터 초기화</div>
            <div style={settingDescStyle}>모든 거래 내역이 삭제돼요 (복구 불가)</div>
          </div>
          <button
            onClick={confirmReset}
            style={{
              padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              border: `1px solid ${S.expense}`, background: S.expenseBg, color: S.expense,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = S.expense; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = S.expenseBg; e.currentTarget.style.color = S.expense; }}
          >
            초기화
          </button>
        </div>
      </div>

      {/* App info */}
      <div style={sectionCardStyle}>
        <div style={sectionTitleStyle}>앱 정보</div>
        <div style={settingRowLastStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={settingLabelStyle}>버전</div>
          </div>
          <span style={{
            fontSize: 11, background: S.bg, border: `1px solid ${S.border}`,
            padding: '3px 8px', borderRadius: 20, color: S.textMuted,
          }}>v2.0.0</span>
        </div>
      </div>
    </div>
  );

  // ── Modals ────────────────────────────────────────

  // Profile edit modal
  const renderProfileModal = () => (
    <ModalOverlay open={profileModalOpen} onClose={() => setProfileModalOpen(false)} isMobile={isMobile}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>프로필 수정</div>
        <button
          onClick={() => setProfileModalOpen(false)}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: S.textMuted }}
        >
          &#215;
        </button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 600, color: S.textMuted,
          textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
        }}>이름</label>
        <input
          type="text"
          value={profileNameInput}
          onChange={(e) => setProfileNameInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveProfile(); }}
          style={formControlStyle}
          onFocus={(e) => { e.target.style.borderColor = S.accent; e.target.style.background = '#fff'; }}
          onBlur={(e) => { e.target.style.borderColor = S.border; e.target.style.background = S.bg; }}
          autoFocus
        />
      </div>
      <button
        onClick={saveProfile}
        style={submitBtnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = 0.88; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = 1; }}
      >
        저장하기
      </button>
    </ModalOverlay>
  );

  // Category add modal
  const renderCatModal = () => (
    <ModalOverlay open={catModalOpen} onClose={() => setCatModalOpen(false)} isMobile={isMobile}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>카테고리 추가</div>
        <button
          onClick={() => setCatModalOpen(false)}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: S.textMuted }}
        >
          &#215;
        </button>
      </div>
      {/* Type toggle */}
      <div style={{ marginBottom: 14 }}>
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 600, color: S.textMuted,
          textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
        }}>유형</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={() => setNewCatType('expense')}
            style={{
              padding: 9, border: `1px solid ${newCatType === 'expense' ? S.expense : S.border}`,
              borderRadius: 8, background: newCatType === 'expense' ? S.expenseBg : 'none',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              color: newCatType === 'expense' ? S.expense : S.textMuted,
              transition: 'all .15s',
            }}
          >
            지출
          </button>
          <button
            onClick={() => setNewCatType('income')}
            style={{
              padding: 9, border: `1px solid ${newCatType === 'income' ? S.income : S.border}`,
              borderRadius: 8, background: newCatType === 'income' ? S.incomeBg : 'none',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              color: newCatType === 'income' ? S.income : S.textMuted,
              transition: 'all .15s',
            }}
          >
            수입
          </button>
        </div>
      </div>
      {/* Name input */}
      <div style={{ marginBottom: 14 }}>
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 600, color: S.textMuted,
          textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
        }}>카테고리 이름</label>
        <input
          type="text"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveCat(); }}
          placeholder="예: 구독, 취미"
          style={formControlStyle}
          onFocus={(e) => { e.target.style.borderColor = S.accent; e.target.style.background = '#fff'; }}
          onBlur={(e) => { e.target.style.borderColor = S.border; e.target.style.background = S.bg; }}
        />
      </div>
      {/* Icon picker */}
      <div style={{ marginBottom: 14 }}>
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 600, color: S.textMuted,
          textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
        }}>아이콘</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ICON_OPTIONS.map(ic => (
            <div
              key={ic}
              onClick={() => setSelectedIcon(ic)}
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: `1px solid ${selectedIcon === ic ? S.accent : S.border}`,
                background: selectedIcon === ic ? S.accentLight : S.bg,
                cursor: 'pointer', fontSize: 18, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
              }}
            >
              {ic}
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={saveCat}
        style={submitBtnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = 0.88; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = 1; }}
      >
        추가하기
      </button>
    </ModalOverlay>
  );

  // Payment method add modal
  const renderPayModal = () => (
    <ModalOverlay open={payModalOpen} onClose={() => setPayModalOpen(false)} isMobile={isMobile}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>결제수단 추가</div>
        <button
          onClick={() => setPayModalOpen(false)}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: S.textMuted }}
        >
          &#215;
        </button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 600, color: S.textMuted,
          textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
        }}>결제수단 이름</label>
        <input
          type="text"
          value={newPayName}
          onChange={(e) => setNewPayName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') savePay(); }}
          placeholder="예: 체크카드, 페이"
          style={formControlStyle}
          onFocus={(e) => { e.target.style.borderColor = S.accent; e.target.style.background = '#fff'; }}
          onBlur={(e) => { e.target.style.borderColor = S.border; e.target.style.background = S.bg; }}
          autoFocus
        />
      </div>
      <button
        onClick={savePay}
        style={submitBtnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = 0.88; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = 1; }}
      >
        추가하기
      </button>
    </ModalOverlay>
  );

  // ── Main Render ───────────────────────────────────
  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      padding: isMobile ? '20px 16px' : '36px 40px',
      background: S.bg,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      boxSizing: 'border-box',
    }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, letterSpacing: -0.5 }}>설정</div>
        <div style={{ fontSize: 13, color: S.textMuted, marginTop: 2 }}>앱 환경과 데이터를 관리해요</div>
      </div>

      {/* Settings layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '180px 1fr',
        gap: isMobile ? 16 : 24,
        alignItems: 'start',
      }}>
        {/* Settings nav */}
        <div style={{
          background: S.surface, border: `1px solid ${S.border}`,
          borderRadius: S.radius, padding: isMobile ? 6 : 8,
          boxShadow: S.shadow,
          ...(isMobile
            ? { display: 'flex', overflowX: 'auto', gap: 4 }
            : { position: 'sticky', top: 36 }
          ),
        }}>
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isNavActive = activePanel === id;
            return (
              <div
                key={id}
                onClick={() => setActivePanel(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                  color: isNavActive ? S.accent : S.textMuted,
                  background: isNavActive ? S.accentLight : 'transparent',
                  fontSize: 13, fontWeight: 500, transition: 'all .15s',
                  whiteSpace: isMobile ? 'nowrap' : 'normal',
                  flexShrink: isMobile ? 0 : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!isNavActive) {
                    e.currentTarget.style.background = S.bg;
                    e.currentTarget.style.color = S.text;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isNavActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = S.textMuted;
                  }
                }}
              >
                <span style={{ fontSize: 14, width: 18, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon />
                </span>
                {label}
              </div>
            );
          })}
        </div>

        {/* Panels */}
        <div>
          {renderProfilePanel()}
          {renderGeneralPanel()}
          {renderCategoryPanel()}
          {renderDataPanel()}
        </div>
      </div>

      {/* Modals */}
      {renderProfileModal()}
      {renderCatModal()}
      {renderPayModal()}
    </div>
  );
}
