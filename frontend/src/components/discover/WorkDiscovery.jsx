import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { seriesApi } from '../../services/api';
import { COLORS } from '../../constants/colors';
import { SHOOT_TYPES, shootTypeLabel } from '../../constants/shootTypes';
import DotEmptyState from '../common/DotEmptyState';
import Button from '../common/Button';
import AcceptingBadge from '../common/AcceptingBadge';

/**
 * 작업 탐색 — 작가를 가로질러 작업 노트를 둘러본다 (PLANNING_work-discovery.md, Behance 프로젝트 탐색 재해석).
 * 촬영 유형 칩 + 지역 입력(디바운스) 필터, 카드 클릭 → 작업 노트 페이지.
 */
const PAGE_SIZE = 24;
const SORTS = [
  { value: 'recent',      label: '최근 수정순' },
  { value: 'appreciated', label: '감상 많은 순' },
  { value: 'viewed',      label: '조회 많은 순' },
];
const LOCATION_MAX = 50;

function WorkCard({ work }) {
  const meta = [shootTypeLabel(work.shootType), work.clientLabel, work.shotOn].filter(Boolean).join(' · ');
  const author = work.memberName || work.memberProfileName;
  return (
    <Link
      to={`/portfolio/${work.memberProfileName}/work/${work.id}`}
      className="discover-work-card"
      style={{
        display: 'flex', flexDirection: 'column', textDecoration: 'none', color: COLORS.text,
        background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: COLORS.surfaceDim }}>
        {work.featured && (
          <span style={{
            position: 'absolute', top: 10, left: 10, zIndex: 1, padding: '3px 8px', borderRadius: 8,
            background: COLORS.surface, color: COLORS.text, fontSize: 11, fontWeight: 800,
          }}>✦ 에디터 추천</span>
        )}
        {work.coverImageUrl && (
          <img src={work.coverImageUrl} alt="" loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.style.display = 'none'; }} />
        )}
        <span style={{
          position: 'absolute', top: 10, right: 10, padding: '3px 8px', borderRadius: 8,
          background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {work.photoCount}장
        </span>
      </div>
      <div style={{ padding: '14px 16px 0', flex: 1 }}>
        <div style={{
          fontSize: 16, fontWeight: 700, lineHeight: 1.4, wordBreak: 'keep-all',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {work.title}
        </div>
        {meta && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{meta}</div>}
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}
          aria-label={`감상 ${work.appreciationCount ?? 0}, 조회 ${work.viewCount ?? 0}`}>
          👏 {work.appreciationCount ?? 0} · 👁 {work.viewCount ?? 0}
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, margin: '14px 16px 0', padding: '12px 0 14px',
        borderTop: `1px solid ${COLORS.border}`,
      }}>
        {work.memberAvatarUrl ? (
          <img src={work.memberAvatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <span aria-hidden="true" style={{
            width: 24, height: 24, borderRadius: '50%', background: COLORS.primary, color: '#fff', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
          }}>
            {(author || '?').slice(0, 1)}
          </span>
        )}
        <div style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{author}</span>
          {work.memberLocation && <span style={{ fontSize: 12, color: COLORS.textMuted }}> · {work.memberLocation}</span>}
        </div>
        {work.acceptingBookings && <AcceptingBadge />}
      </div>
    </Link>
  );
}

