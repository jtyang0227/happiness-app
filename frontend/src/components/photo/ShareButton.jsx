import React, { useState } from 'react';

export default function ShareButton({ url, title, theme = 'light' }) {
  const [state, setState] = useState('idle'); // idle | success | error

  const handleShare = async () => {
    const shareUrl = url || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: title || '사진 공유', url: shareUrl });
        setState('success');
        setTimeout(() => setState('idle'), 2000);
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setState('success');
    } catch {
      setState('error');
    }
    setTimeout(() => setState('idle'), 2000);
  };

  const dark = theme === 'dark';
  const label = state === 'success' ? '✓ 복사됨' : state === 'error' ? '✗ 실패' : '↗ 공유';

  return (
    <button
      onClick={handleShare}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        height: 40, padding: '0 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        border: dark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #e2e2ee',
        background: state === 'success'
          ? (dark ? 'rgba(34,197,94,0.15)' : '#f0fdf4')
          : (dark ? 'rgba(255,255,255,0.07)' : '#fff'),
        color: state === 'success'
          ? '#22c55e'
          : state === 'error'
            ? '#e53e3e'
            : (dark ? '#e8e8f0' : '#5c5c7a'),
        cursor: 'pointer', transition: 'background 0.2s',
      }}
      onMouseEnter={e => {
        if (state === 'idle') e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.13)' : '#eef0ff';
      }}
      onMouseLeave={e => {
        if (state === 'idle') e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : '#fff';
      }}
    >
      {label}
    </button>
  );
}
