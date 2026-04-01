import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, MONTH_NAMES, DAY_NAMES, DONUT_COLORS, fmtShort, fmtY } from '../constants';
import API from '../api';

// ── Style constants ─────────────────────────────────────
const RADIUS = 12;
const SHADOW = '0 1px 3px rgba(0,0,0,.06)';

const S = {
  container: (isMobile) => ({
    height: '100%',
    overflowY: 'auto',
    padding: isMobile ? '20px 16px 92px' : '36px 40px',
    backgroundColor: COLORS.bg,
    boxSizing: 'border-box',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: COLORS.text,
    fontSize: 14,
  }),
  pageHeader: (isMobile) => ({
    display: 'flex',
    alignItems: isMobile ? 'flex-start' : 'center',
    justifyContent: 'space-between',
    flexDirection: isMobile ? 'column' : 'row',
    gap: isMobile ? 12 : 0,
    marginBottom: isMobile ? 20 : 24,
  }),
  pageTitle: (isMobile) => ({
    fontSize: isMobile ? 18 : 22,
    fontWeight: 700,
    letterSpacing: -0.5,
  }),
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerRight: (isMobile) => ({
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    gap: isMobile ? 8 : 10,
    alignItems: isMobile ? 'stretch' : 'center',
    width: isMobile ? '100%' : 'auto',
  }),
  periodTabs: (isMobile) => ({
    display: 'flex',
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: 3,
    gap: 2,
    width: isMobile ? '100%' : 'auto',
  }),
  periodTab: (active) => ({
    padding: '7px 18px',
    borderRadius: 7,
    border: 'none',
    background: active ? COLORS.accent : 'none',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    color: active ? '#fff' : COLORS.textMuted,
    fontFamily: 'inherit',
    transition: 'all .15s',
    flex: 1,
    textAlign: 'center',
  }),
  rangeNav: (isMobile) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: '7px 14px',
    width: isMobile ? '100%' : 'auto',
    justifyContent: isMobile ? 'space-between' : 'flex-start',
  }),
  rangeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: COLORS.textMuted,
    fontSize: 15,
    padding: '1px 3px',
    borderRadius: 4,
    fontFamily: 'inherit',
    lineHeight: 1,
  },
  rangeLabel: {
    fontWeight: 600,
    fontSize: 13,
    minWidth: 72,
    textAlign: 'center',
  },
  summaryGrid: (isMobile) => ({
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
    gap: isMobile ? 10 : 14,
    marginBottom: 22,
  }),
  card: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS,
    padding: '18px 22px',
    boxShadow: SHADOW,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  cardValue: (isMobile) => ({
    fontSize: isMobile ? 18 : 22,
    fontWeight: 700,
    letterSpacing: -0.5,
  }),
  twoCol: (isMobile) => ({
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
    gap: 16,
    alignItems: 'start',
  }),
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sc: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS,
    padding: '22px 24px',
    boxShadow: SHADOW,
  },
  scHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scTitle: {
    fontSize: 15,
    fontWeight: 600,
  },
  scSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  legend: {
    display: 'flex',
    gap: 14,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: (color) => ({
    width: 10,
    height: 10,
    borderRadius: 2,
    flexShrink: 0,
    background: color,
  }),
  canvas: {
    display: 'block',
    width: '100%',
  },
  // Savings rate
  savingsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  savingsBarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  savingsMonth: {
    fontSize: 11,
    color: COLORS.textMuted,
    minWidth: 28,
    whiteSpace: 'nowrap',
  },
  savingsBarWrap: {
    flex: 1,
    height: 8,
    background: COLORS.border,
    borderRadius: 99,
    overflow: 'hidden',
  },
  savingsBar: (width, color) => ({
    height: '100%',
    borderRadius: 99,
    width: `${width}%`,
    background: color,
  }),
  savingsPct: (color) => ({
    fontSize: 11,
    fontWeight: 600,
    minWidth: 32,
    textAlign: 'right',
    color: color,
  }),
  // Donut
  donutWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    height: 160,
  },
  donutCenter: {
    position: 'absolute',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  donutCenterValue: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: -0.5,
  },
  donutCenterLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  catList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
  },
  catRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  catDot: (color) => ({
    width: 9,
    height: 9,
    borderRadius: '50%',
    flexShrink: 0,
    background: color,
  }),
  catName: {
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
    minWidth: 0,
  },
  catAmount: {
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  catPct: {
    fontSize: 11,
    color: COLORS.textMuted,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    minWidth: 30,
    textAlign: 'right',
  },
  // Week rows
  weekRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  weekRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  weekLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    minWidth: 36,
    whiteSpace: 'nowrap',
  },
  weekBarWrap: {
    flex: 1,
    height: 8,
    background: COLORS.border,
    borderRadius: 99,
    overflow: 'hidden',
  },
  weekBar: (width) => ({
    height: '100%',
    borderRadius: 99,
    background: COLORS.expense,
    opacity: 0.8,
    width: `${width}%`,
  }),
  weekAmount: {
    fontSize: 11,
    fontWeight: 600,
    minWidth: 56,
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  // MoM
  momGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  momRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  momLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    whiteSpace: 'nowrap',
    minWidth: 64,
  },
  momBars: {
    flex: 1,
    display: 'flex',
    gap: 4,
    alignItems: 'flex-end',
    height: 32,
  },
  momBarItem: (height, isCurr) => ({
    flex: 1,
    borderRadius: '3px 3px 0 0',
    minHeight: 3,
    height: height,
    background: isCurr ? COLORS.expense : COLORS.border,
    opacity: isCurr ? 0.8 : 1,
  }),
  momDiff: (type) => ({
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    minWidth: 56,
    textAlign: 'right',
    color: type === 'up' ? COLORS.expense : type === 'dn' ? COLORS.income : COLORS.text,
  }),
  noData: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
};

