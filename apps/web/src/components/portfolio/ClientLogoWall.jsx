import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';

function themeTokens(dark) {
  return dark
    ? { surface: COLORS.darkSurface, border: COLORS.darkBorder, textSecondary: COLORS.darkTextSub, textMuted: COLORS.darkTextHint }
    : { surface: COLORS.surface, border: COLORS.border, textSecondary: COLORS.textSecondary, textMuted: COLORS.textMuted };
}

function BrandItem({ brand, t }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px 28px', borderRadius: 12,
      background: t.surface,
      border: `1px solid ${t.border}`,
      minWidth: 120, height: 72, flexShrink: 0,
      transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {brand.logoUrl && !err ? (
        <img
          src={brand.logoUrl} alt={brand.name}
          onError={() => setErr(true)}
          style={{ maxHeight: 36, maxWidth: 100, objectFit: 'contain' }}
        />
      ) : (
        <span style={{ fontSize: 12, fontWeight: 800, color: t.textSecondary, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {brand.name}
        </span>
      )}
    </div>
  );
}

export default function ClientLogoWall({ brands = [], theme = 'light' }) {
  if (brands.length === 0) return null;
  const t = themeTokens(theme === 'dark');

  return (
    <section style={{
      padding: '56px 24px 48px',
      borderTop: `1px solid ${t.border}`,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
        color: t.textMuted, textTransform: 'uppercase', marginBottom: 28,
      }}>
        함께한 브랜드
      </div>
      <div style={{
        display: 'flex', gap: 12, overflowX: 'auto',
        scrollbarWidth: 'none', paddingBottom: 4,
        justifyContent: brands.length < 6 ? 'center' : 'flex-start',
        flexWrap: brands.length < 6 ? 'wrap' : 'nowrap',
      }}>
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {brands.map(b => <BrandItem key={b.id} brand={b} t={t} />)}
      </div>
    </section>
  );
}
