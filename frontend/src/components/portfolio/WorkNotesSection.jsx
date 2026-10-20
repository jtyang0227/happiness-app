import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { COLORS } from '../../constants/colors';
import { SHOOT_TYPES, shootTypeLabel } from '../../constants/shootTypes';

/**
 * 작업 노트 목록 + 촬영 유형 필터 — 포트폴리오 컨셉 "작업 노트" P1
 * (DESIGN_PROMPTS/planning/PLANNING_portfolio-work-notes-concept.md, US-6).
 * 시리즈를 작업 사례 카드로 보여주고 각 카드는 /portfolio/:profileName/work/:id 로 이동한다.
 * TemplateEditorial은 자체 컬렉션 카드를 유지하고 WorkTypeFilter/filterWorksByType만 가져다 쓴다.
 */

const THEMES = {
  light: {
    text: COLORS.text, sub: COLORS.textMuted, cardBg: COLORS.surface, cardBorder: COLORS.border,
    thumbBg: COLORS.surfaceDim, chipBg: COLORS.surface, chipBorder: COLORS.border, chipText: COLORS.textSecondary,
    chipActiveBg: COLORS.text, chipActiveText: COLORS.surface, rule: COLORS.border,
  },
  dark: {
    text: '#E8E8E8', sub: 'rgba(255,255,255,0.45)', cardBg: '#1A1E22', cardBorder: 'rgba(255,255,255,0.08)',
    thumbBg: '#22262B', chipBg: 'transparent', chipBorder: 'rgba(255,255,255,0.18)', chipText: 'rgba(255,255,255,0.65)',
    chipActiveBg: '#F2F4F6', chipActiveText: '#111417', rule: 'rgba(255,255,255,0.08)',
  },
};

/** 작업에 실제로 쓰인 촬영 유형만, SHOOT_TYPES 순서대로 */
export function presentWorkTypes(series = []) {
  const used = new Set(series.map(s => s.shootType).filter(Boolean));
  return SHOOT_TYPES.filter(t => used.has(t.value));
}

export function filterWorksByType(series = [], type) {
  return type ? series.filter(s => s.shootType === type) : series;
}

/** 대표 작업(작가당 최대 1건)을 맨 앞으로 — 나머지 순서는 작가가 정한 displayOrder 그대로 */
export function pinnedFirst(series = []) {
  return [...series].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
}

/**
 * 대표 작업 카드 — 포트폴리오 상단에 1건 (작업 노트 P2).
 * 대표 작업이 없으면 아무것도 그리지 않는다.
 */
export function FeaturedWorkCard({ series = [], profileName, theme = 'light', style }) {
  const work = series.find(s => s.pinned);
  if (!work || !profileName) return null;
  const t = THEMES[theme] || THEMES.light;
  const cover = work.coverImageUrl || work.previewPhotos?.[0];
  const meta = [shootTypeLabel(work.shootType), work.clientLabel, work.shotOn].filter(Boolean).join(' · ');
  return (
    <section aria-label="대표 작업" style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 24px 8px', ...style }}>
      <style>{`
        .featured-work { display: grid; grid-template-columns: 3fr 2fr; }
        @media (max-width: 767px) { .featured-work { grid-template-columns: 1fr; } }
        .featured-work:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 3px; }
        .featured-work-cta { transition: transform 0.15s ease; display: inline-block; }
        .featured-work:hover .featured-work-cta { transform: translateX(3px); }
        @media (prefers-reduced-motion: reduce) { .featured-work:hover .featured-work-cta { transform: none; } }
      `}</style>
      <Link
        to={`/portfolio/${profileName}/work/${work.id}`}
        className="featured-work"
        style={{
          textDecoration: 'none', color: t.text, background: t.cardBg,
          border: `1px solid ${t.cardBorder}`, borderRadius: 16, overflow: 'hidden',
        }}
      >
        <div style={{ aspectRatio: '16 / 10', background: t.thumbBg }}>
          {cover && <img src={cover} alt={work.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </div>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: COLORS.primary }}>대표 작업</div>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.3, wordBreak: 'keep-all', textWrap: 'balance' }}>{work.title}</div>
          {meta && <div style={{ fontSize: 13, color: t.sub }}>{meta}</div>}
          {(work.story || work.description) && (
            <p style={{
              fontSize: 14, lineHeight: 1.7, color: t.sub, margin: '4px 0 0', wordBreak: 'keep-all',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {work.story || work.description}
            </p>
          )}
          <span className="featured-work-cta" style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginTop: 6 }}>
            작업 노트 보기 →
          </span>
        </div>
      </Link>
    </section>
  );
}

