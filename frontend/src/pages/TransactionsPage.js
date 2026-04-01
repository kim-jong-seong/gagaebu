import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { COLORS, MONTH_NAMES, DAY_NAMES, fmt, formatAmountInput } from '../constants';
import API from '../api';
import { showToast } from '../Toast';
import Portal from '../Portal';

/* ------------------------------------------------------------------ */
/*  CSS-var-equivalent inline style tokens                            */
/* ------------------------------------------------------------------ */
const S = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  border: COLORS.border,
  text: COLORS.text,
  textMuted: COLORS.textMuted,
  income: COLORS.income,
  incomeBg: COLORS.incomeBg,
  expense: COLORS.expense,
  expenseBg: COLORS.expenseBg,
  accent: COLORS.accent,
  accentLight: COLORS.accentLight,
  radius: 12,
  shadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const SELECT_ARROW = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239a9a95'/%3E%3C/svg%3E\")";

/* ------------------------------------------------------------------ */
/*  Responsive helper hook                                            */
/* ------------------------------------------------------------------ */
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

/* ------------------------------------------------------------------ */
/*  <style> tag injected once for keyframes + hover pseudo-classes    */
/* ------------------------------------------------------------------ */
let styleInjected = false;
function injectGlobalStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const css = `
@keyframes txSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes txSlideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
@keyframes txModalIn { from { opacity:0; transform: scale(.96) translateY(8px); } to { opacity:1; transform: none; } }
.tx-delete-btn { opacity: 0; transition: all .15s; }
.tx-row-wrap:hover .tx-delete-btn { opacity: 1; }
@media (max-width: 767px) { .tx-delete-btn { opacity: 1 !important; } }
`;
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
}

