import React, { useState, useCallback } from 'react';
import { COLORS } from '../constants';

const ENCODED = 'MjAwNzA4';

export default function LoginPage({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  const login = useCallback(() => {
    if (!pw) return;
    if (btoa(pw) === ENCODED) {
      onLogin();
    } else {
      setErr('비밀번호가 올바르지 않습니다');
      setPw('');
    }
  }, [pw, onLogin]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') login();
  };

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: COLORS.bg, color: COLORS.text, minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: COLORS.text }}>
          mon<span style={{ color: COLORS.accent }}>.</span>ey
        </div>
        <div style={{
          width: '100%', background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 12, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, textAlign: 'center', margin: 0 }}>
            비밀번호를 입력하세요
          </p>
          <input
            type="password" value={pw} maxLength={20} placeholder="••••••" autoFocus
            onChange={(e) => { setPw(e.target.value); setErr(''); }}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%', padding: '12px 16px', border: `1px solid ${COLORS.border}`,
              borderRadius: 8, fontSize: 18, textAlign: 'center', letterSpacing: 6,
              color: COLORS.text, background: COLORS.bg, outline: 'none', fontFamily: 'inherit',
              transition: 'border-color .15s', boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.background = '#fff'; }}
            onBlur={(e) => { e.target.style.borderColor = COLORS.border; e.target.style.background = COLORS.bg; }}
          />
          <button onClick={login} style={{
            width: '100%', padding: 12, background: COLORS.accent, color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity .15s',
          }}
            onMouseEnter={(e) => e.target.style.opacity = 0.88}
            onMouseLeave={(e) => e.target.style.opacity = 1}
          >
            확인
          </button>
          <p style={{ fontSize: 12, color: COLORS.expense, textAlign: 'center', minHeight: 16, margin: 0 }}>
            {err}
          </p>
        </div>
      </div>
    </div>
  );
}
