import React, { useState, useEffect } from 'react';

const CONFIGS = {
  success: { icon: '✓', bar: '#38a169', bg: '#f0fff4', text: '#276749', border: '#c6f6d5' },
  error:   { icon: '✕', bar: '#e53e3e', bg: '#fff5f5', text: '#9b2c2c', border: '#fed7d7' },
  warning: { icon: '!', bar: '#dd6b20', bg: '#fffaf0', text: '#7b341e', border: '#feebc8' },
  info:    { icon: 'i', bar: '#5b6ef5', bg: '#f0f2ff', text: '#3d51cc', border: '#c7cffe' },
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
      border: `1px solid ${cfg.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      minWidth: 260, maxWidth: 340,
      transform: visible ? 'translateX(0)' : 'translateX(110%)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
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
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 10, overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      maxWidth: 320,
    }}>
      <div style={{ width: 4, background: cfg.bar, alignSelf: 'stretch' }} />
      <div style={{ padding: '11px 16px 11px 10px', fontSize: 13, fontWeight: 600, color: cfg.text }}>
        {toast.message}
      </div>
    </div>
  );
}
