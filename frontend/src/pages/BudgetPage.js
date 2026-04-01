import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, MONTH_NAMES, fmt, fmtShort } from '../constants';
import API from '../api';
import { showToast } from '../Toast';

const CAT_COLORS = ['#e67e22','#8e44ad','#2980b9','#16a085','#27ae60','#e74c3c','#f39c12','#7f8c8d'];

// 가이드 카드용 축약 표시 (10만원 이상만 축약, 소수점 포함)
function fmtS(n) {
  const a = Math.abs(n);
  if (a >= 100000000) return (a / 100000000).toFixed(1) + '억원';
  if (a >= 100000) {
    const v = a / 10000;
    return (v === Math.floor(v) ? v.toFixed(0) : v.toFixed(1)) + '만원';
  }
  return a.toLocaleString('ko-KR') + '원';
}

const RADIUS = 12;
const SHADOW = '0 1px 3px rgba(0,0,0,0.06)';

export default function BudgetPage({ isActive }) {
  /* ── state ─────────────────────────────────────────── */
  const now = new Date();
  const [curYear, setCurYear] = useState(now.getFullYear());
  const [curMonth, setCurMonth] = useState(now.getMonth() + 1);

  const [baseBudget, setBaseBudget] = useState(0);
  const [carryover, setCarryover] = useState(0);
  const [carryoverEnabled, setCarryoverEnabled] = useState(true);
  const [carryoverCardOpen, setCarryoverCardOpen] = useState(false);
  const [carryoverMonths, setCarryoverMonths] = useState([]);
  const [spent, setSpent] = useState(0);
  const [income, setIncome] = useState(0);
  const [dailyData, setDailyData] = useState([]);
  const [catData, setCatData] = useState([]);
  const [settings, setSettings] = useState({});

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  /* ── responsive ────────────────────────────────────── */
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── month navigation ──────────────────────────────── */
  const changeMonth = useCallback((d) => {
    setCurMonth((prev) => {
      let m = prev + d;
      let y = curYear;
      if (m < 1) { m = 12; setCurYear(y - 1); }
      if (m > 12) { m = 1; setCurYear(y + 1); }
      return m;
    });
    setCarryoverCardOpen(false);
    setEditing(false);
  }, [curYear]);

  /* ── data loading ──────────────────────────────────── */
  const loadAll = useCallback(async () => {
    try {
      const [settingsData, budgetData, summaryData, daily, cats] = await Promise.all([
        API.settings.get(),
        API.budgets.get(curYear, curMonth),
        API.transactions.summary(curYear, curMonth),
        API.transactions.daily(curYear, curMonth),
        API.transactions.byCategory(curYear, curMonth, 'expense'),
      ]);

      setSettings(settingsData);
      const coEnabled = settingsData.carryover_enabled === 'true';
      setCarryoverEnabled(coEnabled);
      setBaseBudget(budgetData.amount || 0);
      setSpent(summaryData.expense || 0);
      setIncome(summaryData.income || 0);
      setDailyData(daily || []);
      setCatData(cats || []);

      // carryover calculation
      if (coEnabled) {
        const raw = Number(settingsData.carryover_max_months);
        const maxMonths = raw > 0 ? raw : 12;
        const fetches = [];
        for (let i = maxMonths; i >= 1; i--) {
          let m = curMonth - i;
          let y = curYear;
          if (m < 1) { m += 12; y--; }
          fetches.push({ y, m });
        }
        const results = await Promise.all(
          fetches.map(({ y, m }) => API.transactions.summary(y, m))
        );
        const months = results.map((s, idx) => ({
          year: fetches[idx].y,
          month: fetches[idx].m,
          income: s.income || 0,
          spent: s.expense || 0,
        }));
        setCarryoverMonths(months);
        const total = months.reduce((t, m) => t + Math.max(m.income - m.spent, 0), 0);
        setCarryover(total);
      } else {
        setCarryover(0);
        setCarryoverMonths([]);
      }
    } catch (e) {
      console.error('BudgetPage loadAll error:', e);
    }
  }, [curYear, curMonth]);

  useEffect(() => {
    if (isActive) loadAll();
  }, [isActive, loadAll]);

  /* ── derived values ────────────────────────────────── */
  const effectiveCarryover = carryoverEnabled ? carryover : 0;
  const budgetRemain = baseBudget - spent;
  const pct = baseBudget > 0 ? Math.min((spent / baseBudget) * 100, 100) : 0;
  const level = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'safe';
  const balance = income + effectiveCarryover - spent;

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === curYear && today.getMonth() + 1 === curMonth;
  const daysInMonth = new Date(curYear, curMonth, 0).getDate();
  const elapsed = isCurrentMonth ? today.getDate() : daysInMonth;
  const daysLeft = isCurrentMonth ? daysInMonth - elapsed : 0;

  const avgDaily = elapsed > 0 ? Math.round(spent / elapsed) : 0;
  const perDay = daysLeft > 0 && budgetRemain > 0 ? Math.round(budgetRemain / daysLeft) : 0;
  const forecast = elapsed > 0 ? Math.round((spent / elapsed) * daysInMonth) : 0;
  const forecastDiff = forecast - baseBudget;

  const levelColor = level === 'over' ? COLORS.expense : level === 'warn' ? COLORS.warn : COLORS.income;
  const levelBg = level === 'over' ? COLORS.expenseBg : level === 'warn' ? COLORS.warnBg : COLORS.incomeBg;

  /* ── budget edit ───────────────────────────────────── */
  const startEdit = () => {
    setEditing(true);
    setEditValue(String(baseBudget));
    setTimeout(() => inputRef.current && inputRef.current.focus(), 50);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = async () => {
    const val = Number(editValue);
    if (!val || val < 0) {
      showToast('올바른 금액을 입력해주세요');
      return;
    }
    try {
      await API.budgets.set(curYear, curMonth, val);
      setBaseBudget(val);
      setEditing(false);
      showToast('예산을 저장했어요');
      loadAll();
    } catch (e) {
      showToast('저장에 실패했어요');
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  /* ── daily strip ───────────────────────────────────── */
  const todayDate = isCurrentMonth ? today.getDate() : -1;
  const maxDayExpense = dailyData.length > 0 ? Math.max(...dailyData.map((d) => d.expense || 0), 1) : 1;

  /* ── carryover card ────────────────────────────────── */
  const activeCarryoverMonths = carryoverMonths.filter((m) => m.income > 0 || m.spent > 0);
  const totalCarry = carryoverMonths.reduce((s, m) => s + Math.max(m.income - m.spent, 0), 0);

  /* ── category breakdown ────────────────────────────── */
  const catTotal = catData.reduce((s, c) => s + (c.total || 0), 0);

  const monthLabel = curYear + '년 ' + MONTH_NAMES[curMonth - 1];

  /* ── status message ────────────────────────────────── */
  let statusText = '';
  let statusBg = COLORS.bg;
  let statusColor = COLORS.textMuted;
  let statusBorder = `1px solid ${COLORS.border}`;
  if (baseBudget === 0) {
    statusText = '예산을 설정해주세요';
  } else if (level === 'over') {
    statusText = '\u26A0\uFE0F 예산을 ' + fmt(Math.abs(budgetRemain)) + ' 초과했어요';
    statusBg = COLORS.expenseBg;
    statusColor = COLORS.expense;
    statusBorder = 'none';
  } else if (level === 'warn') {
    statusText = '\u26A1 예산의 80%를 넘었어요. 남은 금액 ' + fmt(budgetRemain);
    statusBg = COLORS.warnBg;
    statusColor = COLORS.warn;
    statusBorder = 'none';
  } else {
    statusText = '\u2705 양호해요. 남은 예산 ' + fmt(budgetRemain);
    statusBg = COLORS.incomeBg;
    statusColor = COLORS.income;
    statusBorder = 'none';
  }

  /* ── render ────────────────────────────────────────── */
  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      background: COLORS.bg,
      padding: isMobile ? '20px 16px 92px' : '36px 40px',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: COLORS.text,
      fontSize: 14,
      boxSizing: 'border-box',
    }}>
      {/* ── Page Header ──────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        marginBottom: isMobile ? 20 : 28,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 12 : 0,
      }}>
        <div>
          <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, letterSpacing: -0.5 }}>예산 관리</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>{monthLabel}</div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 8, padding: '7px 14px',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'space-between' : 'flex-start',
        }}>
          <button onClick={() => changeMonth(-1)} style={monthBtnStyle}>{'\u2039'}</button>
          <span style={{ fontWeight: 600, fontSize: 13, minWidth: 76, textAlign: 'center' }}>{monthLabel}</span>
          <button onClick={() => changeMonth(1)} style={monthBtnStyle}>{'\u203A'}</button>
        </div>
      </div>

      {/* ── Budget Hero ──────────────────────────────── */}
      <div style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS, padding: isMobile ? 20 : '28px 32px',
        boxShadow: SHADOW, marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textMuted, marginBottom: 8 }}>
          이번 달 예산
        </div>

        {/* Display mode */}
        {!editing && (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span
                  onClick={startEdit}
                  title="클릭해서 수정"
                  style={{
                    fontSize: isMobile ? 24 : 32, fontWeight: 700, letterSpacing: -1,
                    cursor: 'pointer', borderBottom: `2px dashed ${COLORS.border}`,
                    paddingBottom: 1, transition: 'border-color .15s', lineHeight: 1.1,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = COLORS.accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = COLORS.border; }}
                >
                  {baseBudget.toLocaleString('ko-KR')}
                </span>
                <span style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 500 }}>원</span>
              </div>

              {/* carryover in formula if enabled */}
              {carryoverEnabled && carryover > 0 && (
                <>
                  <span style={{ fontSize: 18, color: COLORS.textMuted, fontWeight: 300 }}>+</span>
                  <div
                    onClick={() => setCarryoverCardOpen((v) => !v)}
                    style={{
                      display: 'flex', alignItems: 'baseline', gap: 4,
                      background: COLORS.carryoverBg, border: '1px solid rgba(123,63,228,.2)',
                      borderRadius: 8, padding: '4px 10px', cursor: 'pointer', transition: 'all .15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.carryover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(123,63,228,.2)'; }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.carryover, letterSpacing: -0.5 }}>
                      {fmt(carryover)}
                    </span>
                    <span style={{ fontSize: 11, color: COLORS.carryover, fontWeight: 600 }}>이월</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, ...(isMobile ? { width: '100%' } : {}) }}>
                    <span style={{ fontSize: 18, color: COLORS.textMuted, fontWeight: 300 }}>=</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, letterSpacing: -0.5 }}>
                        {(baseBudget + carryover).toLocaleString('ko-KR')}
                      </span>
                      <span style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 500 }}>원</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>예산 클릭해서 수정</div>
          </div>
        )}

        {/* Edit mode */}
        {editing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <input
              ref={inputRef}
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleEditKeyDown}
              placeholder="0"
              style={{
                fontSize: 24, fontWeight: 700, letterSpacing: -0.5,
                border: 'none', borderBottom: `2px solid ${COLORS.accent}`,
                outline: 'none', background: 'transparent', width: 180,
                fontFamily: 'inherit', color: COLORS.text,
              }}
            />
            <span style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 500 }}>원</span>
            <button onClick={saveEdit} style={{
              padding: '6px 14px', background: COLORS.accent, color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>저장</button>
            <button onClick={cancelEdit} style={{
              padding: '6px 10px', background: 'none', color: COLORS.textMuted,
              border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>취소</button>
          </div>
        )}

        {/* Progress bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ height: 12, background: COLORS.border, borderRadius: 99, overflow: 'hidden', marginBottom: 10, position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 99,
              width: pct + '%',
              background: levelColor,
              transition: 'width .5s cubic-bezier(.4,0,.2,1), background .3s',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLORS.textMuted }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: levelColor }}>{Math.round(pct)}%</span>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>{fmt(spent)} / {fmt(baseBudget)}</span>
          </div>
          <div style={{
            marginTop: 14, padding: '11px 15px', borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8,
            background: baseBudget === 0 ? COLORS.bg : statusBg,
            color: statusColor,
            border: baseBudget === 0 ? statusBorder : 'none',
          }}>
            {statusText}
          </div>
        </div>
      </div>

      {/* ── Carryover Card ───────────────────────────── */}
      {carryoverEnabled && carryoverCardOpen && (
        <div style={{
          background: COLORS.carryoverBg, border: '1px solid rgba(123,63,228,.2)',
          borderRadius: RADIUS, padding: '18px 22px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.carryover, display: 'flex', alignItems: 'center', gap: 6 }}>
              {'\u21A9'} 이월 내역
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.carryover }}>총 이월 {fmt(totalCarry)}</div>
          </div>
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {activeCarryoverMonths.map((m, i) => {
              const remain = m.income - m.spent;
              const barPct = m.income > 0 ? Math.min(Math.round((m.spent / m.income) * 100), 100) : 0;
              const isLast = i === activeCarryoverMonths.length - 1;
              return (
                <div key={m.year + '-' + m.month} style={{
                  flex: 1, padding: '10px 14px',
                  borderRight: isLast ? 'none' : '1px solid rgba(123,63,228,.15)',
                  position: 'relative',
                  background: isLast ? 'rgba(123,63,228,.06)' : 'transparent',
                  borderRadius: isLast ? 8 : 0,
                }}>
                  {!isLast && (
                    <div style={{
                      position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 14, color: COLORS.carryover, opacity: 0.5, zIndex: 1,
                    }}>{'\u203A'}</div>
                  )}
                  <div style={{ fontSize: 11, color: COLORS.carryover, fontWeight: 600, marginBottom: 4, opacity: 0.7 }}>
                    {m.year}년 {MONTH_NAMES[m.month - 1]}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}>수입 {fmt(m.income)}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>지출 {fmt(m.spent)}</div>
                  <div style={{
                    fontSize: 14, fontWeight: 700,
                    color: remain < 0 ? COLORS.expense : COLORS.carryover,
                  }}>
                    {remain >= 0 ? '+' : '-'}{fmt(Math.abs(remain))}
                  </div>
                  <div style={{ height: 4, background: 'rgba(123,63,228,.15)', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ height: '100%', background: COLORS.carryover, borderRadius: 99, width: barPct + '%' }} />
                  </div>
                </div>
              );
            })}
            {activeCarryoverMonths.length === 0 && (
              <div style={{ color: COLORS.textMuted, fontSize: 13 }}>이월 대상 기간에 거래 내역이 없습니다</div>
            )}
          </div>
        </div>
      )}

      {/* ── Money Flow Card ──────────────────────────── */}
      <div style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS, padding: isMobile ? '16px 12px' : '20px 28px',
        boxShadow: SHADOW, marginBottom: 16,
        display: 'flex', alignItems: 'center',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}>
        {/* income */}
        <div style={{ flex: 1, textAlign: 'center', padding: '8px 12px', minWidth: isMobile ? '50%' : 'auto' }}>
          <div style={mfLabelStyle}>수입</div>
          <div style={{ ...mfValueStyle, color: COLORS.income }}>{fmt(income)}</div>
        </div>

        {/* + separator (carryover) */}
        {carryoverEnabled && !isMobile && (
          <div style={mfSepStyle}>+</div>
        )}

        {/* carryover stat */}
        {carryoverEnabled && (
          <div style={{ flex: 1, textAlign: 'center', padding: '8px 12px', minWidth: isMobile ? '50%' : 'auto' }}>
            <div style={mfLabelStyle}>이월</div>
            <div
              onClick={() => setCarryoverCardOpen((v) => !v)}
              style={{ ...mfValueStyle, color: COLORS.carryover, cursor: 'pointer' }}
            >
              {fmt(effectiveCarryover)}
            </div>
          </div>
        )}

        {/* - separator */}
        {!isMobile && <div style={mfSepStyle}>{'\u2212'}</div>}

        {/* spent */}
        <div style={{ flex: 1, textAlign: 'center', padding: '8px 12px', minWidth: isMobile ? '50%' : 'auto' }}>
          <div style={mfLabelStyle}>사용</div>
          <div style={{ ...mfValueStyle, color: COLORS.expense }}>{fmt(spent)}</div>
        </div>

        {/* = separator */}
        {!isMobile && <div style={mfSepStyle}>=</div>}

        {/* balance */}
        <div style={{ flex: 1, textAlign: 'center', padding: '8px 12px', minWidth: isMobile ? '50%' : 'auto' }}>
          <div style={mfLabelStyle}>잔액</div>
          <div style={{
            ...mfValueStyle,
            color: balance >= 0 ? COLORS.income : COLORS.expense,
          }}>
            {(balance < 0 ? '-' : '') + fmt(Math.abs(balance))}
          </div>
        </div>
      </div>

      {/* ── Guide Cards ──────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
        gap: isMobile ? 10 : 14,
        marginBottom: 16,
      }}>
        {/* daily average */}
        <div style={guideCardStyle}>
          <div style={guideCardLabelStyle}>하루 평균 지출</div>
          <div style={guideCardValueStyle}>{fmtS(avgDaily)}</div>
          <div style={guideCardSubStyle}>{elapsed}일 기준</div>
        </div>

        {/* available per day */}
        <div style={guideCardStyle}>
          <div style={guideCardLabelStyle}>하루 가능 금액</div>
          <div style={guideCardValueStyle}>{daysLeft > 0 ? fmtS(perDay) : '\u2014'}</div>
          <div style={guideCardSubStyle}>{daysLeft > 0 ? '남은 ' + daysLeft + '일' : '월 마감'}</div>
        </div>

        {/* forecast */}
        <div style={{
          ...guideCardStyle,
          ...(isMobile ? { gridColumn: '1 / -1' } : {}),
        }}>
          <div style={guideCardLabelStyle}>예상 월말 지출</div>
          <div style={guideCardValueStyle}>{fmtS(forecast)}</div>
          <div style={guideCardSubStyle}>
            {baseBudget > 0
              ? (forecastDiff > 0
                ? '예산 ' + fmtS(forecastDiff) + ' 초과 예상'
                : '예산 내 ' + fmtS(Math.abs(forecastDiff)) + ' 여유')
              : ''
            }
          </div>
        </div>
      </div>

      {/* ── Daily Spending Strip ─────────────────────── */}
      <div style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS, padding: '22px 26px',
        boxShadow: SHADOW, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>일별 지출</div>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>최대 {fmtS(maxDayExpense)}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {dailyData.map((d, i) => {
            const day = i + 1;
            const expense = d.expense || 0;
            const h = expense > 0 ? Math.max(Math.round((expense / maxDayExpense) * 38), 2) : 0;
            const barColor = expense > 0 ? COLORS.expense : COLORS.border;
            const isToday = day === todayDate;
            return (
              <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 36 }}>
                <div style={{ width: 28, height: 40, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{
                    width: '100%', borderRadius: '3px 3px 0 0', minHeight: 2,
                    height: h, background: barColor, opacity: 0.75,
                  }} />
                </div>
                <div style={{
                  fontSize: 10,
                  color: isToday ? COLORS.accent : COLORS.textMuted,
                  fontWeight: isToday ? 700 : 400,
                }}>{day}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Category Breakdown ───────────────────────── */}
      <div style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS, padding: '22px 26px',
        boxShadow: SHADOW, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>카테고리별 지출</div>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>사용 가능 예산 기준</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {catData.length === 0 && (
            <div style={{ color: COLORS.textMuted, fontSize: 13 }}>지출 내역이 없어요</div>
          )}
          {catData.map((c, i) => {
            const catPct = catTotal > 0 ? Math.round((c.total / catTotal) * 100) : 0;
            const budPct = baseBudget > 0 ? Math.round((c.total / baseBudget) * 100) : 0;
            return (
              <div key={c.name || i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{c.icon || '\u2022'}</span>
                <span style={{ fontSize: 13, fontWeight: 500, minWidth: 48 }}>{c.name || '미분류'}</span>
                <div style={{ flex: 1, height: 7, background: COLORS.border, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 99, width: catPct + '%',
                    background: CAT_COLORS[i % CAT_COLORS.length],
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, minWidth: 80, textAlign: 'right' }}>{fmt(c.total)}</span>
                <span style={{ fontSize: 11, color: COLORS.textMuted, minWidth: 36, textAlign: 'right' }}>{budPct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── shared inline style objects ───────────────────────── */

const monthBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: COLORS.textMuted, fontSize: 15, padding: '1px 3px', borderRadius: 4,
  fontFamily: 'inherit',
};

const mfLabelStyle = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: 0.4, color: COLORS.textMuted, marginBottom: 10,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
};

const mfValueStyle = {
  fontSize: 20, fontWeight: 700, letterSpacing: -0.5,
};

const mfSepStyle = {
  fontSize: 20, fontWeight: 300, color: COLORS.textMuted,
  flexShrink: 0, padding: '0 4px', alignSelf: 'center',
};

const guideCardStyle = {
  background: COLORS.surface, border: `1px solid ${COLORS.border}`,
  borderRadius: RADIUS, padding: '18px 20px', boxShadow: SHADOW,
};

const guideCardLabelStyle = {
  fontSize: 11, color: COLORS.textMuted, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
};

const guideCardValueStyle = {
  fontSize: 20, fontWeight: 700, letterSpacing: -0.5,
};

const guideCardSubStyle = {
  fontSize: 11, color: COLORS.textMuted, marginTop: 4,
};
