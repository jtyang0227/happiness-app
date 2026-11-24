import React, { useEffect, useMemo, useState } from 'react';
import { BLOCK_REGISTRY } from '../blocks/blockRegistry';
import { defaultBlocks, parseSections, resolveTheme } from '../blocks/layout';
import { testimonialApi, pressApi, pricingApi, brandApi } from '../../../services/portfolioApi';

const TRUST_TYPES = ['testimonials', 'pricing', 'press', 'clients'];
const EMPTY_TRUST = { testimonials: [], pricing: [], press: [], achievements: [], brands: [] };

function useNarrow(force) {
  const query = '(max-width: 767px)';
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = () => setNarrow(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);
  return force ?? narrow;
}

/**
 * "직접 구성"(BLOCKS) 템플릿 — 저장된 블록 목록을 위에서부터 그린다 (PLANNING_portfolio-blocks.md).
 * 공개 페이지와 편집 미리보기가 같은 컴포넌트를 쓴다. preview면 숨긴 블록·빈 블록도 흐리게/안내로 보인다.
 * blocks·style을 직접 주면(편집 화면) 그것을, 아니면 portfolioConfig(저장값)를 쓴다.
 */
export default function TemplateBlocks({
  member, photos = [], series = [], profileName, acceptingBookings,
  photoCount, followerCount, totalLikes, portfolioConfig,
  blocks: blocksProp, style: styleProp, preview = false, forceNarrow, selectedId, onSelect,
}) {
  const blocks = useMemo(
    () => blocksProp || parseSections(portfolioConfig?.sectionsJson) || defaultBlocks(),
    [blocksProp, portfolioConfig?.sectionsJson],
  );
  const t = useMemo(() => resolveTheme(styleProp || portfolioConfig?.styleJson), [styleProp, portfolioConfig?.styleJson]);
  const narrow = useNarrow(forceNarrow);

  // 신뢰 신호는 해당 블록이 있을 때만 불러온다
  const needsTrust = blocks.some(b => TRUST_TYPES.includes(b.type));
  const [trust, setTrust] = useState(EMPTY_TRUST);
  useEffect(() => {
    const memberId = member?.id;
    if (!memberId || !needsTrust) return undefined;
    let cancelled = false;
    Promise.allSettled([testimonialApi.list(memberId), pricingApi.list(memberId), pressApi.list(memberId), brandApi.list(memberId)])
      .then(([tm, pr, ps, br]) => {
        if (cancelled) return;
        const arr = r => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []);
        setTrust({
          testimonials: arr(tm), pricing: arr(pr), brands: arr(br),
          press: ps.status === 'fulfilled' && Array.isArray(ps.value?.press) ? ps.value.press : [],
          achievements: ps.status === 'fulfilled' && Array.isArray(ps.value?.achievements) ? ps.value.achievements : [],
        });
      });
    return () => { cancelled = true; };
  }, [member?.id, needsTrust]);

  const ctx = { member, photos, series, profileName, acceptingBookings, photoCount, followerCount, totalLikes, trust, t, narrow };
  const pad = narrow ? Math.round(t.gap * 0.6) : t.gap;

  return (
    <div style={{ minHeight: preview ? 'auto' : '100vh', background: t.bg, color: t.text }}>
      <style>{`
        .pb-action { transition: transform 0.16s ease-out, filter 0.15s ease; }
        .pb-action:hover { filter: brightness(0.94); }
        .pb-action:active { transform: scale(0.97); }
        .pb-action:focus-visible, .pb-photo:focus-visible, .pb-block-select:focus-visible { outline: 2px solid ${t.accent}; outline-offset: 2px; }
        .pb-photo img { transition: transform 0.3s ease-out; }
        .pb-photo:hover img { transform: scale(1.03); }
        @media (prefers-reduced-motion: reduce) { .pb-photo img, .pb-action { transition: none; } }
      `}</style>
      {blocks.map(b => {
        const def = BLOCK_REGISTRY[b.type];
        if (!def) return null;                     // 모르는 블록(이전/다음 버전) — 건너뛴다
        const props = { ...def.defaults, ...b.props };
        const empty = def.isEmpty?.(props, ctx);
        if (!preview && (!b.visible || empty)) return null;

        const selected = preview && selectedId === b.id;
        const { Component } = def;
        return (
          <section
            key={b.id}
            aria-label={def.label}
            onClick={preview && onSelect ? () => onSelect(b.id) : undefined}
            style={{
              position: 'relative', maxWidth: 1080, margin: '0 auto', padding: `${pad / 2}px ${narrow ? 16 : 24}px`,
              opacity: preview && !b.visible ? 0.35 : 1,
              outline: selected ? `2px solid ${t.accent}` : 'none', outlineOffset: -2, borderRadius: selected ? 12 : 0,
              cursor: preview ? 'pointer' : 'auto',
            }}
          >
            {empty ? (
              <div style={{ border: `1.5px dashed ${t.border}`, borderRadius: 12, padding: '28px 20px', textAlign: 'center', color: t.muted, fontSize: 14 }}>
                {def.emoji} {def.label} — {def.emptyHint || '보여 줄 내용이 없어요'}
              </div>
            ) : (
              <Component props={props} ctx={ctx} />
            )}
          </section>
        );
      })}
      <div style={{ height: pad / 2 }} />
    </div>
  );
}
