import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';

const TYPE_META = {
  AWARD:       { icon: '🏆', label: '수상', color: '#f59e0b' },
  EXHIBITION:  { icon: '🎨', label: '전시', color: '#4E9FFF' },
  PUBLICATION: { icon: '📖', label: '출판', color: '#34d399' },
};

function themeTokens(dark) {
  return dark
    ? { surface: COLORS.darkSurface, border: COLORS.darkBorder, text: COLORS.darkText, textSecondary: COLORS.darkTextSub, textMuted: COLORS.darkTextHint }
    : { surface: COLORS.surface, border: COLORS.border, text: COLORS.text, textSecondary: COLORS.textSecondary, textMuted: COLORS.textMuted };
}

function PressLogoCard({ item, t }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      padding: '20px 24px', borderRadius: 12,
      background: t.surface,
      border: `1px solid ${t.border}`,
      minWidth: 140, flexShrink: 0, textAlign: 'center',
      transition: 'box-shadow 0.2s',
      cursor: item.url ? 'pointer' : 'default',
    }}
      onClick={() => item.url && window.open(item.url, '_blank', 'noopener')}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {item.logoUrl && !err ? (
        <img
          src={item.logoUrl} alt={item.publication}
          onError={() => setErr(true)}
          style={{ height: 32, maxWidth: 100, objectFit: 'contain' }}
        />
      ) : (
        <div style={{ fontSize: 11, fontWeight: 800, color: t.textSecondary, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {item.publication}
        </div>
      )}
      {item.title && (
        <div style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.4, maxWidth: 120, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {item.title}
        </div>
      )}
      {item.publishedDate && (
        <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: '0.05em' }}>{item.publishedDate}</div>
      )}
    </div>
  );
}

function AchievementRow({ item, i, t }) {
  const meta = TYPE_META[item.type] || TYPE_META.AWARD;
  return (
    <div style={{
      display: 'flex', gap: 16, alignItems: 'flex-start', padding: '16px 0',
      borderBottom: `1px solid ${t.border}`,
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
          {item.yearMonth && <span style={{ fontSize: 11, color: t.textMuted }}>{item.yearMonth}</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginTop: 5, lineHeight: 1.4 }}>
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.color = COLORS.primary; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'inherit'; }}>
              {item.title}
            </a>
          ) : item.title}
        </div>
        {(item.organizer || item.location) && (
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>
            {[item.organizer, item.location].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PressAwardsSection({ press = [], achievements = [], theme = 'light' }) {
  if (press.length === 0 && achievements.length === 0) return null;
  const t = themeTokens(theme === 'dark');

  return (
    <section style={{
      padding: '72px 24px 56px',
      borderTop: `1px solid ${t.border}`,
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
              background: COLORS.primaryLight, border: `1px solid ${COLORS.primaryTonal}`,
              fontSize: 11, fontWeight: 700, color: COLORS.primary,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14,
            }}>As Seen In</div>
            <h2 style={{ fontSize: 'clamp(18px, 2.5vw, 28px)', fontWeight: 800, color: t.text, letterSpacing: '-0.01em' }}>
              언론 소개
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', justifyContent: press.length < 5 ? 'center' : 'flex-start', paddingBottom: 4 }}>
            {press.map(p => <PressLogoCard key={p.id} item={p} t={t} />)}
          </div>
        </div>
      )}

      {/* 수상/전시 섹션 */}
      {achievements.length > 0 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: 20,
              background: '#FFF6E5', border: '1px solid #FCE3B0',
              fontSize: 11, fontWeight: 700, color: '#B45309',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14,
            }}>Recognition</div>
            <h2 style={{ fontSize: 'clamp(18px, 2.5vw, 28px)', fontWeight: 800, color: t.text, letterSpacing: '-0.01em' }}>
              수상 · 전시 · 출판
            </h2>
          </div>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {achievements.map((a, i) => <AchievementRow key={a.id} item={a} i={i} t={t} />)}
          </div>
        </div>
      )}
    </section>
  );
}
