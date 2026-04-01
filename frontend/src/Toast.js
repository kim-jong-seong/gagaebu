import React, { useState, useCallback, useRef } from 'react';

let _showToastFn = null;

export function showToast(msg) {
  if (_showToastFn) _showToastFn(msg);
}

export default function Toast() {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  _showToastFn = useCallback((m) => {
    setMsg(m);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 2200);
  }, []);

  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
      background: '#1a1a1a', color: '#fff', padding: '10px 20px',
      borderRadius: 8, fontSize: 13, fontWeight: 500,
      opacity: visible ? 1 : 0, transition: 'all .25s',
      pointerEvents: 'none', zIndex: 200, whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  );
}
