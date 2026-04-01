export const COLORS = {
  bg: '#f7f7f5',
  surface: '#ffffff',
  border: '#e8e8e5',
  text: '#1a1a1a',
  textMuted: '#9a9a95',
  income: '#2d7a4f',
  incomeBg: '#edf7f1',
  expense: '#c0392b',
  expenseBg: '#fdf0ef',
  warn: '#d68910',
  warnBg: '#fef9ec',
  accent: '#3d5afe',
  accentLight: '#eef0ff',
  carryover: '#7b3fe4',
  carryoverBg: '#f3eeff',
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e8e8e5',
  gray400: '#9ca3af',
  gray500: '#6b7280',
};

export const CONSTANTS = {
  BREAKPOINT: 768,
  SIDEBAR_WIDTH: 220,
  ANIMATION_DURATION: '0.35s',
  ANIMATION_EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

export const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
export const DAY_NAMES = ['일','월','화','수','목','금','토'];
export const BAR_COLORS = ['#e67e22','#8e44ad','#2980b9','#16a085','#27ae60','#c0392b','#d35400','#7f8c8d'];
export const DONUT_COLORS = ['#e67e22','#8e44ad','#2980b9','#16a085','#27ae60','#e74c3c','#f39c12','#7f8c8d','#95a5a6'];

export function fmt(n) { return Math.abs(Number(n)).toLocaleString('ko-KR') + '원'; }
export function fmtShort(n) {
  const a = Math.abs(n);
  if (a >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (a >= 10000) return (n / 10000).toFixed(0) + '만';
  return n.toLocaleString('ko-KR');
}
export function fmtY(n) {
  const a = Math.abs(n);
  if (a >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (a >= 10000) return Math.round(n / 10000) + '만';
  return n.toLocaleString('ko-KR');
}
export function formatAmountInput(el) {
  const raw = el.value.replace(/[^0-9]/g, '');
  el.value = raw ? Number(raw).toLocaleString('ko-KR') : '';
}