/* ================================================================== */
/*  MAIN COMPONENT                                                    */
/* ================================================================== */
export default function TransactionsPage({ isActive }) {
  /* ── state ─────────────────────────────────────────── */
  const now = useMemo(() => new Date(), []);
  const [curYear, setCurYear] = useState(now.getFullYear());
  const [curMonth, setCurMonth] = useState(now.getMonth() + 1);

  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [catFilterId, setCatFilterId] = useState('');
  const [payFilterId, setPayFilterId] = useState('');

  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });

  const [allCats, setAllCats] = useState([]);
  const [allPays, setAllPays] = useState([]);
  const [defaultIncome, setDefaultIncome] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalType, setModalType] = useState('expense');
  const [mAmount, setMAmount] = useState('');
  const [mDate, setMDate] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mCat, setMCat] = useState('');
  const [mPay, setMPay] = useState('');
  const [mMemo, setMMemo] = useState('');

  const txCacheRef = useRef({});
  const searchTimerRef = useRef(null);
  const overlayMouseDownRef = useRef(false);
  const amountInputRef = useRef(null);
  const loadedRef = useRef(false);

  const isMobile = useIsMobile();

  /* ── inject global style once ──────────────────────── */
  useEffect(() => { injectGlobalStyle(); }, []);

  /* ── load categories + payment methods on mount ────── */
  useEffect(() => {
    (async () => {
      try {
        const [cats, pays, settings] = await Promise.all([
          API.categories.list(),
          API.paymentMethods.list(),
          API.settings.get(),
        ]);
        setAllCats(cats);
        setAllPays(pays);
        setDefaultIncome({
          name: settings.default_income_name || '',
          amount: settings.default_income_amount || '',
          day: Number(settings.default_income_day) || null,
          category_id: Number(settings.default_income_category_id) || null,
          payment_method_id: Number(settings.default_income_payment_method_id) || null,
        });
        loadedRef.current = true;
      } catch (e) {
        console.error('Failed to load filters', e);
      }
    })();
  }, []);

  /* ── load list when deps change ────────────────────── */
  const loadList = useCallback(async (overrideSearch) => {
    const q = typeof overrideSearch === 'string' ? overrideSearch : searchQ;
    const params = { year: curYear, month: curMonth, page: 1, limit: 9999 };
    if (typeFilter !== 'all') params.type = typeFilter;
    if (catFilterId) params.category_id = catFilterId;
    if (payFilterId) params.payment_method_id = payFilterId;
    if (q) params.q = q;

    try {
      const [res, sum] = await Promise.all([
        API.transactions.list(params),
        API.transactions.summary(curYear, curMonth),
      ]);
      const cache = {};
      res.data.forEach(t => { cache[t.id] = t; });
      txCacheRef.current = cache;
      setTransactions(res.data);
      setTotalCount(res.total);
      setSummary(sum);
    } catch (e) {
      console.error('loadList failed', e);
    }
  }, [curYear, curMonth, typeFilter, catFilterId, payFilterId, searchQ]);

  useEffect(() => {
    if (loadedRef.current || true) {
      loadList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curYear, curMonth, typeFilter, catFilterId, payFilterId]);

  // ── 탭 활성화 시 데이터 새로고침 ─────────────────────────
  const prevActiveRef = useRef(false);
  useEffect(() => {
    if (isActive && !prevActiveRef.current) {
      loadList();
    }
    prevActiveRef.current = isActive;
  }, [isActive, loadList]);

  /* ── debounced search ──────────────────────────────── */
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchQ(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      loadList(val);
    }, 300);
  }, [loadList]);

  /* ── month nav ─────────────────────────────────────── */
  const changeMonth = useCallback((d) => {
    setCurMonth(prev => {
      let m = prev + d;
      let y = curYear;
      if (m < 1) { m = 12; y--; }
      if (m > 12) { m = 1; y++; }
      setCurYear(y);
      return m;
    });
  }, [curYear]);

  /* ── type filter ───────────────────────────────────── */
  const handleTypeFilter = useCallback((type) => {
    setTypeFilter(type);
  }, []);

  /* ── delete ────────────────────────────────────────── */
  const deleteTx = useCallback(async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('이 거래를 삭제할까요?')) return;
    try {
      await API.transactions.remove(id);
      showToast('삭제했어요');
      loadList();
    } catch {
      showToast('삭제에 실패했어요');
    }
  }, [loadList]);

  /* ── modal helpers ─────────────────────────────────── */
  const filteredCats = useMemo(() => allCats.filter(c => c.type === modalType), [allCats, modalType]);

  const openModal = useCallback(() => {
    setEditingId(null);
    setModalType('expense');
    setMAmount('');
    setMDate(new Date().toISOString().split('T')[0]);
    setMDesc('');
    setMMemo('');
    setMCat('');
    setMPay('');
    setModalOpen(true);
    setModalClosing(false);
  }, []);

  const openEditModal = useCallback((id) => {
    const t = txCacheRef.current[id];
    if (!t) return;
    setEditingId(id);
    setModalType(t.type);
    setMAmount(Number(t.amount).toLocaleString('ko-KR'));
    setMDate(t.date);
    setMDesc(t.name);
    setMMemo(t.memo || '');
    setMCat(t.category_id ? String(t.category_id) : '');
    setMPay(t.payment_method_id ? String(t.payment_method_id) : '');
    setModalOpen(true);
    setModalClosing(false);
  }, []);

  const closeModal = useCallback(() => {
    if (!modalOpen) return;
    if (window.innerWidth < 768) {
      setModalClosing(true);
      setTimeout(() => { setModalOpen(false); setModalClosing(false); setEditingId(null); }, 240);
    } else {
      setModalOpen(false); setEditingId(null);
    }
  }, [modalOpen]);

  const switchModalType = useCallback((type) => {
    setModalType(type);
    setMCat('');
    setMPay('');
  }, []);

  /* set default cat/pay when filteredCats or allPays change while modal is open */
  useEffect(() => {
    if (modalOpen && !editingId) {
      if (filteredCats.length && !mCat) setMCat(String(filteredCats[0].id));
      if (allPays.length && !mPay) setMPay(String(allPays[0].id));
    }
  }, [modalOpen, editingId, filteredCats, allPays, mCat, mPay]);

  /* when switching type inside modal, pick first available cat */
  useEffect(() => {
    if (modalOpen) {
      const cats = allCats.filter(c => c.type === modalType);
      if (cats.length) setMCat(String(cats[0].id));
      if (allPays.length && !mPay) setMPay(String(allPays[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalType]);

  const applyDefaultIncome = useCallback(() => {
    if (!defaultIncome.name && !defaultIncome.amount) {
      showToast('설정에서 기본 수입을 먼저 등록해주세요');
      return;
    }
    if (defaultIncome.amount) setMAmount(Number(defaultIncome.amount).toLocaleString('ko-KR'));
    if (defaultIncome.name) setMDesc(defaultIncome.name);
    if (defaultIncome.day) {
      const lastDay = new Date(curYear, curMonth, 0).getDate();
      const day = Math.min(defaultIncome.day, lastDay);
      setMDate(`${curYear}-${String(curMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
    if (defaultIncome.category_id) setMCat(String(defaultIncome.category_id));
    if (defaultIncome.payment_method_id) setMPay(String(defaultIncome.payment_method_id));
  }, [defaultIncome, curYear, curMonth]);

  const handleAmountInput = useCallback((e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setMAmount(raw ? Number(raw).toLocaleString('ko-KR') : '');
  }, []);

  const submitTransaction = useCallback(async () => {
    const amount = Number(mAmount.replace(/,/g, ''));
    const name = mDesc.trim();
    const date = mDate;
    if (!amount || !name || !date) {
      showToast('금액, 내용, 날짜를 입력해주세요');
      return;
    }
    const body = {
      date,
      type: modalType,
      name,
      amount,
      category_id: mCat || null,
      payment_method_id: mPay || null,
      memo: mMemo.trim(),
    };
    try {
      if (editingId) {
        await API.transactions.update(editingId, body);
        showToast('수정했어요');
      } else {
        await API.transactions.create(body);
        showToast('거래를 추가했어요');
      }
      closeModal();
      loadList();
    } catch (err) {
      showToast((err && err.error) || '저장에 실패했어요');
    }
  }, [mAmount, mDesc, mDate, mCat, mPay, mMemo, modalType, editingId, closeModal, loadList]);

  /* ── overlay mousedown/click ───────────────────────── */
  const handleOverlayMouseDown = useCallback((e) => {
    overlayMouseDownRef.current = e.target === e.currentTarget;
  }, []);
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget && overlayMouseDownRef.current) closeModal();
  }, [closeModal]);

  /* ── group transactions by date ────────────────────── */
  const groupedTransactions = useMemo(() => {
    const groups = {};
    transactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return Object.entries(groups);
  }, [transactions]);

  /* ── balance ───────────────────────────────────────── */
  const balance = summary.income - summary.expense;

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  /* ── inline style objects (memoised where stable) ──── */
  const pageStyle = useMemo(() => ({
    height: '100%',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    background: S.bg,
    padding: isMobile ? '20px 16px 92px' : '36px 40px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    color: S.text,
    boxSizing: 'border-box',
  }), [isMobile]);

  /* ── header ────────────────────────────────────────── */
  const headerSubText = `${curYear}년 ${MONTH_NAMES[curMonth - 1]} · 총 ${totalCount}건`;

  return (
    <div style={pageStyle}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, letterSpacing: -0.5 }}>거래 내역</div>
          <div style={{ fontSize: isMobile ? 12 : 13, color: S.textMuted, marginTop: 2 }}>{headerSubText}</div>
        </div>
        <button onClick={openModal} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
          background: S.accent, color: '#fff', border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          whiteSpace: 'nowrap', transition: 'opacity .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >+ 거래 추가</button>
      </div>

      {/* SUMMARY BAR */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 12, marginBottom: 20 }}>
        {[
          { label: '수입', value: '+' + fmt(summary.income), cls: 'income' },
          { label: '지출', value: '-' + fmt(summary.expense), cls: 'expense' },
          { label: '순수익', value: (balance >= 0 ? '+' : '-') + fmt(Math.abs(balance)), cls: 'balance' },
        ].map(({ label, value, cls }) => (
          <div key={label} style={{
            background: S.surface, border: `1px solid ${S.border}`, borderRadius: S.radius,
            padding: isMobile ? '10px 10px' : '14px 20px', flex: 1, boxShadow: S.shadow,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: S.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
            <div style={{
              fontSize: isMobile ? 13 : 20, fontWeight: 700, letterSpacing: -0.5,
              color: cls === 'income' ? S.income : cls === 'expense' ? S.expense : (balance >= 0 ? S.income : S.expense),
            }}>{value}</div>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {/* month nav */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, background: S.surface,
          border: `1px solid ${S.border}`, borderRadius: 8, padding: '7px 14px',
          ...(isMobile ? { width: '100%', justifyContent: 'space-between' } : {}),
        }}>
          <button onClick={() => changeMonth(-1)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: S.textMuted,
            fontSize: 15, padding: '1px 3px', borderRadius: 4, lineHeight: 1,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = S.bg; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >{'\u2039'}</button>
          <span style={{ fontWeight: 600, fontSize: 13, minWidth: 76, textAlign: 'center' }}>
            {curYear}년 {MONTH_NAMES[curMonth - 1]}
          </span>
          <button onClick={() => changeMonth(1)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: S.textMuted,
            fontSize: 15, padding: '1px 3px', borderRadius: 4, lineHeight: 1,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = S.bg; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >{'\u203A'}</button>
        </div>

        {/* search */}
        <div style={{
          position: 'relative', flex: 1, minWidth: 180,
          ...(isMobile ? { order: 5, minWidth: '100%' } : {}),
        }}>
          <span style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            color: S.textMuted, fontSize: 14, pointerEvents: 'none',
          }}>{'\uD83D\uDD0D'}</span>
          <input
            type="text" placeholder="거래 내용 검색..." value={searchQ}
            onChange={handleSearchChange}
            style={{
              width: '100%', padding: '9px 12px 9px 34px', border: `1px solid ${S.border}`,
              borderRadius: 8, fontSize: 13, color: S.text, background: S.surface,
              outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = S.accent; }}
            onBlur={e => { e.target.style.borderColor = S.border; }}
          />
        </div>

        {/* category filter */}
        <select
          value={catFilterId} onChange={e => setCatFilterId(e.target.value)}
          style={{
            padding: isMobile ? '9px 20px 9px 8px' : '9px 28px 9px 12px',
            border: `1px solid ${S.border}`, borderRadius: 8, fontSize: isMobile ? 12 : 13,
            color: S.text, background: S.surface, outline: 'none', fontFamily: 'inherit',
            cursor: 'pointer', appearance: 'none',
            backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
            ...(isMobile ? { flex: 1, minWidth: 0 } : {}),
          }}
        >
          <option value="">전체 카테고리</option>
          {allCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* payment method filter */}
        <select
          value={payFilterId} onChange={e => setPayFilterId(e.target.value)}
          style={{
            padding: isMobile ? '9px 20px 9px 8px' : '9px 28px 9px 12px',
            border: `1px solid ${S.border}`, borderRadius: 8, fontSize: isMobile ? 12 : 13,
            color: S.text, background: S.surface, outline: 'none', fontFamily: 'inherit',
            cursor: 'pointer', appearance: 'none',
            backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
            ...(isMobile ? { flex: 1, minWidth: 0 } : {}),
          }}
        >
          <option value="">전체 결제수단</option>
          {allPays.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {/* type tabs */}
        <div style={{ display: 'flex', gap: 4, ...(isMobile ? { width: '100%' } : {}) }}>
          {[
            { key: 'all', label: '전체' },
            { key: 'income', label: '수입' },
            { key: 'expense', label: '지출' },
          ].map(({ key, label }) => {
            const isAct = typeFilter === key;
            let bgColor = 'transparent';
            let bdColor = S.border;
            let txtColor = S.textMuted;
            if (isAct && key === 'all') { bgColor = S.accent; bdColor = S.accent; txtColor = '#fff'; }
            if (isAct && key === 'income') { bgColor = S.incomeBg; bdColor = S.income; txtColor = S.income; }
            if (isAct && key === 'expense') { bgColor = S.expenseBg; bdColor = S.expense; txtColor = S.expense; }
            return (
              <button key={key} onClick={() => handleTypeFilter(key)} style={{
                padding: isMobile ? '8px 4px' : '8px 14px', borderRadius: 8,
                border: `1px solid ${bdColor}`, background: bgColor,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', color: txtColor,
                transition: 'all .15s', fontFamily: 'inherit',
                ...(isMobile ? { flex: 1, textAlign: 'center' } : {}),
              }}>{label}</button>
            );
          })}
        </div>
      </div>

      {/* TRANSACTION LIST */}
      <div style={{
        background: S.surface, border: `1px solid ${S.border}`, borderRadius: S.radius,
        overflow: 'hidden', boxShadow: S.shadow,
      }}>
        {groupedTransactions.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: S.textMuted }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{'\uD83D\uDCED'}</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>거래 내역이 없습니다</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>검색 조건을 바꾸거나 새 거래를 추가해보세요</div>
          </div>
        ) : (
          groupedTransactions.map(([date, items], gi) => {
            const d = new Date(date + 'T00:00:00');
            const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일`;
            const dayStr = DAY_NAMES[d.getDay()] + '요일';
            const dayIncome = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const dayExpense = items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

            return (
              <div key={date} style={{ borderBottom: gi < groupedTransactions.length - 1 ? `1px solid ${S.border}` : 'none' }}>
                {/* DATE HEADER */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 20px 9px', background: S.bg,
                  borderBottom: `1px solid ${S.border}`,
                  borderTop: gi > 0 ? `1px solid ${S.border}` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: S.textMuted }}>{dateStr}</span>
                    <span style={{ fontSize: 11, color: S.textMuted }}>{dayStr}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, fontSize: 11 }}>
                    {dayIncome > 0 && <span style={{ color: S.income }}>+{fmt(dayIncome)}</span>}
                    {dayIncome > 0 && dayExpense > 0 && <span style={{ color: S.textMuted }}>{' \u00B7 '}</span>}
                    {dayExpense > 0 && <span style={{ color: S.expense }}>-{fmt(dayExpense)}</span>}
                  </div>
                </div>

                {/* TRANSACTION ROWS */}
                {items.map((t, ti) => (
                  <TransactionRow
                    key={t.id}
                    t={t}
                    isMobile={isMobile}
                    isLast={ti === items.length - 1}
                    onEdit={openEditModal}
                    onDelete={deleteTx}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* ── MODAL ─────────────────────────────────────── */}
      {modalOpen && (
        <Portal>
        <div
          onMouseDown={handleOverlayMouseDown}
          onClick={handleOverlayClick}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100,
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            ...(isMobile ? { paddingBottom: 0 } : {}),
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            style={{
              background: S.surface, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,.12)',
              animation: modalClosing
                ? (isMobile ? 'txSlideDown .25s ease forwards' : 'txSlideDown .25s ease forwards')
                : (isMobile ? 'txSlideUp .25s ease' : 'txModalIn .18s ease'),
              ...(isMobile
                ? { width: '100%', maxWidth: '100%', borderRadius: '16px 16px 0 0', maxHeight: '85vh', overflowY: 'auto' }
                : { width: 400, maxWidth: '90vw', borderRadius: S.radius }),
            }}
          >
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: -16, paddingBottom: 8, flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, backgroundColor: S.border, borderRadius: 2 }} />
              </div>
            )}
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{editingId ? '거래 수정' : '거래 추가'}</div>
              <button onClick={closeModal} style={{
                background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
                color: S.textMuted, lineHeight: 1,
              }}>{'\u00D7'}</button>
            </div>

            {/* Type Toggle */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              border: `1px solid ${S.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 18,
            }}>
              <button onClick={() => switchModalType('expense')} style={{
                padding: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all .15s',
                background: modalType === 'expense' ? S.expenseBg : 'none',
                color: modalType === 'expense' ? S.expense : S.textMuted,
              }}>지출</button>
              <button onClick={() => switchModalType('income')} style={{
                padding: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all .15s',
                background: modalType === 'income' ? S.incomeBg : 'none',
                color: modalType === 'income' ? S.income : S.textMuted,
              }}>수입</button>
            </div>

            {/* Default Income Button */}
            {modalType === 'income' && (
              <div style={{ marginBottom: 14 }}>
                <button onClick={applyDefaultIncome} style={{
                  width: '100%', padding: '8px 12px', background: S.incomeBg, color: S.income,
                  border: `1px solid ${S.income}`, borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>{'\u21A9'} 기본 수입 불러오기</button>
              </div>
            )}

            {/* Amount + Date Row */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr) minmax(0,1fr)' : '1fr 1fr', gap: 12 }}>
              <div style={{ marginBottom: 14, ...(isMobile ? { minWidth: 0, overflow: 'hidden' } : {}) }}>
                <label style={labelStyle}>금액</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: S.textMuted, fontSize: 13 }}>{'\u20A9'}</span>
                  <input
                    ref={amountInputRef}
                    type="text" inputMode="numeric" placeholder="0"
                    value={mAmount} onChange={handleAmountInput}
                    style={{ ...inputStyle, paddingLeft: 28, textAlign: 'right', ...(isMobile ? { width: '100%', minWidth: 0, boxSizing: 'border-box' } : {}) }}
                    onFocus={e => { e.target.style.borderColor = S.accent; e.target.style.background = '#fff'; }}
                    onBlur={e => { e.target.style.borderColor = S.border; e.target.style.background = S.bg; }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 14, ...(isMobile ? { minWidth: 0, overflow: 'hidden' } : {}) }}>
                <label style={labelStyle}>날짜</label>
                <input
                  type="date" value={mDate} onChange={e => setMDate(e.target.value)}
                  style={{
                    ...inputStyle, textAlign: 'center',
                    WebkitAppearance: 'none', appearance: 'none', minHeight: 42, lineHeight: 'normal',
                    ...(isMobile ? { width: '100%', minWidth: 0, boxSizing: 'border-box' } : {}),
                  }}
                  onFocus={e => { e.target.style.borderColor = S.accent; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = S.border; e.target.style.background = S.bg; }}
                />
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>내용</label>
              <input
                type="text"
                placeholder={modalType === 'expense' ? '지출 내용' : '수입 내용 (예: 3월 급여)'}
                value={mDesc} onChange={e => setMDesc(e.target.value)}
                style={{ ...inputStyle, ...(isMobile ? { width: '100%', minWidth: 0, boxSizing: 'border-box' } : {}) }}
                onFocus={e => { e.target.style.borderColor = S.accent; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = S.border; e.target.style.background = S.bg; }}
              />
            </div>

            {/* Category + Payment Row */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr) minmax(0,1fr)' : '1fr 1fr', gap: 12 }}>
              <div style={{ marginBottom: 14, ...(isMobile ? { minWidth: 0, overflow: 'hidden' } : {}) }}>
                <label style={labelStyle}>{modalType === 'expense' ? '카테고리' : '수입 분류'}</label>
                <select
                  value={mCat} onChange={e => setMCat(e.target.value)}
                  style={{
                    ...inputStyle, textAlign: 'center', paddingLeft: 28, paddingRight: 28,
                    appearance: 'none', backgroundImage: SELECT_ARROW,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                    cursor: 'pointer',
                    ...(isMobile ? { width: '100%', minWidth: 0, boxSizing: 'border-box' } : {}),
                  }}
                >
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14, ...(isMobile ? { minWidth: 0, overflow: 'hidden' } : {}) }}>
                <label style={labelStyle}>{modalType === 'expense' ? '결제수단' : '입금수단'}</label>
                <select
                  value={mPay} onChange={e => setMPay(e.target.value)}
                  style={{
                    ...inputStyle, textAlign: 'center', paddingLeft: 28, paddingRight: 28,
                    appearance: 'none', backgroundImage: SELECT_ARROW,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                    cursor: 'pointer',
                    ...(isMobile ? { width: '100%', minWidth: 0, boxSizing: 'border-box' } : {}),
                  }}
                >
                  {allPays.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            {/* Memo */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>메모 (선택)</label>
              <input
                type="text" placeholder="간단한 메모"
                value={mMemo} onChange={e => setMMemo(e.target.value)}
                style={{ ...inputStyle, ...(isMobile ? { width: '100%', minWidth: 0, boxSizing: 'border-box' } : {}) }}
                onFocus={e => { e.target.style.borderColor = S.accent; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = S.border; e.target.style.background = S.bg; }}
              />
            </div>

            {/* Submit */}
            <button onClick={submitTransaction} style={{
              width: '100%', padding: 12, background: S.accent, color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'opacity .15s', marginTop: 4,
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {editingId ? '수정하기' : '추가하기'}
            </button>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}

/* ================================================================== */
/*  TransactionRow — extracted for hover control via className        */
/* ================================================================== */
const TransactionRow = React.memo(function TransactionRow({ t, isMobile, isLast, onEdit, onDelete }) {
  if (isMobile) {
    return (
      <div
        className="tx-row-wrap"
        onClick={() => onEdit(t.id)}
        style={{
          display: 'grid',
          gridTemplateColumns: '42px 1fr auto 30px',
          alignItems: 'center',
          gap: '0 14px',
          padding: '14px 20px',
          borderBottom: isLast ? 'none' : `1px solid ${S.border}`,
          cursor: 'pointer',
          transition: 'background .1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = S.bg; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {/* icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, background: t.category_color || '#f5f5f5',
        }}>
          {t.category_icon || '\u2022'}
        </div>

        {/* content: category + name + memo */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: S.textMuted, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t.category_name || '미분류'}{t.payment_name ? ` · ${t.payment_name}` : ''}
          </div>
          <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
          {t.memo && <div style={{ fontSize: 11, color: S.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.memo}</div>}
        </div>

        {/* amount */}
        <div style={{
          textAlign: 'right', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
          color: t.type === 'income' ? S.income : S.expense,
        }}>
          {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
        </div>

        {/* delete */}
        <button
          className="tx-delete-btn"
          onClick={e => onDelete(e, t.id)}
          style={{
            width: 28, height: 28, borderRadius: 6, border: 'none', background: 'none',
            cursor: 'pointer', fontSize: 14, color: '#ccc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = S.expenseBg; e.currentTarget.style.color = S.expense; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#ccc'; }}
        >{'\u2715'}</button>
      </div>
    );
  }

  /* desktop row */
  return (
    <div
      className="tx-row-wrap"
      onClick={() => onEdit(t.id)}
      style={{
        display: 'grid',
        gridTemplateColumns: '42px 1fr 100px 80px 36px',
        alignItems: 'center',
        gap: '0 14px',
        padding: '14px 20px',
        borderBottom: isLast ? 'none' : `1px solid ${S.border}`,
        transition: 'background .1s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = S.bg; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* icon */}
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, background: t.category_color || '#f5f5f5',
      }}>
        {t.category_icon || '\u2022'}
      </div>

      {/* content: category + name + memo */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: S.textMuted, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t.category_name || '미분류'}
        </div>
        <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
        {t.memo && <div style={{ fontSize: 11, color: S.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.memo}</div>}
      </div>

      {/* payment method */}
      <div style={{ fontSize: 11, color: S.textMuted, whiteSpace: 'nowrap' }}>
        {t.payment_name || '\u2014'}
      </div>

      {/* amount */}
      <div style={{
        textAlign: 'right', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap',
        color: t.type === 'income' ? S.income : S.expense,
      }}>
        {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
      </div>

      {/* delete */}
      <button
        className="tx-delete-btn"
        onClick={e => onDelete(e, t.id)}
        style={{
          width: 28, height: 28, borderRadius: 6, border: 'none', background: 'none',
          cursor: 'pointer', fontSize: 14, color: '#ccc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = S.expenseBg; e.currentTarget.style.color = S.expense; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#ccc'; }}
      >{'\u2715'}</button>
    </div>
  );
});

/* ── shared style objects ────────────────────────────── */
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600, color: S.textMuted,
  textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
};

const inputStyle = {
  width: '100%', padding: '10px 12px', border: `1px solid ${S.border}`,
  borderRadius: 8, fontSize: 13, color: S.text, background: S.bg,
  outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s',
  boxSizing: 'border-box',
};
