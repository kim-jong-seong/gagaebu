import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { COLORS, MONTH_NAMES, DAY_NAMES, BAR_COLORS, fmt, fmtY, formatAmountInput } from '../constants';
import API from '../api';
import { showToast } from '../Toast';
import Portal from '../Portal';

// ── 스타일 상수 ────────────────────────────────────────────
const RADIUS = 12;
const SHADOW = '0 1px 3px rgba(0,0,0,0.06)';
const BORDER = COLORS.border;
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const SELECT_ARROW = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239a9a95'/%3E%3C/svg%3E\")";

// ── 주차별 데이터 빌드 ──────────────────────────────────────
function buildWeekData(daily, year, month) {
  const weeks = [];
  const daysInMonth = daily.length;
  let weekNum = 0, weekStart = 1;

  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month - 1, day).getDay();
    if (day > 1 && dow === 0) { weekNum++; weekStart = day; }
    if (!weeks[weekNum]) weeks[weekNum] = { income: 0, expense: 0, start: weekStart, end: day };
    const d = daily[day - 1];
    weeks[weekNum].income += d.income;
    weeks[weekNum].expense += d.expense;
    weeks[weekNum].end = day;
  }

  return weeks.map((w, i) => ({
    label: `${i + 1}주\n${month}/${w.start}~${month}/${w.end}`,
    days: `${month}/${w.start} ~ ${month}/${w.end}`,
    income: w.income,
    expense: w.expense,
  }));
}

