import React, { useState, useEffect } from 'react';
import { COLORS } from '../../constants/colors';

// Toss 플랫 토스트 — 흰 서페이스 + 의미색 좌측 바 + 중립 그림자 (blur·컬러 tint 그림자 없음)
const SHADOW = '0 4px 24px rgba(0,0,0,0.08)';
const CONFIGS = {
  success: { icon: '✓', bar: COLORS.success, text: COLORS.text },
  error:   { icon: '✕', bar: COLORS.danger,  text: COLORS.text },
  warning: { icon: '!', bar: COLORS.warning, text: COLORS.text },
  info:    { icon: 'i', bar: COLORS.primary, text: COLORS.text },
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
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: SHADOW,
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
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16, overflow: 'hidden',
      boxShadow: SHADOW,
      maxWidth: 320,
    }}>
      <div style={{ width: 4, background: cfg.bar, alignSelf: 'stretch' }} />
      <div style={{ padding: '11px 16px 11px 10px', fontSize: 13, fontWeight: 600, color: cfg.text }}>
        {toast.message}
      </div>
    </div>
  );
}
