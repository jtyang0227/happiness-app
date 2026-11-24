import React from 'react';
import { COLORS } from '../../constants/colors';

const PRESETS = [
  { label: '좁게',  value: 4,  bars: 1 },
  { label: '보통',  value: 6,  bars: 2 },
  { label: '넓게',  value: 9,  bars: 3 },
  { label: '전체',  value: 12, bars: 4 },
];

export default function GridSpanPicker({ value, onChange }) {
  const span = value || 6;

  return (
    <div>
      {/* 12-cell bar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 12,
        }}
      >
        {Array.from({ length: 12 }, (_, i) => {
          const cellNum = i + 1;
          const active = cellNum <= span;
          return (
            <div
              key={cellNum}
              onClick={() => onChange(cellNum)}
              style={{
                flex: 1,
                height: 28,
                borderRadius: 4,
                background: active ? COLORS.primary : '#e0e0f0',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              title={`${cellNum}칸`}
            />
          );
        })}
      </div>

      {/* Preset buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {PRESETS.map(preset => {
          const selected = span === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 8,
                border: `2px solid ${selected ? COLORS.primary : '#e0e0f0'}`,
                background: selected ? COLORS.primary : '#fff',
                color: selected ? '#fff' : COLORS.textSecondary,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ marginBottom: 4 }}>{preset.label}</div>
              {/* Mini preview bars */}
              <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                {Array.from({ length: preset.bars }, (_, j) => (
                  <div
                    key={j}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 2,
                      background: selected ? 'rgba(255,255,255,0.7)' : COLORS.primary,
                    }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: COLORS.textMuted, textAlign: 'center' }}>
        현재: {span}칸 / 12칸
      </div>
    </div>
  );
}