function SkeletonCard() {
  const bar = (w, h) => <div style={{ width: w, height: h, borderRadius: 6, background: COLORS.border }} />;
  return (
    <div aria-hidden="true" style={{
      border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: 'hidden', background: COLORS.surface,
      animation: 'pulse 1.4s ease-in-out infinite',
    }}>
      <div style={{ aspectRatio: '4 / 3', background: COLORS.border }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {bar('75%', 16)}{bar('45%', 12)}{bar('55%', 12)}
      </div>
    </div>
  );
}

export default function WorkDiscovery() {
  const [shootType, setShootType] = useState('');
  const [sort, setSort] = useState('recent');
  const [locationInput, setLocationInput] = useState('');
  const [location, setLocation] = useState('');
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');
  const debounceRef = useRef(null);
  const [featuredWorks, setFeaturedWorks] = useState([]);   // 에디터 추천 띠 — 실패하면 그냥 안 보인다

  useEffect(() => {
    let alive = true;
    seriesApi.discover({ featured: true, size: 8 })
      .then(res => { if (alive) setFeaturedWorks(res?.data ?? []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // 지역 입력은 타이핑이 멈춘 뒤 0.4초 후 반영 (엔터는 즉시)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setLocation(locationInput.trim()), 400);
    return () => clearTimeout(debounceRef.current);
  }, [locationInput]);

  const params = useCallback((p) => ({
    shootType: shootType || undefined, location: location || undefined, sort, page: p, size: PAGE_SIZE,
  }), [shootType, location, sort]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    seriesApi.discover(params(0))
      .then(res => {
        if (!alive) return;
        setWorks(res?.data ?? []);
        setPage(0);
        setHasNext(Boolean(res?.hasNext));
      })
      .catch(() => { if (alive) setError('작업을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [params]);

  const loadMore = async () => {
    setLoadingMore(true);
    setLoadMoreError('');
    try {
      const next = page + 1;
      const res = await seriesApi.discover(params(next));
      setWorks(prev => {
        const seen = new Set(prev.map(w => w.id));
        return [...prev, ...(res?.data ?? []).filter(w => !seen.has(w.id))];
      });
      setPage(next);
      setHasNext(Boolean(res?.hasNext));
    } catch {
      setLoadMoreError('작업을 더 불러오지 못했어요. 다시 시도해 주세요.');
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = Boolean(shootType || location);
  const chips = [{ value: '', label: '전체' }, ...SHOOT_TYPES];

  return (
    <div>
      <style>{`
        .discover-work-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @media (max-width: 1023px) { .discover-work-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 599px)  { .discover-work-grid { grid-template-columns: 1fr; } }
        .discover-work-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .discover-work-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.10); }
        .discover-work-card:focus-visible, .discover-chip:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
        .discover-chip { transition: background 0.15s ease, color 0.15s ease; }
        .discover-chip:active { transform: scale(0.97); }
        .discover-filters { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
        @media (max-width: 767px) { .discover-filters { flex-direction: column; align-items: stretch; } }
        @media (prefers-reduced-motion: reduce) {
          .discover-work-card, .discover-work-card:hover { transition: none; transform: none; }
        }
      `}</style>

      <div className="discover-filters" style={{ marginBottom: 20 }}>
        <div role="radiogroup" aria-label="촬영 유형"
          style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', minWidth: 0 }}>
          {chips.map(c => {
            const active = shootType === c.value;
            return (
              <button key={c.value || 'all'} type="button" role="radio" aria-checked={active}
                className="discover-chip" onClick={() => setShootType(c.value)}
                style={{
                  flexShrink: 0, padding: '7px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
                  fontWeight: active ? 700 : 500,
                  border: `1px solid ${active ? COLORS.text : COLORS.border}`,
                  background: active ? COLORS.text : COLORS.surface,
                  color: active ? COLORS.surface : COLORS.textSecondary,
                }}>
                {c.label}
              </button>
            );
          })}
        </div>
        <form
          onSubmit={e => { e.preventDefault(); clearTimeout(debounceRef.current); setLocation(locationInput.trim()); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '0 10px', background: COLORS.surface,
          }}>
          <span aria-hidden="true" style={{ fontSize: 13 }}>📍</span>
          <input
            type="text" value={locationInput} maxLength={LOCATION_MAX}
            onChange={e => setLocationInput(e.target.value)}
            placeholder="지역 (예: 서울)" aria-label="작가 지역으로 찾기"
            style={{ border: 'none', outline: 'none', padding: '9px 0', fontSize: 13, width: 150, background: 'transparent', color: COLORS.text }}
          />
          {locationInput && (
            <button type="button" aria-label="지역 지우기" onClick={() => { setLocationInput(''); setLocation(''); }}
              style={{ border: 'none', background: 'transparent', color: COLORS.textMuted, cursor: 'pointer', fontSize: 12, padding: 4 }}>
              ✕
            </button>
          )}
        </form>
      </div>

      {/* 에디터 추천 — 필터를 걸지 않았을 때만, 가로 스크롤 */}
      {!shootType && !location && featuredWorks.length > 0 && (
        <section aria-labelledby="featured-works-heading" style={{ marginBottom: 28 }}>
          <h2 id="featured-works-heading" style={{ fontSize: 16, fontWeight: 800, color: COLORS.text, margin: '0 0 12px' }}>
            ✦ 에디터 추천 <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.textMuted }}>운영팀이 고른 작업</span>
          </h2>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6, scrollSnapType: 'x proximity' }}>
            {featuredWorks.map(w => (
              <div key={w.id} style={{ flex: '0 0 280px', scrollSnapAlign: 'start' }}>
                <WorkCard work={w} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, minHeight: 32 }}>
        <span style={{ fontSize: 13, color: COLORS.textMuted }}>
          {!loading && !error && `작업 ${works.length}${hasNext ? '+' : ''}건`}
        </span>
        <select value={sort} onChange={e => setSort(e.target.value)} aria-label="작업 정렬"
          style={{
            border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 10px', fontSize: 13,
            color: COLORS.textSecondary, background: COLORS.surface, cursor: 'pointer',
          }}>
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="discover-work-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div role="alert" style={{ textAlign: 'center', color: COLORS.danger, padding: '80px 0' }}>{error}</div>
      ) : works.length === 0 ? (
        <DotEmptyState
          icon="📁"
          title={filtered ? '조건에 맞는 작업이 없어요' : '아직 공개된 작업이 없어요'}
          description={filtered ? '촬영 유형이나 지역 조건을 줄여 보세요.' : undefined}
          theme="light"
        />
      ) : (
        <div className="discover-work-grid">
          {works.map(w => <WorkCard key={w.id} work={w} />)}
        </div>
      )}

      {!loading && !error && hasNext && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 0 40px' }}>
          {loadMoreError && <div role="alert" style={{ color: COLORS.danger, fontSize: 13 }}>{loadMoreError}</div>}
          <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
            {loadingMore ? '불러오는 중' : '작업 더 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}
