import React from 'react';
import { COLORS } from '../../constants/colors';

const LAYOUTS = [
  {
    key: 'grid',
    label: '그리드',
    desc: '균형 잡힌 격자 레이아웃',
    preview: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, padding: 6 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 2, height: 22 }} />
        ))}
      </div>
    ),
  },
  {
    key: 'magazine',
    label: '매거진',
    desc: '에디토리얼 느낌의 불균형 레이아웃',
    preview: (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: 'auto auto', gap: 3, padding: 6 }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 2, height: 36, gridRow: '1 / 3' }} />
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 2, height: 16 }} />
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 2, height: 16 }} />
      </div>
    ),
  },
  {
    key: 'slideshow',
    label: '슬라이드쇼',
    desc: '전체화면 슬라이드 발표용',
    preview: (
      <div style={{ padding: 6 }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 2, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 16 }}>▶</span>
        </div>
      </div>
    ),
  },
];

export default function PortfolioLayoutPicker({ value = 'grid', onChange }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>
        포트폴리오 레이아웃
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {LAYOUTS.map(layout => {
          const active = value === layout.key;
          return (
            <button
              key={layout.key}
              onClick={() => onChange(layout.key)}
              style={{
                flex: 1, borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                border: `2px solid ${active ? COLORS.primary : COLORS.border}`,
                background: active ? COLORS.primaryLight : COLORS.surface,
                padding: '0 0 8px',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              {/* 미리보기 */}
              <div style={{
                borderRadius: '10px 10px 0 0', overflow: 'hidden',
                background: active ? '#dde0ff' : '#f0f0f8',
                minHeight: 62,
              }}>
                {layout.preview}
              </div>
              {/* 레이블 */}
              <div style={{ padding: '6px 10px 0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: active ? COLORS.primary : COLORS.text }}>
                  {layout.label}
                </div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2, lineHeight: 1.4 }}>
                  {layout.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
