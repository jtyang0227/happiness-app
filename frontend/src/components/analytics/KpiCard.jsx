import React from 'react';
import { COLORS } from '../../constants/colors';

export default function KpiCard({ label, value, change, period }) {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      padding: '20px 24px',
      flex: '1 1 140px',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.text, lineHeight: 1, marginBottom: 8 }}>
        {typeof value === 'number' ? value.toLocaleString() : (value ?? 0)}
      </div>
      {change !== undefined && change !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <span style={{
            color: isPositive ? COLORS.success : isNegative ? COLORS.danger : COLORS.textMuted,
            fontWeight: 700,
          }}>
            {isPositive ? '↑' : isNegative ? '↓' : '—'}
            {Math.abs(change)}%
          </span>
          {period && (
            <span style={{ color: COLORS.textMuted }}>
              vs {period}일 전
            </span>
          )}
        </div>
      )}
    </div>
  );
}
