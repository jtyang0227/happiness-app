import React from 'react';
import { COLORS } from '../../constants/colors';

export default function EmptyState({
  icon = '✦',
  title,
  description,
  actionLabel,
  onAction,
  theme = 'light',
  style: extraStyle,
}) {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e8e8f0' : COLORS.text;
  const subColor = isDark ? '#8888cc' : COLORS.textMuted;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 24px', textAlign: 'center',
      ...extraStyle,
    }}>
      <div style={{ fontSize: 44, marginBottom: 16, opacity: 0.35 }}>{icon}</div>
      {title && (
        <div style={{ fontSize: 16, fontWeight: 700, color: textColor, marginBottom: 6 }}>{title}</div>
      )}
      {description && (
        <div style={{ fontSize: 13, color: subColor, lineHeight: 1.6, maxWidth: 320 }}>{description}</div>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: 20, padding: '10px 24px',
            background: COLORS.primary, color: '#fff',
            border: 'none', borderRadius: 10,
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
