import React from 'react';
import { useNavigate } from 'react-router-dom';

function PriceTag({ price, priceLabel }) {
  if (price != null) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
          {price.toLocaleString()}
        </span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>원~</span>
      </div>
    );
  }
  if (priceLabel) {
    return (
      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
        {priceLabel}
      </div>
    );
  }
  return <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>문의</div>;
}

function parseFeatures(featuresJson) {
  if (!featuresJson) return [];
  try {
    const parsed = JSON.parse(featuresJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return typeof featuresJson === 'string'
      ? featuresJson.split('\n').map(s => s.trim()).filter(Boolean)
      : [];
  }
}

function PackageCard({ pkg, profileName, navigate }) {
  const features = parseFeatures(pkg.features);
  const isFeatured = pkg.featured;

  return (
    <div style={{
      flex: '1 1 240px', maxWidth: 340, borderRadius: 20, overflow: 'hidden',
      background: isFeatured
        ? 'linear-gradient(145deg, rgba(91,110,245,0.25), rgba(167,139,250,0.15))'
        : 'rgba(255,255,255,0.04)',
      border: isFeatured
        ? '1.5px solid rgba(91,110,245,0.5)'
        : '1px solid rgba(255,255,255,0.07)',
      position: 'relative',
      boxShadow: isFeatured ? '0 0 40px rgba(91,110,245,0.2)' : 'none',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = isFeatured ? '0 12px 48px rgba(91,110,245,0.35)' : '0 8px 32px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isFeatured ? '0 0 40px rgba(91,110,245,0.2)' : 'none'; }}
    >
      {isFeatured && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: 'linear-gradient(90deg, #5b6ef5, #a78bfa)',
          padding: '6px 0', textAlign: 'center',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
          color: '#fff', textTransform: 'uppercase',
        }}>Most Popular</div>
      )}
      <div style={{ padding: isFeatured ? '44px 28px 28px' : '28px 28px 28px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: isFeatured ? '#a0a8ff' : 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          {pkg.name}
        </div>
        <PriceTag price={pkg.price} priceLabel={pkg.priceLabel} />
        {pkg.description && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 20, marginTop: 6 }}>
            {pkg.description}
          </p>
        )}
        {features.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {features.map((f, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                <span style={{ color: isFeatured ? '#a0a8ff' : '#34d399', flexShrink: 0, marginTop: 1 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => navigate(`/inquiry/${profileName}`)}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
            border: isFeatured ? 'none' : '1px solid rgba(255,255,255,0.15)',
            background: isFeatured ? 'linear-gradient(90deg, #5b6ef5, #a78bfa)' : 'rgba(255,255,255,0.08)',
            color: '#fff', cursor: 'pointer', transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          문의하기
        </button>
      </div>
    </div>
  );
}

export default function PricingSection({ pricing = [], profileName }) {
  const navigate = useNavigate();
  if (pricing.length === 0) return null;

  return (
    <section style={{
      padding: '72px 24px 56px',
      borderTop: '1px solid rgba(255,255,255,0.05)',
    }}>
      {/* 헤더 */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: 20,
          background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
          fontSize: 11, fontWeight: 700, color: '#34d399',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
        }}>Pricing</div>
        <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 800, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.02em', marginBottom: 10 }}>
          촬영 패키지
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
          합리적인 가격으로 최고의 결과물을 경험하세요
        </p>
      </div>

      {/* 카드 */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1080, margin: '0 auto' }}>
        {pricing.map(pkg => (
          <PackageCard key={pkg.id} pkg={pkg} profileName={profileName} navigate={navigate} />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
        * 패키지는 협의에 따라 조정될 수 있습니다
      </div>
    </section>
  );
}
