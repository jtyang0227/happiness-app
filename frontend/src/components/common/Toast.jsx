import React, { useState, useEffect } from 'react';

// V2 Glass: 타입별 tinted glass — 스펙큘러 하이라이트 포함
const CONFIGS = {
  success: {
    icon: '✓', bar: '#38a169',
    bg: 'rgba(240,255,244,0.78)',
    blur: 'blur(32px) saturate(180%) brightness(103%)',
    text: '#276749', border: 'rgba(198,246,213,0.72)',
    specular: 'inset 0 1.5px 0 rgba(255,255,255,0.70), inset 0 -0.5px 0 rgba(0,0,0,0.04)',
    shadow: '0 8px 32px rgba(56,161,105,0.14), 0 2px 8px rgba(0,0,0,0.06)',
  },
  error: {
    icon: '✕', bar: '#e53e3e',
    bg: 'rgba(255,245,245,0.80)',
    blur: 'blur(32px) saturate(180%) brightness(103%)',
    text: '#9b2c2c', border: 'rgba(254,215,215,0.72)',
    specular: 'inset 0 1.5px 0 rgba(255,255,255,0.70), inset 0 -0.5px 0 rgba(0,0,0,0.04)',
    shadow: '0 8px 32px rgba(229,62,62,0.14), 0 2px 8px rgba(0,0,0,0.06)',
  },
  warning: {
    icon: '!', bar: '#dd6b20',
    bg: 'rgba(255,250,240,0.80)',
    blur: 'blur(32px) saturate(180%) brightness(103%)',
    text: '#7b341e', border: 'rgba(254,235,200,0.72)',
    specular: 'inset 0 1.5px 0 rgba(255,255,255,0.70), inset 0 -0.5px 0 rgba(0,0,0,0.04)',
    shadow: '0 8px 32px rgba(221,107,32,0.14), 0 2px 8px rgba(0,0,0,0.06)',
  },
  info: {
    icon: 'i', bar: '#5b6ef5',
    bg: 'rgba(240,242,255,0.80)',
    blur: 'blur(32px) saturate(200%) brightness(103%)',
    text: '#3d51cc', border: 'rgba(199,207,254,0.72)',
    specular: 'inset 0 1.5px 0 rgba(255,255,255,0.72), inset 0 -0.5px 0 rgba(0,0,0,0.04)',
    shadow: '0 8px 32px rgba(91,110,245,0.14), 0 2px 8px rgba(0,0,0,0.06)',
  },
};

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const cfg = CONFIGS[toast.type] ?? CONFIGS.info;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 0,
      background: cfg.bg,
      backdropFilter: cfg.blur,
      WebkitBackdropFilter: cfg.blur,
      border: `1px solid ${cfg.border}`,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: `${cfg.shadow}, ${cfg.specular}`,
      minWidth: 260, maxWidth: 340,
      transform: visible ? 'translateX(0) scale(1)' : 'translateX(110%) scale(0.95)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
      pointerEvents: 'all',
    }}>
      {/* Left color bar */}
      <div style={{ width: 4, background: cfg.bar, flexShrink: 0, alignSelf: 'stretch' }} />

      {/* Icon */}
      <div style={{
        width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingTop: 14, color: cfg.bar, fontSize: 13, fontWeight: 800, flexShrink: 0,
      }}>
        {cfg.icon}
      </div>

      {/* Message */}
      <div style={{
        flex: 1, padding: '11px 4px 11px 0',
        fontSize: 13, fontWeight: 600, color: cfg.text, lineHeight: 1.4,
      }}>
        {toast.message}
      </div>

      {/* Close */}
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: cfg.text, opacity: 0.5, fontSize: 15, padding: '10px 12px',
          lineHeight: 1, alignSelf: 'flex-start', flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// Multi-toast stack (primary usage)
export function ToastStack({ toasts, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', top: 80, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Single-toast backward compat
export default function Toast({ toast }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) setVisible(true);
    else setVisible(false);
  }, [toast]);

  if (!toast) return null;

  const cfg = CONFIGS[toast.type] ?? CONFIGS.info;

  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '20px'})`,
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s ease',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 8,
      background: cfg.bg,
      backdropFilter: cfg.blur,
      WebkitBackdropFilter: cfg.blur,
      border: `1px solid ${cfg.border}`,
      borderRadius: 16, overflow: 'hidden',
      boxShadow: `${cfg.shadow}, ${cfg.specular}`,
      maxWidth: 320,
    }}>
      <div style={{ width: 4, background: cfg.bar, alignSelf: 'stretch' }} />
      <div style={{ padding: '11px 16px 11px 10px', fontSize: 13, fontWeight: 600, color: cfg.text }}>
        {toast.message}
      </div>
    </div>
  );
}
