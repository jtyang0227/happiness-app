import React, { useState } from 'react';

const TYPE_META = {
  AWARD:       { icon: '🏆', label: '수상', color: '#f59e0b' },
  EXHIBITION:  { icon: '🎨', label: '전시', color: '#a78bfa' },
  PUBLICATION: { icon: '📖', label: '출판', color: '#34d399' },
};

function PressLogoCard({ item }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      padding: '20px 24px', borderRadius: 12,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.06)',
      minWidth: 140, flexShrink: 0, textAlign: 'center',
      transition: 'background 0.2s',
      cursor: item.url ? 'pointer' : 'default',
    }}
      onClick={() => item.url && window.open(item.url, '_blank', 'noopener')}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
    >
      {item.logoUrl && !err ? (
        <img
          src={item.logoUrl} alt={item.publication}
          onError={() => setErr(true)}
          style={{ height: 32, maxWidth: 100, objectFit: 'contain', opacity: 0.7, filter: 'brightness(0) invert(1)' }}
        />
      ) : (
        <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {item.publication}
        </div>
      )}
      {item.title && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4, maxWidth: 120, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {item.title}
        </div>
      )}
      {item.publishedDate && (
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>{item.publishedDate}</div>
      )}
    </div>
  );
}

function AchievementRow({ item, i }) {
  const meta = TYPE_META[item.type] || TYPE_META.AWARD;
  return (
    <div style={{
      display: 'flex', gap: 16, alignItems: 'flex-start', padding: '16px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      animation: `fadeSlideUp 0.4s ease ${i * 60}ms both`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: `${meta.color}18`,
        border: `1px solid ${meta.color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
      }}>{meta.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
            background: `${meta.color}20`, color: meta.color, letterSpacing: '0.08em',
          }}>{meta.label}</span>
          {item.yearMonth && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{item.yearMonth}</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.82)', marginTop: 5, lineHeight: 1.4 }}>
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#a0a8ff'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'inherit'; }}>
              {item.title}
            </a>
          ) : item.title}
        </div>
        {(item.organizer || item.location) && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
            {[item.organizer, item.location].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PressAwardsSection({ press = [], achievements = [] }) {
  if (press.length === 0 && achievements.length === 0) return null;

  return (
    <section style={{
      padding: '72px 24px 56px',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      maxWidth: 960, margin: '0 auto',
    }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* 언론 섹션 */}
      {press.length > 0 && (
        <div style={{ marginBottom: 56 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: 20,
              background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)',
              fontSize: 11, fontWeight: 700, color: '#b8a0ff',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14,
            }}>As Seen In</div>
            <h2 style={{ fontSize: 'clamp(18px, 2.5vw, 28px)', fontWeight: 800, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>
              언론 소개
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', justifyContent: press.length < 5 ? 'center' : 'flex-start', paddingBottom: 4 }}>
            {press.map(p => <PressLogoCard key={p.id} item={p} />)}
          </div>
        </div>
      )}

      {/* 수상/전시 섹션 */}
      {achievements.length > 0 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: 20,
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
              fontSize: 11, fontWeight: 700, color: '#fbbf24',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14,
            }}>Recognition</div>
            <h2 style={{ fontSize: 'clamp(18px, 2.5vw, 28px)', fontWeight: 800, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>
              수상 · 전시 · 출판
            </h2>
          </div>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {achievements.map((a, i) => <AchievementRow key={a.id} item={a} i={i} />)}
          </div>
        </div>
      )}
    </section>
  );
}