/** 유형이 2개 이상일 때만 의미가 있으므로 그 외에는 아무것도 그리지 않는다 */
export function WorkTypeFilter({ series, value, onChange, theme = 'light', style }) {
  const types = presentWorkTypes(series);
  if (types.length < 2) return null;
  const t = THEMES[theme] || THEMES.light;
  const chips = [{ value: '', label: '전체' }, ...types];
  return (
    <div role="radiogroup" aria-label="촬영 유형으로 작업 보기" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', ...style }}>
      {chips.map(c => {
        const active = value === c.value;
        const count = c.value ? series.filter(s => s.shootType === c.value).length : series.length;
        return (
          <button
            key={c.value || 'all'} type="button" role="radio" aria-checked={active}
            className="work-type-chip"
            onClick={() => onChange(c.value)}
            style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
              fontWeight: active ? 700 : 500,
              border: `1px solid ${active ? t.chipActiveBg : t.chipBorder}`,
              background: active ? t.chipActiveBg : t.chipBg,
              color: active ? t.chipActiveText : t.chipText,
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
          >
            {c.label} <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function WorkCard({ work, to, t }) {
  const cover = work.coverImageUrl || work.previewPhotos?.[0];
  const meta = [shootTypeLabel(work.shootType), work.clientLabel, work.shotOn].filter(Boolean).join(' · ');
  return (
    <Link
      to={to}
      className="work-note-card"
      style={{
        display: 'block', textDecoration: 'none', color: t.text,
        background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, overflow: 'hidden',
      }}
    >
      <div style={{ aspectRatio: '4 / 3', background: t.thumbBg }}>
        {cover && <img src={cover} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, wordBreak: 'keep-all' }}>
          {work.pinned && <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, marginRight: 6 }}>📌 대표</span>}
          {work.title}
        </div>
        <div style={{ fontSize: 12, color: t.sub, marginTop: 4 }}>
          {meta || `${work.photoCount ?? 0}장`}
        </div>
      </div>
    </Link>
  );
}

export default function WorkNotesSection({ series = [], profileName, theme = 'light', heading = '작업 노트', style }) {
  const [type, setType] = useState('');
  const visible = useMemo(() => pinnedFirst(filterWorksByType(series, type)), [series, type]);
  if (!series.length || !profileName) return null;
  const t = THEMES[theme] || THEMES.light;

  return (
    <section aria-labelledby="work-notes-heading" style={{ maxWidth: 1040, margin: '0 auto', padding: '56px 24px', ...style }}>
      <style>{`
        .work-note-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .work-note-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.10); }
        .work-note-card:focus-visible, .work-type-chip:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
        .work-note-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @media (max-width: 1023px) { .work-note-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 479px)  { .work-note-grid { grid-template-columns: 1fr; } }
        @media (prefers-reduced-motion: reduce) { .work-note-card, .work-note-card:hover { transition: none; transform: none; } }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <h2 id="work-notes-heading" style={{ fontSize: 20, fontWeight: 800, color: t.text, margin: 0 }}>
          {heading} <span style={{ fontSize: 13, fontWeight: 600, color: t.sub }}>{series.length}</span>
        </h2>
      </div>
      <WorkTypeFilter series={series} value={type} onChange={setType} theme={theme} style={{ marginBottom: 20 }} />
      <div className="work-note-grid">
        {visible.map(w => (
          <WorkCard key={w.id} work={w} t={t} to={`/portfolio/${profileName}/work/${w.id}`} />
        ))}
      </div>
    </section>
  );
}
