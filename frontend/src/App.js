import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CONSTANTS, COLORS } from './constants';
import { DashboardIcon, TransactionIcon, BudgetIcon, StatsIcon, SettingsIcon } from './icons/Icons';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import BudgetPage from './pages/BudgetPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import Toast from './Toast';

const MemoDashboard = React.memo(DashboardPage);
const MemoTransactions = React.memo(TransactionsPage);
const MemoBudget = React.memo(BudgetPage);
const MemoStats = React.memo(StatsPage);
const MemoSettings = React.memo(SettingsPage);

const TABS = [
  { id: 0, name: '대시보드', shortName: '대시보드', Icon: DashboardIcon },
  { id: 1, name: '거래 내역', shortName: '거래', Icon: TransactionIcon },
  { id: 2, name: '예산 관리', shortName: '예산', Icon: BudgetIcon },
  { id: 3, name: '통계', shortName: '통계', Icon: StatsIcon },
  { id: 4, name: '설정', shortName: '설정', Icon: SettingsIcon },
];

const PAGE_COMPONENTS = [MemoDashboard, MemoTransactions, MemoBudget, MemoStats, MemoSettings];
const N = PAGE_COMPONENTS.length;

const TabApp = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= CONSTANTS.BREAKPOINT);

  const pageProps = useMemo(() => [
    { isActive: activeTab === 0 },
    { isActive: activeTab === 1 },
    { isActive: activeTab === 2 },
    { isActive: activeTab === 3 },
    { isActive: activeTab === 4, onLogout },
  ], [activeTab, onLogout]);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= CONSTANTS.BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleTabClick = useCallback((id) => {
    setActiveTab((prev) => prev === id ? prev : id);
  }, []);

  if (isDesktop) {
    return (
      <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', backgroundColor: COLORS.white, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: CONSTANTS.SIDEBAR_WIDTH,
          backgroundColor: COLORS.surface, borderRight: `1px solid ${COLORS.border}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 10,
          padding: '28px 20px', gap: 32,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5, color: COLORS.text }}>
            mon<span style={{ color: COLORS.accent }}>.</span>ey
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {TABS.map(({ id, name, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button key={id} onClick={() => handleTabClick(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  backgroundColor: isActive ? COLORS.accentLight : 'transparent',
                  color: isActive ? COLORS.accent : COLORS.textMuted,
                  fontWeight: isActive ? 600 : 500, fontSize: 14, textAlign: 'left',
                  outline: 'none', fontFamily: 'inherit', transition: 'all .15s',
                }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = COLORS.bg; e.currentTarget.style.color = COLORS.text; }}}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = COLORS.textMuted; }}}
                >
                  <span style={{ display: 'flex', width: 20, justifyContent: 'center' }}><Icon size={16} /></span>
                  {name}
                </button>
              );
            })}
          </nav>
          <div style={{ marginTop: 'auto', fontSize: 12, color: COLORS.textMuted }}>v2.0 &middot; 가계부</div>
        </div>

        <div style={{ position: 'absolute', top: 0, left: CONSTANTS.SIDEBAR_WIDTH, right: 0, bottom: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', flexDirection: 'column',
            height: `${N * 100}%`, width: '100%',
            transform: `translateY(-${activeTab * (100 / N)}%)`,
            transition: `transform ${CONSTANTS.ANIMATION_DURATION} ${CONSTANTS.ANIMATION_EASING}`,
          }}>
            {PAGE_COMPONENTS.map((Page, id) => (
              <div key={id} style={{ height: `${100 / N}%`, width: '100%', flexShrink: 0, overflow: 'hidden' }}>
                <Page {...pageProps[id]} />
              </div>
            ))}
          </div>
        </div>
        <Toast />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: COLORS.white, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, position: 'relative' }}>
        <div style={{
          display: 'flex', width: `${N * 100}%`, height: '100%',
          transform: `translateX(-${activeTab * (100 / N)}%)`,
          transition: `transform ${CONSTANTS.ANIMATION_DURATION} ${CONSTANTS.ANIMATION_EASING}`,
        }}>
          {PAGE_COMPONENTS.map((Page, id) => (
            <div key={id} style={{ width: `${100 / N}%`, height: '100%', flexShrink: 0, overflow: 'hidden' }}>
              <Page {...pageProps[id]} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ flexShrink: 0, backgroundColor: COLORS.white, position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, height: 2, backgroundColor: COLORS.accent,
          width: '12%', left: `${activeTab * 20 + 4}%`,
          transition: `left ${CONSTANTS.ANIMATION_DURATION} ${CONSTANTS.ANIMATION_EASING}`,
        }} />
        <div style={{ display: 'flex', borderTop: `1px solid ${COLORS.gray200}` }}>
          {TABS.map(({ id, shortName, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button key={id} onClick={() => handleTabClick(id)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 4px 36px', color: isActive ? COLORS.accent : COLORS.gray400,
                backgroundColor: 'transparent', border: 'none', outline: 'none',
                cursor: 'pointer', gap: 3, transition: 'color 0.15s',
              }}>
                <Icon size={22} />
                <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400 }}>{shortName}</span>
              </button>
            );
          })}
        </div>
      </div>
      <Toast />
    </div>
  );
};

const App = () => {
  const [auth, setAuth] = useState(() => !!sessionStorage.getItem('auth'));

  const handleLogin = useCallback(() => {
    sessionStorage.setItem('auth', '1');
    setAuth(true);
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('auth');
    setAuth(false);
  }, []);

  if (!auth) return <LoginPage onLogin={handleLogin} />;
  return <TabApp onLogout={handleLogout} />;
};

export default App;