// ── 월별 바 차트 그리기 ─────────────────────────────────────
function drawMonthChart(canvas, data) {
  if (!canvas || !data || !data.length) return;
  const dpr = window.devicePixelRatio || 1;
  const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth - 48 : 400;
  const cssW = Math.max(parentWidth, 100);
  const cssH = 200;

  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const recent = data.slice(-6);
  const padL = 48, padR = 12, padT = 16, padB = 28;
  const cW = cssW - padL - padR;
  const cH = cssH - padT - padB;
  const maxVal = Math.max(...recent.map(d => Math.max(d.income, d.expense)), 1) * 1.15;
  const steps = 4;

  for (let i = 0; i <= steps; i++) {
    const y = padT + cH - (cH / steps) * i;
    ctx.strokeStyle = '#e8e8e5'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cW, y); ctx.stroke();
    ctx.fillStyle = '#9a9a95';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(fmtY((maxVal / steps) * i), padL - 6, y + 3.5);
  }

  const groupW = cW / recent.length;
  const barW = Math.min(groupW * 0.26, 18);
  const gap = 3;

  recent.forEach((d, i) => {
    const cx = padL + groupW * i + groupW / 2;
    const incH = (d.income / maxVal) * cH;
    const expH = (d.expense / maxVal) * cH;

    ctx.fillStyle = 'rgba(45,122,79,.80)';
    ctx.beginPath();
    ctx.roundRect(cx - barW - gap / 2, padT + cH - incH, barW, incH, [3, 3, 0, 0]);
    ctx.fill();

    ctx.fillStyle = 'rgba(192,57,43,.75)';
    ctx.beginPath();
    ctx.roundRect(cx + gap / 2, padT + cH - expH, barW, expH, [3, 3, 0, 0]);
    ctx.fill();

    const isLast = i === recent.length - 1;
    ctx.fillStyle = isLast ? '#1a1a1a' : '#9a9a95';
    ctx.font = `${isLast ? 'bold ' : ''}10px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(MONTH_NAMES[d.month - 1], cx, padT + cH + 18);
  });
}

// ── 주차별 라인 차트 그리기 ──────────────────────────────────
function drawWeekChart(canvas, weekData) {
  if (!canvas || !weekData || !weekData.length) return;
  const dpr = window.devicePixelRatio || 1;
  const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth - 48 : 400;
  const cssW = Math.max(parentWidth, 100);
  const cssH = 180;

  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const padL = 48, padR = 12, padT = 16, padB = 36;
  const cW = cssW - padL - padR;
  const cH = cssH - padT - padB;
  const maxVal = Math.max(...weekData.map(d => Math.max(d.income, d.expense)), 1) * 1.15;
  const steps = 4;

  for (let i = 0; i <= steps; i++) {
    const y = padT + cH - (cH / steps) * i;
    ctx.strokeStyle = '#e8e8e5'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cW, y); ctx.stroke();
    ctx.fillStyle = '#9a9a95';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(fmtY((maxVal / steps) * i), padL - 6, y + 3.5);
  }

  const groupW = cW / weekData.length;
  const point = (d, i) => ({ cx: padL + groupW * i + groupW / 2, y: padT + cH - (d.expense / maxVal) * cH });
  const pointInc = (d, i) => ({ cx: padL + groupW * i + groupW / 2, y: padT + cH - (d.income / maxVal) * cH });

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
  const last = point(weekData[weekData.length - 1], weekData.length - 1);
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
    ctx.fillStyle = '#9a9a95'; ctx.font = '10px -apple-system, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(lines[0], cx, padT + cH + 14);
    ctx.fillStyle = '#bbb'; ctx.font = '9px -apple-system, sans-serif';
    ctx.fillText(lines[1], cx, padT + cH + 26);
  });
}

// ── DashboardPage 컴포넌트 ─────────────────────────────────
export default function DashboardPage({ isActive }) {
  const now = useMemo(() => new Date(), []);

  // ── 상태 ──────────────────────────────────────────────
  const [curYear, setCurYear] = useState(now.getFullYear());
  const [curMonth, setCurMonth] = useState(now.getMonth() + 1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [summaryData, setSummaryData] = useState({ income: 0, expense: 0 });
  const [budgetPct, setBudgetPct] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [weekDaily, setWeekDaily] = useState(null);
  const [weekData, setWeekData] = useState([]);
  const [breakdownData, setBreakdownData] = useState([]);
  const [recentTxList, setRecentTxList] = useState([]);
  const [txFilter, setTxFilter] = useState('all');
  const [txCache, setTxCache] = useState({});

  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [defaultIncome, setDefaultIncome] = useState({});

  // Add panel state
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [addPanelClosing, setAddPanelClosing] = useState(false);
  const [currentType, setCurrentType] = useState('expense');
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [selectedPayId, setSelectedPayId] = useState(null);
  const [amountValue, setAmountValue] = useState('');
  const [descValue, setDescValue] = useState('');
  const [dateValue, setDateValue] = useState(now.toISOString().split('T')[0]);
  const [memoValue, setMemoValue] = useState('');

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalClosing, setEditModalClosing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editModalType, setEditModalTypeState] = useState('expense');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCatId, setEditCatId] = useState('');
  const [editPayId, setEditPayId] = useState('');
  const [editMemo, setEditMemo] = useState('');

  // Refs
  const monthChartRef = useRef(null);
  const weekChartRef = useRef(null);
  const trendDataRef = useRef(null);
  const weekDailyRef = useRef(null);
  const curYearRef = useRef(curYear);
  const curMonthRef = useRef(curMonth);
  const addOverlayMouseDownRef = useRef(null);
  const editOverlayMouseDownRef = useRef(null);
  const initializedRef = useRef(false);

  // Keep refs in sync
  curYearRef.current = curYear;
  curMonthRef.current = curMonth;
  trendDataRef.current = trendData;
  weekDailyRef.current = weekDaily;

  // ── 모바일 감지 ──────────────────────────────────────────
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── API 로드 함수들 ──────────────────────────────────────
  const loadCategories = useCallback(async () => {
    try {
      const all = await API.categories.list();
      setCategories({
        expense: all.filter(c => c.type === 'expense'),
        income: all.filter(c => c.type === 'income'),
      });
      return all;
    } catch { return []; }
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const pm = await API.paymentMethods.list();
      setPaymentMethods(pm);
      return pm;
    } catch { return []; }
  }, []);

  const loadDefaultIncome = useCallback(async () => {
    try {
      const s = await API.settings.get();
      setDefaultIncome({
        name: s.default_income_name || '',
        amount: s.default_income_amount || '',
        day: Number(s.default_income_day) || null,
        category_id: s.default_income_category_id || null,
        payment_method_id: s.default_income_payment_method_id || null,
      });
    } catch {}
  }, []);

  const loadSummary = useCallback(async (year, month) => {
    try {
      const s = await API.transactions.summary(year, month);
      setSummaryData({ income: s.income, expense: s.expense });

      try {
        const budget = await API.budgets.get(year, month);
        if (budget.amount > 0) {
          setBudgetPct(Math.round((s.expense / budget.amount) * 100));
        } else {
          setBudgetPct(null);
        }
      } catch {
        setBudgetPct(null);
      }
    } catch {}
  }, []);

  const loadMonthlyTrend = useCallback(async (year, month) => {
    try {
      const thisYear = await API.transactions.monthlyTrend(year);
      let combined = thisYear.slice(0, month);
      if (combined.length < 6) {
        const prevYear = await API.transactions.monthlyTrend(year - 1);
        const needed = 6 - combined.length;
        combined = [...prevYear.slice(-needed), ...combined];
      }
      setTrendData(combined);
    } catch {}
  }, []);

  const loadWeeklyChart = useCallback(async (year, month) => {
    try {
      const daily = await API.transactions.daily(year, month);
      setWeekDaily(daily);
      const wd = buildWeekData(daily, year, month);
      setWeekData(wd);
    } catch {}
  }, []);

  const loadBreakdown = useCallback(async (year, month) => {
    try {
      const data = await API.transactions.byCategory(year, month, 'expense');
      setBreakdownData(data);
    } catch {}
  }, []);

  const loadRecentTx = useCallback(async (year, month, filter) => {
    try {
      const params = { year, month, limit: 20 };
      if (filter !== 'all') params.type = filter;
      const res = await API.transactions.list(params);
      setRecentTxList(res.data);
      const cache = {};
      res.data.forEach(t => { cache[t.id] = t; });
      setTxCache(cache);
    } catch {}
  }, []);

  const loadAll = useCallback(async (year, month, filter) => {
    await Promise.all([
      loadSummary(year, month),
      loadMonthlyTrend(year, month),
      loadWeeklyChart(year, month),
      loadBreakdown(year, month),
      loadRecentTx(year, month, filter),
    ]);
  }, [loadSummary, loadMonthlyTrend, loadWeeklyChart, loadBreakdown, loadRecentTx]);

  // ── 초기화 ──────────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      const [allCats, pm] = await Promise.all([
        loadCategories(),
        loadPaymentMethods(),
        loadDefaultIncome(),
      ]);

      // Set default selections from loaded data
      const expCats = (allCats || []).filter(c => c.type === 'expense');
      if (expCats.length > 0) setSelectedCatId(expCats[0].id);

      await loadAll(curYearRef.current, curMonthRef.current, 'all');
    })();
  }, [loadCategories, loadPaymentMethods, loadDefaultIncome, loadAll]);

  // Set default payment method after load
  useEffect(() => {
    if (paymentMethods.length > 0 && selectedPayId === null) {
      setSelectedPayId(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedPayId]);

  // ── 탭 활성화 시 데이터 새로고침 ─────────────────────────
  const prevActiveRef = useRef(false);
  useEffect(() => {
    if (isActive && !prevActiveRef.current && initializedRef.current) {
      loadAll(curYearRef.current, curMonthRef.current, txFilter);
    }
    prevActiveRef.current = isActive;
  }, [isActive, loadAll, txFilter]);

  // ── 차트 그리기 ──────────────────────────────────────────
  useEffect(() => {
    if (trendData && monthChartRef.current) {
      drawMonthChart(monthChartRef.current, trendData);
    }
  }, [trendData, isMobile]);

  useEffect(() => {
    if (weekData.length > 0 && weekChartRef.current) {
      drawWeekChart(weekChartRef.current, weekData);
    }
  }, [weekData, isMobile]);

  // ── 리사이즈 시 차트 다시 그리기 ─────────────────────────
  useEffect(() => {
    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (trendDataRef.current && monthChartRef.current) {
          drawMonthChart(monthChartRef.current, trendDataRef.current);
        }
        if (weekDailyRef.current && weekChartRef.current) {
          const wd = buildWeekData(weekDailyRef.current, curYearRef.current, curMonthRef.current);
          drawWeekChart(weekChartRef.current, wd);
        }
      }, 150);
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, []);

  // ── 월 네비게이션 ────────────────────────────────────────
  const changeMonth = useCallback((d) => {
    setCurYear(prev => {
      let newMonth = curMonthRef.current + d;
      let newYear = prev;
      if (newMonth < 1) { newMonth = 12; newYear--; }
      if (newMonth > 12) { newMonth = 1; newYear++; }
      setCurMonth(newMonth);
      curMonthRef.current = newMonth;
      curYearRef.current = newYear;
      loadAll(newYear, newMonth, txFilter);
      return newYear;
    });
  }, [loadAll, txFilter]);

  // ── 필터 변경 ────────────────────────────────────────────
  const handleFilterChange = useCallback((filter) => {
    setTxFilter(filter);
    loadRecentTx(curYear, curMonth, filter);
  }, [curYear, curMonth, loadRecentTx]);

  // ── 타입 토글 (추가 패널) ────────────────────────────────
  const handleSetType = useCallback((type) => {
    setCurrentType(type);
    const cats = type === 'expense' ? categories.expense : categories.income;
    if (cats.length > 0) setSelectedCatId(cats[0].id);
    if (paymentMethods.length > 0) setSelectedPayId(paymentMethods[0].id);
  }, [categories, paymentMethods]);

  // ── 추가 패널 열기/닫기 ──────────────────────────────────
  const openAddPanel = useCallback(() => {
    setAddPanelOpen(true);
    setAddPanelClosing(false);
  }, []);

  const closeAddPanel = useCallback(() => {
    if (!addPanelOpen) return;
    if (window.innerWidth < 768) {
      setAddPanelClosing(true);
      setTimeout(() => { setAddPanelOpen(false); setAddPanelClosing(false); }, 240);
    } else {
      setAddPanelOpen(false);
    }
  }, [addPanelOpen]);

  // ── 기본 수입 불러오기 ───────────────────────────────────
  const applyDefaultIncome = useCallback(() => {
    if (!defaultIncome.name && !defaultIncome.amount) {
      showToast('설정에서 기본 수입을 먼저 등록해주세요');
      return;
    }
    if (defaultIncome.amount) setAmountValue(Number(defaultIncome.amount).toLocaleString('ko-KR'));
    if (defaultIncome.name) setDescValue(defaultIncome.name);
    if (defaultIncome.day) {
      const lastDay = new Date(curYear, curMonth, 0).getDate();
      const day = Math.min(defaultIncome.day, lastDay);
      setDateValue(`${curYear}-${String(curMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
    if (defaultIncome.category_id) setSelectedCatId(Number(defaultIncome.category_id));
    if (defaultIncome.payment_method_id) setSelectedPayId(Number(defaultIncome.payment_method_id));
  }, [defaultIncome, curYear, curMonth]);

  // ── 거래 추가 ──────────────────────────────────────────
  const addTransaction = useCallback(async () => {
    const amount = Number(amountValue.replace(/,/g, ''));
    const name = descValue.trim();
    const date = dateValue;
    const memo = memoValue.trim();

    if (!amount || !name || !date) { showToast('금액, 내용, 날짜를 입력해주세요'); return; }

    try {
      await API.transactions.create({
        date, type: currentType, name, amount,
        category_id: selectedCatId,
        payment_method_id: selectedPayId,
        memo,
      });
      setAmountValue('');
      setDescValue('');
      setMemoValue('');
      showToast('거래를 추가했어요');
      closeAddPanel();
      await loadAll(curYear, curMonth, txFilter);
    } catch (e) {
      showToast(e.error || '추가에 실패했어요');
    }
  }, [amountValue, descValue, dateValue, memoValue, currentType, selectedCatId, selectedPayId, closeAddPanel, loadAll, curYear, curMonth, txFilter]);

  // ── 수정 모달 ──────────────────────────────────────────
  const openEditModal = useCallback((id) => {
    const t = txCache[id];
    if (!t) return;

    setEditingId(id);
    setEditModalTypeState(t.type);
    setEditDate(t.date);
    setEditAmount(Number(t.amount).toLocaleString('ko-KR'));
    setEditDesc(t.name);
    setEditMemo(t.memo || '');
    setEditCatId(t.category_id ? String(t.category_id) : '');
    setEditPayId(t.payment_method_id ? String(t.payment_method_id) : '');
    setEditModalOpen(true);
    setEditModalClosing(false);
  }, [txCache]);

  const closeEditModal = useCallback(() => {
    if (!editModalOpen) return;
    if (window.innerWidth < 768) {
      setEditModalClosing(true);
      setTimeout(() => { setEditModalOpen(false); setEditModalClosing(false); setEditingId(null); }, 240);
    } else {
      setEditModalOpen(false); setEditingId(null);
    }
  }, [editModalOpen]);

  const setEditModalType = useCallback((type) => {
    setEditModalTypeState(type);
    const cats = type === 'expense' ? categories.expense : categories.income;
    if (cats.length > 0) setEditCatId(String(cats[0].id));
    if (paymentMethods.length > 0) setEditPayId(String(paymentMethods[0].id));
  }, [categories, paymentMethods]);

  const submitEditTransaction = useCallback(async () => {
    const amount = Number(editAmount.replace(/,/g, ''));
    const name = editDesc.trim();
    const date = editDate;
    const memo = editMemo.trim();

    if (!amount || !name || !date) { showToast('금액, 내용, 날짜를 입력해주세요'); return; }

    try {
      await API.transactions.update(editingId, {
        date, type: editModalType, name, amount,
        category_id: editCatId || null,
        payment_method_id: editPayId || null,
        memo,
      });
      showToast('수정했어요');
      closeEditModal();
      await loadAll(curYear, curMonth, txFilter);
    } catch (err) {
      showToast(err.error || '수정에 실패했어요');
    }
  }, [editAmount, editDesc, editDate, editMemo, editingId, editModalType, editCatId, editPayId, closeEditModal, loadAll, curYear, curMonth, txFilter]);

  // ── 파생 데이터 ──────────────────────────────────────────
  const balance = summaryData.income - summaryData.expense;
  const savingsRate = summaryData.income > 0 ? Math.round((balance / summaryData.income) * 100) : 0;

  const currentCats = useMemo(() => {
    return currentType === 'expense' ? categories.expense : categories.income;
  }, [currentType, categories]);

  const editCats = useMemo(() => {
    return editModalType === 'expense' ? categories.expense : categories.income;
  }, [editModalType, categories]);

  // 최근 거래 날짜 그룹
  const txGroups = useMemo(() => {
    const groups = {};
    recentTxList.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return Object.entries(groups);
  }, [recentTxList]);

  // 카테고리 분해 총합
  const breakdownTotal = useMemo(() => {
    return breakdownData.reduce((s, d) => s + d.total, 0);
  }, [breakdownData]);

  // ── 오버레이 마우스 이벤트 핸들러 ─────────────────────────
  const handleAddOverlayMouseDown = useCallback((e) => {
    addOverlayMouseDownRef.current = e.target;
  }, []);

  const handleAddOverlayClick = useCallback((e) => {
    if (addOverlayMouseDownRef.current === e.currentTarget) closeAddPanel();
  }, [closeAddPanel]);

  const handleEditOverlayMouseDown = useCallback((e) => {
    editOverlayMouseDownRef.current = e.target;
  }, []);

  const handleEditOverlayClick = useCallback((e) => {
    if (editOverlayMouseDownRef.current === e.currentTarget) closeEditModal();
  }, [closeEditModal]);

  // ── 금액 입력 포매팅 핸들러 ───────────────────────────────
  const handleAmountInput = useCallback((e) => {
    formatAmountInput(e.target);
    setAmountValue(e.target.value);
  }, []);

  const handleEditAmountInput = useCallback((e) => {
    formatAmountInput(e.target);
    setEditAmount(e.target.value);
  }, []);

  // ── 스타일 정의 ──────────────────────────────────────────
  const pageContainerStyle = useMemo(() => ({
    height: '100%',
    overflowY: 'auto',
    padding: isMobile ? '20px 16px 92px' : '36px 40px',
    boxSizing: 'border-box',
    backgroundColor: COLORS.bg,
    fontFamily: FONT,
  }), [isMobile]);

  const pageHeaderStyle = useMemo(() => ({
    display: 'flex',
    alignItems: isMobile ? 'center' : 'center',
    justifyContent: 'space-between',
    marginBottom: isMobile ? 20 : 28,
    flexWrap: isMobile ? 'wrap' : 'nowrap',
    gap: isMobile ? 8 : 0,
  }), [isMobile]);

  const summaryGridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
    gap: isMobile ? 10 : 16,
    marginBottom: isMobile ? 20 : 28,
  }), [isMobile]);

  const contentGridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 340px',
    gap: 20,
    alignItems: 'start',
  }), [isMobile]);

  const cardStyle = {
    background: COLORS.surface,
    border: `1px solid ${BORDER}`,
    borderRadius: RADIUS,
    padding: '20px 24px',
    boxShadow: SHADOW,
  };

  const chartSectionStyle = {
    background: COLORS.surface,
    border: `1px solid ${BORDER}`,
    borderRadius: RADIUS,
    padding: '20px 24px',
    boxShadow: SHADOW,
    marginBottom: 20,
  };

  const formControlStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    fontSize: 13,
    color: COLORS.text,
    background: COLORS.bg,
    outline: 'none',
    transition: 'border-color .15s',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const formLabelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  };

  // ── keyframes (inline style animation) ──────────────────
  const slideUpKeyframes = `
    @keyframes dashSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes dashSlideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
    @keyframes dashModalIn { from { opacity:0; transform: scale(.96) translateY(8px); } to { opacity:1; transform: none; } }
  `;

  // ── 렌더링 ──────────────────────────────────────────────
  return (
    <div style={pageContainerStyle}>
      <style>{slideUpKeyframes}</style>

      {/* 페이지 헤더 */}
      <div style={pageHeaderStyle}>
        <div style={{ flex: isMobile ? 1 : undefined }}>
          <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, letterSpacing: -0.5 }}>대시보드</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>
            {curYear}년 {MONTH_NAMES[curMonth - 1]} 지출 현황
          </div>
        </div>
        {isMobile && (
          <button onClick={openAddPanel} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
            background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap', transition: 'opacity .15s',
          }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            + 거래 추가
          </button>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, background: COLORS.surface,
          border: `1px solid ${BORDER}`, borderRadius: RADIUS, padding: '8px 16px',
          width: isMobile ? '100%' : undefined, justifyContent: isMobile ? 'space-between' : undefined,
        }}>
          <button onClick={() => changeMonth(-1)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted,
            fontSize: 16, lineHeight: 1, padding: '2px 4px', borderRadius: 4,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.bg; e.currentTarget.style.color = COLORS.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = COLORS.textMuted; }}
          >
            {'\u2039'}
          </button>
          <span style={{ fontWeight: 600, fontSize: 14, minWidth: 80, textAlign: 'center' }}>
            {curYear}년 {MONTH_NAMES[curMonth - 1]}
          </span>
          <button onClick={() => changeMonth(1)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted,
            fontSize: 16, lineHeight: 1, padding: '2px 4px', borderRadius: 4,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.bg; e.currentTarget.style.color = COLORS.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = COLORS.textMuted; }}
          >
            {'\u203A'}
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div style={summaryGridStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textMuted, marginBottom: 8 }}>이번 달 수입</div>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, letterSpacing: -1, color: COLORS.income }}>
            +{fmt(summaryData.income)}
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}></div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textMuted, marginBottom: 8 }}>이번 달 지출</div>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, letterSpacing: -1, color: COLORS.expense }}>
            -{fmt(summaryData.expense)}
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
            {budgetPct !== null ? `예산의 ${budgetPct}% 사용` : ''}
          </div>
        </div>
        <div style={{
          ...cardStyle,
          ...(isMobile ? { gridColumn: '1 / -1' } : {}),
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textMuted, marginBottom: 8 }}>잔액</div>
          <div style={{
            fontSize: isMobile ? 20 : 26, fontWeight: 700, letterSpacing: -1,
            color: balance >= 0 ? COLORS.income : COLORS.expense,
          }}>
            {(balance >= 0 ? '+' : '-') + fmt(Math.abs(balance))}
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
            저축률 {savingsRate}%
          </div>
        </div>
      </div>

      {/* 콘텐츠 그리드 */}
      <div style={contentGridStyle}>
        {/* 왼쪽 컬럼 */}
        <div>
          {/* 월별 흐름 차트 */}
          <div style={chartSectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>월별 흐름</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: COLORS.textMuted }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.income, opacity: 0.7, display: 'inline-block' }} />수입
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.expense, opacity: 0.7, display: 'inline-block' }} />지출
                </span>
              </div>
            </div>
            <canvas ref={monthChartRef} style={{ display: 'block', width: '100%', marginTop: 16 }} />
          </div>

          {/* 주차별 흐름 차트 */}
          <div style={chartSectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                주차별 흐름 <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textMuted }}>{curMonth}월</span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: COLORS.textMuted }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 14, borderTop: `2px solid ${COLORS.income}`, opacity: 0.8, display: 'inline-block' }} />수입
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 14, borderTop: `2px solid ${COLORS.expense}`, opacity: 0.8, display: 'inline-block' }} />지출
                </span>
              </div>
            </div>
            <canvas ref={weekChartRef} style={{ display: 'block', width: '100%' }} />
            {/* 주간 요약 */}
            <div style={{
              display: 'flex', gap: 0, marginTop: 14,
              border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden',
            }}>
              {weekData.map((d, i) => (
                <div key={i} style={{
                  flex: 1, padding: '10px 12px',
                  borderRight: i < weekData.length - 1 ? `1px solid ${BORDER}` : 'none',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 }}>{d.days}</div>
                  {d.income > 0 && (
                    <div style={{ fontSize: 11, color: COLORS.income, fontWeight: 600 }}>+{fmtY(d.income)}</div>
                  )}
                  <div style={{ fontSize: 11, color: COLORS.expense, fontWeight: 600 }}>-{fmtY(d.expense)}</div>
                  <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 3 }}>
                    {d.income - d.expense >= 0 ? '+' : ''}{fmtY(d.income - d.expense)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 카테고리별 지출 */}
          <div style={{ ...chartSectionStyle, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>카테고리별 지출</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              {breakdownData.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: COLORS.textMuted, fontSize: 13 }}>
                  지출 내역이 없어요
                </div>
              ) : (
                breakdownData.slice(0, 6).map((d, i) => {
                  const pct = breakdownTotal > 0 ? Math.round((d.total / breakdownTotal) * 100) : 0;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 15 }}>{d.icon || '\u2022'}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, minWidth: 36 }}>{d.name || '미분류'}</span>
                      <div style={{ flex: 1, height: 7, background: BORDER, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                      </div>
                      <span style={{ fontSize: 11, color: COLORS.textMuted, minWidth: 70, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {fmt(d.total)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 최근 거래 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>최근 거래</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { key: 'all', label: '전체' },
                  { key: 'income', label: '수입' },
                  { key: 'expense', label: '지출' },
                ].map(f => (
                  <button key={f.key} onClick={() => handleFilterChange(f.key)} style={{
                    padding: '5px 12px', borderRadius: 20,
                    border: txFilter === f.key ? `1px solid ${COLORS.accent}` : `1px solid ${BORDER}`,
                    background: txFilter === f.key ? COLORS.accent : 'none',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    color: txFilter === f.key ? '#fff' : COLORS.textMuted,
                    transition: 'all .15s', fontFamily: 'inherit',
                  }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{
              background: COLORS.surface, border: `1px solid ${BORDER}`,
              borderRadius: RADIUS, overflow: 'hidden', boxShadow: SHADOW,
            }}>
              {recentTxList.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: COLORS.textMuted, fontSize: 13 }}>
                  거래 내역이 없어요
                </div>
              ) : (
                txGroups.map(([date, items], gi) => {
                  const d = new Date(date + 'T00:00:00');
                  const label = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}  ${DAY_NAMES[d.getDay()]}요일`;
                  return (
                    <div key={date} style={{ borderBottom: gi < txGroups.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                      <div style={{
                        padding: '10px 20px 8px', fontSize: 11, fontWeight: 600,
                        color: COLORS.textMuted, background: COLORS.bg,
                        textTransform: 'uppercase', letterSpacing: 0.3,
                      }}>
                        {label}
                      </div>
                      {items.map((t, ti) => (
                        <div key={t.id} onClick={() => openEditModal(t.id)} style={{
                          display: 'flex', alignItems: 'center', padding: '14px 20px',
                          gap: 14, borderBottom: ti < items.length - 1 ? `1px solid ${BORDER}` : 'none',
                          cursor: 'pointer', transition: 'background .1s',
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.background = COLORS.bg}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: 38, height: 38, borderRadius: 10, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0,
                            background: t.category_color || '#f5f5f5',
                          }}>
                            {t.category_icon || '\u2022'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{t.name}</div>
                            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{t.memo || ''}</div>
                          </div>
                          <div style={{
                            fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap',
                            color: t.type === 'income' ? COLORS.income : COLORS.expense,
                          }}>
                            {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽: 거래 추가 패널 */}
        {isMobile ? (
          /* 모바일: 바텀 시트 오버레이 */
          addPanelOpen && (
            <Portal>
              <div
                onMouseDown={handleAddOverlayMouseDown}
                onClick={handleAddOverlayClick}
                style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100,
                  display: 'flex', alignItems: 'flex-end',
                }}
              >
                <div style={{
                  background: COLORS.surface, border: `1px solid ${BORDER}`,
                  borderRadius: '16px 16px 0 0', padding: 24, paddingBottom: 24,
                  boxShadow: SHADOW, width: '100%',
                  maxHeight: 'calc(85vh - 76px)', overflowY: 'auto',
                  animation: addPanelClosing ? 'dashSlideDown .25s ease' : 'dashSlideUp .25s ease',
                }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: -16, paddingBottom: 8, flexShrink: 0 }}>
                    <div style={{ width: 36, height: 4, backgroundColor: BORDER, borderRadius: 2 }} />
                  </div>
                  <AddPanelContent
                    isMobile={isMobile}
                    currentType={currentType}
                    handleSetType={handleSetType}
                    defaultIncome={defaultIncome}
                    applyDefaultIncome={applyDefaultIncome}
                    amountValue={amountValue}
                    handleAmountInput={handleAmountInput}
                    setAmountValue={setAmountValue}
                    descValue={descValue}
                    setDescValue={setDescValue}
                    dateValue={dateValue}
                    setDateValue={setDateValue}
                    currentCats={currentCats}
                    selectedCatId={selectedCatId}
                    setSelectedCatId={setSelectedCatId}
                    paymentMethods={paymentMethods}
                    selectedPayId={selectedPayId}
                    setSelectedPayId={setSelectedPayId}
                    memoValue={memoValue}
                    setMemoValue={setMemoValue}
                    addTransaction={addTransaction}
                    closeAddPanel={closeAddPanel}
                    formControlStyle={formControlStyle}
                    formLabelStyle={formLabelStyle}
                  />
                </div>
              </div>
            </Portal>
          )
        ) : (
          /* 데스크톱: sticky 사이드 패널 */
          <div style={{ position: 'sticky', top: 36 }}>
            <div style={{
              background: COLORS.surface, border: `1px solid ${BORDER}`,
              borderRadius: RADIUS, padding: 24, boxShadow: SHADOW,
            }}>
              <AddPanelContent
                isMobile={isMobile}
                currentType={currentType}
                handleSetType={handleSetType}
                defaultIncome={defaultIncome}
                applyDefaultIncome={applyDefaultIncome}
                amountValue={amountValue}
                handleAmountInput={handleAmountInput}
                setAmountValue={setAmountValue}
                descValue={descValue}
                setDescValue={setDescValue}
                dateValue={dateValue}
                setDateValue={setDateValue}
                currentCats={currentCats}
                selectedCatId={selectedCatId}
                setSelectedCatId={setSelectedCatId}
                paymentMethods={paymentMethods}
                selectedPayId={selectedPayId}
                setSelectedPayId={setSelectedPayId}
                memoValue={memoValue}
                setMemoValue={setMemoValue}
                addTransaction={addTransaction}
                closeAddPanel={closeAddPanel}
                formControlStyle={formControlStyle}
                formLabelStyle={formLabelStyle}
              />
            </div>
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {editModalOpen && (
        <Portal>
        <div
          onMouseDown={handleEditOverlayMouseDown}
          onClick={handleEditOverlayClick}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100,
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            paddingBottom: 0,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: COLORS.surface,
              borderRadius: isMobile ? '16px 16px 0 0' : RADIUS,
              padding: 28,
              width: isMobile ? '100%' : 400,
              maxWidth: isMobile ? '100%' : '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,.12)',
              animation: editModalClosing
                ? 'dashSlideDown .25s ease'
                : (isMobile ? 'dashSlideUp .25s ease' : 'dashModalIn .18s ease'),
            }}
          >
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: -16, paddingBottom: 8, flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, backgroundColor: BORDER, borderRadius: 2 }} />
              </div>
            )}
            {/* 모달 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>거래 수정</div>
              <button onClick={closeEditModal} style={{
                background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
                color: COLORS.textMuted, lineHeight: 1,
              }}>
                {'\u00D7'}
              </button>
            </div>

            {/* 타입 토글 */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', marginBottom: 18,
            }}>
              <button onClick={() => setEditModalType('expense')} style={{
                padding: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all .15s',
                background: editModalType === 'expense' ? COLORS.expenseBg : 'none',
                color: editModalType === 'expense' ? COLORS.expense : COLORS.textMuted,
              }}>지출</button>
              <button onClick={() => setEditModalType('income')} style={{
                padding: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all .15s',
                background: editModalType === 'income' ? COLORS.incomeBg : 'none',
                color: editModalType === 'income' ? COLORS.income : COLORS.textMuted,
              }}>수입</button>
            </div>

            {/* 금액 + 날짜 row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr 1fr',
              gap: 12,
            }}>
              <div style={{ marginBottom: 14, minWidth: 0, overflow: 'hidden' }}>
                <label style={formLabelStyle}>금액</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, fontSize: 13 }}>{'\u20A9'}</span>
                  <input
                    type="text" inputMode="numeric" placeholder="0"
                    value={editAmount}
                    onChange={handleEditAmountInput}
                    style={{ ...formControlStyle, paddingLeft: 28, textAlign: 'right', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                    onFocus={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.background = COLORS.bg; }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 14, minWidth: 0, overflow: 'hidden' }}>
                <label style={formLabelStyle}>날짜</label>
                <input
                  type="date" value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={{ ...formControlStyle, textAlign: 'center', WebkitAppearance: 'none', appearance: 'none', minHeight: 42, lineHeight: 'normal', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                  onFocus={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.background = COLORS.bg; }}
                />
              </div>
            </div>

            {/* 내용 */}
            <div style={{ marginBottom: 14 }}>
              <label style={formLabelStyle}>내용</label>
              <input
                type="text" placeholder="거래 내용"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                style={{ ...formControlStyle, width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.background = COLORS.bg; }}
              />
            </div>

            {/* 카테고리 + 결제수단 row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr 1fr',
              gap: 12,
            }}>
              <div style={{ marginBottom: 14, minWidth: 0, overflow: 'hidden' }}>
                <label style={formLabelStyle}>{editModalType === 'expense' ? '카테고리' : '수입 분류'}</label>
                <select
                  value={editCatId}
                  onChange={(e) => setEditCatId(e.target.value)}
                  style={{
                    ...formControlStyle,
                    textAlign: 'center', paddingLeft: 28, paddingRight: 28,
                    appearance: 'none', WebkitAppearance: 'none',
                    backgroundImage: SELECT_ARROW,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    width: '100%', minWidth: 0, boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.background = COLORS.bg; }}
                >
                  {editCats.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 14, minWidth: 0, overflow: 'hidden' }}>
                <label style={formLabelStyle}>{editModalType === 'expense' ? '결제수단' : '입금수단'}</label>
                <select
                  value={editPayId}
                  onChange={(e) => setEditPayId(e.target.value)}
                  style={{
                    ...formControlStyle,
                    textAlign: 'center', paddingLeft: 28, paddingRight: 28,
                    appearance: 'none', WebkitAppearance: 'none',
                    backgroundImage: SELECT_ARROW,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    width: '100%', minWidth: 0, boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.background = COLORS.bg; }}
                >
                  {paymentMethods.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 메모 */}
            <div style={{ marginBottom: 14 }}>
              <label style={formLabelStyle}>메모 (선택)</label>
              <input
                type="text" placeholder="간단한 메모"
                value={editMemo}
                onChange={(e) => setEditMemo(e.target.value)}
                style={{ ...formControlStyle, width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.background = COLORS.bg; }}
              />
            </div>

            {/* 수정 버튼 */}
            <button onClick={submitEditTransaction} style={{
              width: '100%', padding: 12, background: COLORS.accent, color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', marginTop: 4, fontFamily: 'inherit', transition: 'opacity .15s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              수정하기
            </button>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}

// ── 거래 추가 패널 (공통 콘텐츠) ────────────────────────────
function AddPanelContent({
  isMobile,
  currentType,
  handleSetType,
  defaultIncome,
  applyDefaultIncome,
  amountValue,
  handleAmountInput,
  setAmountValue,
  descValue,
  setDescValue,
  dateValue,
  setDateValue,
  currentCats,
  selectedCatId,
  setSelectedCatId,
  paymentMethods,
  selectedPayId,
  setSelectedPayId,
  memoValue,
  setMemoValue,
  addTransaction,
  closeAddPanel,
  formControlStyle,
  formLabelStyle,
}) {
  return (
    <>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 0 }}>거래 추가</div>
        {isMobile && (
          <button onClick={closeAddPanel} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            color: COLORS.textMuted, lineHeight: 1,
          }}>
            {'\u00D7'}
          </button>
        )}
      </div>

      {/* 타입 토글 */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 18,
      }}>
        <button onClick={() => handleSetType('expense')} style={{
          padding: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', transition: 'all .15s',
          background: currentType === 'expense' ? COLORS.expenseBg : 'none',
          color: currentType === 'expense' ? COLORS.expense : COLORS.textMuted,
        }}>지출</button>
        <button onClick={() => handleSetType('income')} style={{
          padding: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', transition: 'all .15s',
          background: currentType === 'income' ? COLORS.incomeBg : 'none',
          color: currentType === 'income' ? COLORS.income : COLORS.textMuted,
        }}>수입</button>
      </div>

      {/* 기본 수입 불러오기 버튼 */}
      {currentType === 'income' && (
        <div style={{ marginBottom: 14 }}>
          <button onClick={applyDefaultIncome} style={{
            width: '100%', padding: '8px 12px', background: COLORS.incomeBg,
            color: COLORS.income, border: `1px solid ${COLORS.income}`, borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {'\u21A9'} 기본 수입 불러오기
          </button>
        </div>
      )}

      {/* 금액 */}
      <div style={{ marginBottom: 14, overflow: 'hidden' }}>
        <label style={formLabelStyle}>금액</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, fontSize: 13 }}>{'\u20A9'}</span>
          <input
            type="text" inputMode="numeric" placeholder="0"
            value={amountValue}
            onChange={handleAmountInput}
            style={{ ...formControlStyle, paddingLeft: 28, textAlign: 'right', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
            onFocus={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.background = '#fff'; }}
            onBlur={(e) => { e.target.style.borderColor = COLORS.border; e.target.style.background = COLORS.bg; }}
          />
        </div>
      </div>

      {/* 내용 */}
      <div style={{ marginBottom: 14, overflow: 'hidden' }}>
        <label style={formLabelStyle}>내용</label>
        <input
          type="text"
          placeholder={currentType === 'expense' ? '거래 내용 입력' : '수입 내용 (예: 3월 급여)'}
          value={descValue}
          onChange={(e) => setDescValue(e.target.value)}
          style={{ ...formControlStyle, width: '100%', minWidth: 0, boxSizing: 'border-box' }}
          onFocus={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.background = '#fff'; }}
          onBlur={(e) => { e.target.style.borderColor = COLORS.border; e.target.style.background = COLORS.bg; }}
        />
      </div>

      {/* 날짜 */}
      <div style={{ marginBottom: 14, overflow: 'hidden' }}>
        <label style={formLabelStyle}>날짜</label>
        <input
          type="date" value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
          style={{
            ...formControlStyle, textAlign: 'center',
            WebkitAppearance: 'none', appearance: 'none',
            minHeight: 42, lineHeight: 'normal',
            width: '100%', minWidth: 0, boxSizing: 'border-box',
          }}
          onFocus={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.background = '#fff'; }}
          onBlur={(e) => { e.target.style.borderColor = COLORS.border; e.target.style.background = COLORS.bg; }}
        />
      </div>

      {/* 카테고리 */}
      <div style={{ marginBottom: 14 }}>
        <label style={formLabelStyle}>{currentType === 'expense' ? '카테고리' : '수입 분류'}</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {currentCats.map(c => {
            const isSelected = selectedCatId === c.id;
            return (
              <button key={c.id} onClick={() => setSelectedCatId(c.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '8px 4px', border: `1px solid ${isSelected ? COLORS.accent : COLORS.border}`,
                borderRadius: 8, background: isSelected ? COLORS.accentLight : COLORS.bg,
                cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', transition: 'all .15s',
                color: isSelected ? COLORS.accent : COLORS.textMuted,
              }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 결제수단 */}
      <div style={{ marginBottom: 14 }}>
        <label style={formLabelStyle}>{currentType === 'expense' ? '결제수단' : '입금수단'}</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {paymentMethods.map(p => {
            const isSelected = selectedPayId === p.id;
            return (
              <button key={p.id} onClick={() => setSelectedPayId(p.id)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '8px 4px', border: `1px solid ${isSelected ? COLORS.accent : COLORS.border}`,
                borderRadius: 8, background: isSelected ? COLORS.accentLight : COLORS.bg,
                cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', transition: 'all .15s',
                color: isSelected ? COLORS.accent : COLORS.textMuted,
              }}>
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 메모 */}
      <div style={{ marginBottom: 14, overflow: 'hidden' }}>
        <label style={formLabelStyle}>메모 (선택)</label>
        <input
          type="text" placeholder="간단한 메모"
          value={memoValue}
          onChange={(e) => setMemoValue(e.target.value)}
          style={{ ...formControlStyle, width: '100%', minWidth: 0, boxSizing: 'border-box' }}
          onFocus={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.background = '#fff'; }}
          onBlur={(e) => { e.target.style.borderColor = COLORS.border; e.target.style.background = COLORS.bg; }}
        />
      </div>

      {/* 추가 버튼 */}
      <button onClick={addTransaction} style={{
        width: '100%', padding: 12, background: COLORS.accent, color: '#fff',
        border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
        cursor: 'pointer', marginTop: 4, fontFamily: 'inherit', transition: 'opacity .15s',
      }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.88'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        추가하기
      </button>
    </>
  );
}
