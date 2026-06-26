import React, { useState } from 'react';

function BrandItem({ brand }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px 28px', borderRadius: 12,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.06)',
      minWidth: 120, height: 72, flexShrink: 0,
      transition: 'background 0.2s, opacity 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.opacity = '1'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.opacity = '0.7'; }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px 28px', borderRadius: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        minWidth: 120, height: 72, flexShrink: 0,
        opacity: 0.7,
      }}
    >
      {brand.logoUrl && !err ? (
        <img
          src={brand.logoUrl} alt={brand.name}
          onError={() => setErr(true)}
          style={{ maxHeight: 36, maxWidth: 100, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
        />
      ) : (
        <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {brand.name}
        </span>
      )}
    </div>
  );
}

export default function ClientLogoWall({ brands = [] }) {
  if (brands.length === 0) return null;

  return (
    <section style={{
      padding: '56px 24px 48px',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
        color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 28,
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
        {brands.map(b => <BrandItem key={b.id} brand={b} />)}
      </div>
    </section>
  );
}