// ── Component ──────────────────────────────────────────
export default function StatsPage({ isActive }) {
  const now = new Date();
  const [period, setPeriod] = useState('year');
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Data state
  const [summaryData, setSummaryData] = useState({ income: 0, expense: 0, saving: 0, rate: 0 });
  const [trendData, setTrendData] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [catRows, setCatRows] = useState([]);
  const [catTotal, setCatTotal] = useState(0);
  const [savingsRateData, setSavingsRateData] = useState(null);
  const [weekRowsData, setWeekRowsData] = useState([]);
  const [momData, setMomData] = useState(null);

  // Canvas refs
  const trendCanvasRef = useRef(null);
  const donutCanvasRef = useRef(null);
  const trendContainerRef = useRef(null);

  // Resize timer ref
  const resizeTimerRef = useRef(null);

  // Track last drawn data for resize redraws
  const lastTrendRef = useRef(null);
  const lastDailyRef = useRef(null);

  // ── Responsive ──
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Labels ──
  const rangeLabel = period === 'year'
    ? `${currentYear}년`
    : `${currentYear}년 ${MONTH_NAMES[currentMonth - 1]}`;

  const headerSub = period === 'year'
    ? `${currentYear}년 연간 리포트`
    : `${currentYear}년 ${MONTH_NAMES[currentMonth - 1]} 리포트`;

  const incomeLabel = period === 'year' ? '연간 수입' : '월 수입';
  const expenseLabel = period === 'year' ? '연간 지출' : '월 지출';
  const trendTitle = period === 'year' ? '월별 수입·지출' : '일별 지출';
  const momTitle = momData?.title || (period === 'year' ? '전년도 대비 지출 (월별)' : '전월 대비');

  // ── Period toggle ──
  const handleSetPeriod = useCallback((p) => {
    setPeriod(p);
  }, []);

  // ── Range navigation ──
  const handleChangeRange = useCallback((d) => {
    if (period === 'year') {
      setCurrentYear((y) => y + d);
    } else {
      setCurrentMonth((m) => {
        let newM = m + d;
        if (newM < 1) {
          setCurrentYear((y) => y - 1);
          return 12;
        }
        if (newM > 12) {
          setCurrentYear((y) => y + 1);
          return 1;
        }
        return newM;
      });
    }
  }, [period]);

  // ── Draw trend chart (year view: monthly bars) ──
  const drawTrendChart = useCallback((data) => {
    const canvas = trendCanvasRef.current;
    if (!canvas || !data || !data.length) return;
    const container = trendContainerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = container.clientWidth - 48;
    const cssH = 200;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const padL = 52, padR = 12, padT = 16, padB = 28;
    const cW = cssW - padL - padR, cH = cssH - padT - padB;
    const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1) * 1.15;
    const steps = 4;

    for (let i = 0; i <= steps; i++) {
      const y = padT + cH - (cH / steps) * i;
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + cW, y);
      ctx.stroke();
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(fmtY((maxVal / steps) * i), padL - 6, y + 3.5);
    }

    const groupW = cW / data.length;
    const barW = Math.min(groupW * 0.26, 14);
    const gap = 3;

    data.forEach((d, i) => {
      const cx = padL + groupW * i + groupW / 2;
      const incH = (d.income / maxVal) * cH;
      const expH = (d.expense / maxVal) * cH;

      ctx.fillStyle = 'rgba(45,122,79,.8)';
      ctx.beginPath();
      ctx.roundRect(cx - barW - gap / 2, padT + cH - incH, barW, incH, [3, 3, 0, 0]);
      ctx.fill();

      ctx.fillStyle = 'rgba(192,57,43,.75)';
      ctx.beginPath();
      ctx.roundRect(cx + gap / 2, padT + cH - expH, barW, expH, [3, 3, 0, 0]);
      ctx.fill();

      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(MONTH_NAMES[d.month - 1], cx, padT + cH + 18);
    });
  }, []);

  // ── Draw daily chart (month view: daily bars) ──
  const drawDailyChart = useCallback((daily) => {
    const canvas = trendCanvasRef.current;
    if (!canvas || !daily || !daily.length) return;
    const container = trendContainerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = container.clientWidth - 48;
    const cssH = 120;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const padL = 8, padR = 8, padT = 8, padB = 18;
    const cW = cssW - padL - padR, cH = cssH - padT - padB;
    const maxVal = Math.max(...daily.map((d) => d.expense), 1);
    const barW = Math.max((cW / daily.length) - 2, 2);

    const todayDate = new Date().getDate();
    const isCurrentMonth = new Date().getFullYear() === currentYear && new Date().getMonth() + 1 === currentMonth;

    daily.forEach((d, i) => {
      const day = i + 1;
      const x = padL + (cW / daily.length) * i + (cW / daily.length - barW) / 2;
      const barH = d.expense > 0 ? Math.max((d.expense / maxVal) * cH, 3) : 0;
      const y = padT + cH - barH;

      ctx.fillStyle = isCurrentMonth && day === todayDate ? COLORS.accent : 'rgba(192,57,43,.65)';
      if (barH > 0) {
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [2, 2, 0, 0]);
        ctx.fill();
      }

      if (day % 5 === 0 || day === 1) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(day, padL + (cW / daily.length) * i + (cW / daily.length) / 2, padT + cH + 14);
      }
    });
  }, [currentYear, currentMonth]);

  // ── Draw donut chart ──
  const drawDonutChart = useCallback((rows, total) => {
    const canvas = donutCanvasRef.current;
    if (!canvas) return;

    const size = 160;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2, r = 68, innerR = 45;
    let angle = -Math.PI / 2;

    if (!total) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = r - innerR;
      ctx.stroke();
    } else {
      rows.forEach((c, i) => {
        const slice = (c.total / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, angle, angle + slice);
        ctx.closePath();
        ctx.fillStyle = DONUT_COLORS[i % DONUT_COLORS.length];
        ctx.fill();
        angle += slice;
      });
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
  }, []);

  // ── Fetch & render year view ──
  const renderYear = useCallback(async () => {
    try {
      const [trend, prevTrend] = await Promise.all([
        API.transactions.monthlyTrend(currentYear),
        API.transactions.monthlyTrend(currentYear - 1),
      ]);

      const totalIncome = trend.reduce((s, d) => s + d.income, 0);
      const totalExpense = trend.reduce((s, d) => s + d.expense, 0);
      const saving = totalIncome - totalExpense;
      const rate = totalIncome > 0 ? Math.round((saving / totalIncome) * 100) : 0;

      setSummaryData({ income: totalIncome, expense: totalExpense, saving, rate });
      setTrendData(trend);
      setDailyData(null);
      lastTrendRef.current = trend;
      lastDailyRef.current = null;

      // Savings rate data
      setSavingsRateData(trend);

      // MoM (year-over-year comparison)
      const maxVal = Math.max(...trend.map((d) => d.expense), ...prevTrend.map((d) => d.expense), 1);
      const momRows = trend.map((d, i) => {
        const p = prevTrend[i]?.expense || 0;
        const diff = d.expense - p;
        return {
          label: MONTH_NAMES[d.month - 1],
          prevH: (p / maxVal) * 32,
          currH: (d.expense / maxVal) * 32,
          diff,
          diffText: (diff > 0 ? '+' : '') + fmtShort(diff),
          diffType: diff > 0 ? 'up' : diff < 0 ? 'dn' : '',
        };
      });
      setMomData({ title: '전년도 대비 지출 (월별)', rows: momRows });

      // Donut: aggregate all 12 months' byCategory data
      const months = await Promise.all(
        Array.from({ length: 12 }, (_, i) => API.transactions.byCategory(currentYear, i + 1, 'expense'))
      );
      const map = {};
      months.flat().forEach((c) => {
        const key = c.id;
        if (!map[key]) map[key] = { ...c, total: 0 };
        map[key].total += c.total;
      });
      const aggregated = Object.values(map).sort((a, b) => b.total - a.total);
      const total = aggregated.reduce((s, c) => s + c.total, 0);
      setCatRows(aggregated);
      setCatTotal(total);

      // Week rows not shown in year view
      setWeekRowsData([]);
    } catch (err) {
      console.error('Stats renderYear error:', err);
    }
  }, [currentYear]);

  // ── Fetch & render month view ──
  const renderMonth = useCallback(async () => {
    try {
      let prevMonth = currentMonth - 1, prevYear = currentYear;
      if (prevMonth < 1) { prevMonth = 12; prevYear--; }

      const [summary, prevSummary, daily] = await Promise.all([
        API.transactions.summary(currentYear, currentMonth),
        API.transactions.summary(prevYear, prevMonth),
        API.transactions.daily(currentYear, currentMonth),
      ]);

      const saving = summary.income - summary.expense;
      const rate = summary.income > 0 ? Math.round((saving / summary.income) * 100) : 0;

      setSummaryData({ income: summary.income, expense: summary.expense, saving, rate });
      setDailyData(daily);
      setTrendData(null);
      lastDailyRef.current = daily;
      lastTrendRef.current = null;

      // Savings rate not shown in month view
      setSavingsRateData(null);

      // Week rows
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
      setWeekRowsData(weeks);

      // MoM (month-over-month)
      const cats = [
        { label: '수입', curr: summary.income, prev: prevSummary.income },
        { label: '지출', curr: summary.expense, prev: prevSummary.expense },
        { label: '저축', curr: summary.income - summary.expense, prev: prevSummary.income - prevSummary.expense },
      ];
      const maxVal = Math.max(...cats.map((c) => Math.max(c.curr, c.prev, 0)), 1);
      const momRows = cats.map((c) => {
        const diff = c.curr - c.prev;
        return {
          label: c.label,
          prevH: (Math.max(c.prev, 0) / maxVal) * 32,
          currH: (Math.max(c.curr, 0) / maxVal) * 32,
          diff,
          diffText: (diff > 0 ? '+' : '') + fmtShort(diff),
          diffType: diff > 0 ? 'up' : diff < 0 ? 'dn' : '',
        };
      });
      setMomData({
        title: `전월 대비 (${prevYear}년 ${MONTH_NAMES[prevMonth - 1]})`,
        rows: momRows,
      });

      // Donut for single month
      const catData = await API.transactions.byCategory(currentYear, currentMonth, 'expense');
      const total = catData.reduce((s, c) => s + c.total, 0);
      setCatRows(catData);
      setCatTotal(total);
    } catch (err) {
      console.error('Stats renderMonth error:', err);
    }
  }, [currentYear, currentMonth]);

  // ── Main data fetch effect ──
  useEffect(() => {
    if (!isActive) return;
    if (period === 'year') {
      renderYear();
    } else {
      renderMonth();
    }
  }, [isActive, period, currentYear, currentMonth, renderYear, renderMonth]);

  // ── Draw trend/daily chart when data changes ──
  useEffect(() => {
    if (trendData) {
      drawTrendChart(trendData);
    } else if (dailyData) {
      drawDailyChart(dailyData);
    }
  }, [trendData, dailyData, drawTrendChart, drawDailyChart]);

  // ── Draw donut chart when category data changes ──
  useEffect(() => {
    drawDonutChart(catRows, catTotal);
  }, [catRows, catTotal, drawDonutChart]);

  // ── Debounced resize redraw ──
  useEffect(() => {
    const handleResize = () => {
      clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        if (lastTrendRef.current) {
          drawTrendChart(lastTrendRef.current);
        }
        if (lastDailyRef.current) {
          drawDailyChart(lastDailyRef.current);
        }
        drawDonutChart(catRows, catTotal);
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimerRef.current);
    };
  }, [drawTrendChart, drawDailyChart, drawDonutChart, catRows, catTotal]);

  // ── Savings rate rendering ──
  const renderSavingsRate = () => {
    if (!savingsRateData) return null;
    const months = savingsRateData.filter((d) => d.income > 0);
    if (!months.length) {
      return <div style={S.noData}>데이터 없음</div>;
    }

    const avg = months.reduce((s, d) => {
      const r = d.income > 0 ? Math.round(((d.income - d.expense) / d.income) * 100) : 0;
      return s + r;
    }, 0) / months.length;

    return (
      <>
        <div style={S.scHeader}>
          <div style={S.scTitle}>월별 저축률</div>
          <div style={S.scSub}>{`평균 ${Math.round(avg)}%`}</div>
        </div>
        <div style={S.savingsRow}>
          {months.map((d, idx) => {
            const rate = d.income > 0 ? Math.max(Math.round(((d.income - d.expense) / d.income) * 100), 0) : 0;
            const color = rate >= 30 ? COLORS.income : rate >= 10 ? COLORS.warn : COLORS.expense;
            return (
              <div key={idx} style={S.savingsBarRow}>
                <span style={S.savingsMonth}>{MONTH_NAMES[d.month - 1]}</span>
                <div style={S.savingsBarWrap}>
                  <div style={S.savingsBar(rate, color)} />
                </div>
                <span style={S.savingsPct(color)}>{rate}%</span>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // ── Week rows rendering ──
  const renderWeekRows = () => {
    if (!weekRowsData.length) return null;
    const maxExp = Math.max(...weekRowsData.map((w) => w.expense), 1);
    return (
      <div style={S.weekRows}>
        {weekRowsData.map((w, i) => (
          <div key={i} style={S.weekRow}>
            <span style={S.weekLabel}>{i + 1}주차</span>
            <div style={S.weekBarWrap}>
              <div style={S.weekBar((w.expense / maxExp) * 100)} />
            </div>
            <span style={S.weekAmount}>{fmtShort(w.expense)}</span>
          </div>
        ))}
      </div>
    );
  };

  // ── MoM rendering ──
  const renderMoM = () => {
    if (!momData || !momData.rows) return null;
    return (
      <div style={S.momGrid}>
        {momData.rows.map((row, i) => (
          <div key={i} style={S.momRow}>
            <span style={S.momLabel}>{row.label}</span>
            <div style={S.momBars}>
              <div style={S.momBarItem(row.prevH + 'px', false)} />
              <div style={S.momBarItem(row.currH + 'px', true)} />
            </div>
            <span style={S.momDiff(row.diffType)}>{row.diffText}</span>
          </div>
        ))}
      </div>
    );
  };

  // ── Category list rendering ──
  const renderCatList = () => {
    return (
      <div style={S.catList}>
        {catRows.slice(0, 6).map((c, i) => (
          <div key={c.id || i} style={S.catRow}>
            <div style={S.catDot(DONUT_COLORS[i % DONUT_COLORS.length])} />
            <span style={S.catName}>{c.name || '미분류'}</span>
            <span style={S.catAmount}>{fmtShort(c.total)}</span>
            <span style={S.catPct}>{catTotal > 0 ? Math.round((c.total / catTotal) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={S.container(isMobile)}>
      {/* Page Header */}
      <div style={S.pageHeader(isMobile)}>
        <div>
          <div style={S.pageTitle(isMobile)}>통계</div>
          <div style={S.pageSubtitle}>{headerSub}</div>
        </div>
        <div style={S.headerRight(isMobile)}>
          <div style={S.rangeNav(isMobile)}>
            <button
              style={S.rangeBtn}
              onClick={() => handleChangeRange(-1)}
              onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              &#8249;
            </button>
            <span style={S.rangeLabel}>{rangeLabel}</span>
            <button
              style={S.rangeBtn}
              onClick={() => handleChangeRange(1)}
              onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              &#8250;
            </button>
          </div>
          <div style={S.periodTabs(isMobile)}>
            <button
              style={S.periodTab(period === 'year')}
              onClick={() => handleSetPeriod('year')}
            >
              연간
            </button>
            <button
              style={S.periodTab(period === 'month')}
              onClick={() => handleSetPeriod('month')}
            >
              월간
            </button>
          </div>
        </div>
      </div>

      {/* Summary Grid */}
      <div style={S.summaryGrid(isMobile)}>
        <div style={S.card}>
          <div style={S.cardLabel}>{incomeLabel}</div>
          <div style={{ ...S.cardValue(isMobile), color: COLORS.income }}>{fmtShort(summaryData.income)}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>{expenseLabel}</div>
          <div style={{ ...S.cardValue(isMobile), color: COLORS.expense }}>{fmtShort(summaryData.expense)}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>순 저축</div>
          <div style={{ ...S.cardValue(isMobile), color: COLORS.income }}>{fmtShort(summaryData.saving)}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>저축률</div>
          <div style={{ ...S.cardValue(isMobile), color: COLORS.accent }}>{summaryData.rate}%</div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={S.twoCol(isMobile)}>
        {/* LEFT COLUMN */}
        <div style={S.col}>
          {/* Trend / Daily chart */}
          <div style={S.sc} ref={trendContainerRef}>
            <div style={S.scHeader}>
              <div style={S.scTitle}>{trendTitle}</div>
              {period === 'year' && (
                <div style={S.legend}>
                  <div style={S.legendItem}>
                    <div style={S.legendDot(COLORS.income)} />
                    <span>수입</span>
                  </div>
                  <div style={S.legendItem}>
                    <div style={S.legendDot(COLORS.expense)} />
                    <span>지출</span>
                  </div>
                </div>
              )}
            </div>
            <canvas ref={trendCanvasRef} style={S.canvas} />
          </div>

          {/* Savings rate (year view only) */}
          {period === 'year' && savingsRateData && (
            <div style={S.sc}>
              {renderSavingsRate()}
            </div>
          )}

          {/* Week rows (month view only) */}
          {period === 'month' && weekRowsData.length > 0 && (
            <div style={S.sc}>
              <div style={S.scHeader}>
                <div style={S.scTitle}>주차별 지출</div>
              </div>
              {renderWeekRows()}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={S.col}>
          {/* Donut chart */}
          <div style={S.sc}>
            <div style={S.scHeader}>
              <div style={S.scTitle}>카테고리별 지출</div>
            </div>
            <div style={S.donutWrap}>
              <canvas ref={donutCanvasRef} style={{ maxWidth: 160, maxHeight: 160 }} />
              <div style={S.donutCenter}>
                <div style={S.donutCenterValue}>{fmtShort(catTotal)}</div>
                <div style={S.donutCenterLabel}>총 지출</div>
              </div>
            </div>
            {renderCatList()}
          </div>

          {/* Month-over-month comparison */}
          <div style={S.sc}>
            <div style={S.scHeader}>
              <div style={S.scTitle}>{momTitle}</div>
              <div style={S.legend}>
                <div style={S.legendItem}>
                  <div style={S.legendDot(COLORS.border)} />
                  <span>이전</span>
                </div>
                <div style={S.legendItem}>
                  <div style={{ ...S.legendDot(COLORS.expense), opacity: 0.8 }} />
                  <span>현재</span>
                </div>
              </div>
            </div>
            {renderMoM()}
          </div>
        </div>
      </div>
    </div>
  );
}
