import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { photoApi } from '../../services/api';
import { COLORS, MOOD_COLORS, GENRE_META } from '../../constants/colors';
import { mq } from '../../constants/breakpoints';
import PhotoCard from '../photo/PhotoCard';
import PhotoModal from '../photo/PhotoModal';
import DotEmptyState from '../common/DotEmptyState';
import DotSkeletonCard from '../common/DotSkeletonCard';
import { useGalleryLayout } from '../../hooks/useGalleryLayout';
import GenreTabBar from '../common/GenreTabBar';
import MagazineViewer from '../magazine/MagazineViewer';
import Button from '../common/Button';

/**
 * 탐색 → 사진 탭 (PLANNING_nav-consolidation.md 2.1).
 * 예전 갤러리(`/`, 보기 방식 4종·색상순·사진 모달)와 목록(`/list`), 탐색 사진 탭(검색·자동완성·최근 검색어·조회순)을
 * 하나로 합친 화면. 장르는 서버 필터(`?genre=`, 장르 배지 링크와 호환), 색상순만 불러온 사진 안에서 정렬한다.
 */

const PAGE_SIZE = 30;

/* ── 색감 정렬 ── */
const COLOR_ORDER = [
  'WARM', 'ENERGETIC', 'VIBRANT', 'ROMANTIC',
  'NATURAL', 'COOL', 'SERENE',
  'MUTED', 'DRAMATIC', 'CLEAN', 'MONOCHROME',
];

function sortByColor(photos) {
  return [...photos].sort((a, b) => {
    const ai = COLOR_ORDER.indexOf(a.colorMood ?? '');
    const bi = COLOR_ORDER.indexOf(b.colorMood ?? '');
    return (ai === -1 ? COLOR_ORDER.length : ai) - (bi === -1 ? COLOR_ORDER.length : bi);
  });
}

/* ── 정렬 옵션 ── (예전 갤러리의 "수동 순"은 작가별 순서라 전체 탐색에선 의미가 없어 뺐다 — 포트폴리오에는 그대로 적용) */
const SORT_OPTIONS = [
  { label: '최신순',    value: 'createdAt',    order: 'desc', clientSort: null },
  { label: '오래된 순', value: 'createdAt',    order: 'asc',  clientSort: null, key: 'oldest' },
  { label: '좋아요 순', value: 'likesCount',   order: 'desc', clientSort: null },
  { label: '저장 순',   value: 'savesCount',   order: 'desc', clientSort: null },
  { label: '조회 순',   value: 'views',        order: 'desc', clientSort: null },   // PHOTO_VIEW 집계 (서버 정렬)
  { label: '색상 순',   value: 'color',        order: 'asc',  clientSort: true  },
];

/* ── 최근 검색어 (브라우저 저장, 실패해도 무시) ── */
const HISTORY_KEY = 'searchHistory';
const MAX_HISTORY = 5;
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
}
function saveHistory(term) {
  if (!term.trim()) return;
  try {
    const prev = loadHistory().filter(h => h !== term);
    localStorage.setItem(HISTORY_KEY, JSON.stringify([term, ...prev].slice(0, MAX_HISTORY)));
  } catch { /* 저장소 차단 시 기록만 생략 */ }
}
function removeHistory(term) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().filter(h => h !== term))); } catch { /* 무시 */ }
}

/* ── 뷰 모드 ── */
const VIEW_MODES = [
  { mode: 'justified', icon: '▦', label: '행 맞춤 보기' },
  { mode: 'masonry',   icon: '▥', label: '벽돌 보기'   },
  { mode: 'list',      icon: '☰', label: '목록 보기'   },
  { mode: 'magazine',  icon: '▤', label: '매거진 보기' },
];

/* ── 툴바 공통 스타일 ── */
const pillStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 999,
  border: '1px solid transparent', background: COLORS.bg, color: COLORS.text, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
};
const srOnly = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

function FilterChip({ label, dot, onRemove }) {
  return (
    <button type="button" className="ptb-chip" onClick={onRemove} aria-label={`${label} 필터 해제`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, border: 'none',
        background: COLORS.primaryLight, color: COLORS.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
      {dot && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />}
      {label}
      <span aria-hidden="true" style={{ fontSize: 11 }}>✕</span>
    </button>
  );
}

/* ── Justified Layout 셀 ── */
function JustifiedPhotoCell({ photo, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        width: photo._displayWidth,
        height: photo._displayHeight,
        flexShrink: 0,
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
        background: COLORS.border,
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={photo.thumbnailUrl || photo.imageUrl}
        alt={photo.title || '사진'}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover', display: 'block',
          transition: 'transform 0.3s ease',
          transform: hovered ? 'scale(1.03)' : 'scale(1)',
        }}
        onError={e => { e.target.style.display = 'none'; }}
      />
      {/* Hover 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.25s ease',
        display: 'flex', alignItems: 'flex-end',
        padding: '8px 10px',
        pointerEvents: 'none',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {photo.title && (
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#fff',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              marginBottom: 2,
            }}>
              {photo.title}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', display: 'flex', gap: 8 }}>
            <span>♡ {photo.likesCount ?? 0}</span>
            {photo.colorMood && <span style={{ opacity: 0.7 }}>{photo.colorMood}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 색 분위기 필터 (Cosmos 색 검색 재해석, PLANNING_inside-menus-upgrade.md P0-B) ── */
function MoodChips({ value, onChange }) {
  const items = [{ key: '', label: '전체 색감' }, ...Object.entries(MOOD_COLORS).map(([key, m]) => ({ key, label: m.label, dot: m.dot }))];
  return (
    <div role="group" aria-label="색 분위기" className="mood-chips"
      style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 0 2px', scrollbarWidth: 'none' }}>
      <style>{`
        .mood-chip { transition: border-color 0.15s ease, background 0.15s ease; }
        .mood-chip:hover { border-color: ${COLORS.textMuted} !important; }
        .mood-chip:active { transform: scale(0.97); }
        .mood-chip:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
        .mood-chips::-webkit-scrollbar { display: none; }
      `}</style>
      {items.map(it => {
        const active = value === it.key;
        return (
          <button key={it.key || 'all'} type="button" className="mood-chip" aria-pressed={active}
            onClick={() => onChange(active && it.key ? '' : it.key)}
            style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999,
              fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap',
              border: `1px solid ${active ? COLORS.text : COLORS.border}`,
              background: active ? COLORS.text : COLORS.surface,
              color: active ? COLORS.surface : COLORS.textSecondary,
            }}>
            {it.dot && <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: it.dot, flexShrink: 0 }} />}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export default function PhotoBrowser() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const genre = searchParams.get('genre') || '';
  const mood = MOOD_COLORS[searchParams.get('mood')] ? searchParams.get('mood') : '';   // 색 분위기 필터 (?mood=)
  const [keyword, setKeyword]       = useState('');   // 적용된 검색어
  const [search, setSearch]         = useState('');   // 입력 중인 검색어
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory]       = useState(loadHistory);
  const [showDrop, setShowDrop]     = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const dropRef = useRef(null);

  const [photos, setPhotos]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [page, setPage]             = useState(0);
  const [hasNext, setHasNext]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');
  const [selected, setSelected]     = useState(null);
  const [sortIdx, setSortIdx]       = useState(0);
  const [moodOpen, setMoodOpen]     = useState(false);   // 색감 칩 줄 펼침
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem('gallery_view') ?? 'justified',
  );

  const currentSort = SORT_OPTIONS[sortIdx];

  // 뷰 모드 localStorage 저장
  useEffect(() => {
    localStorage.setItem('gallery_view', viewMode);
  }, [viewMode]);

  /* ── 데이터 패치 ── */
  const sortParams = useMemo(
    () => ({
      ...(currentSort.clientSort ? {} : { sortBy: currentSort.value, order: currentSort.order }),
      ...(keyword ? { keyword } : {}),
      ...(genre ? { genre } : {}),
      ...(mood ? { colorMood: mood } : {}),
    }),
    [currentSort, keyword, genre, mood],
  );

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await photoApi.search({ ...sortParams, page: 0, size: PAGE_SIZE });
      setPhotos(res?.data ?? []);
      setPage(0);
      setHasNext(Boolean(res?.hasNext));
    } catch {
      setError('사진을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [sortParams]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    setLoadMoreError('');
    try {
      const next = page + 1;
      const res = await photoApi.search({ ...sortParams, page: next, size: PAGE_SIZE });
      setPhotos(prev => {
        const seen = new Set(prev.map(p => p.id));
        return [...prev, ...(res?.data ?? []).filter(p => !seen.has(p.id))];
      });
      setPage(next);
      setHasNext(Boolean(res?.hasNext));
    } catch {
      setLoadMoreError('사진을 더 불러오지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setLoadingMore(false);
    }
  }, [page, sortParams]);

  const displayed = useMemo(
    () => (currentSort.clientSort ? sortByColor(photos) : photos),
    [photos, currentSort],
  );

  /* ── 검색 자동완성 (0.3초 디바운스) ── */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!search.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await photoApi.getSuggestions(search.trim());
        setSuggestions(res?.data ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const commitSearch = (term) => {
    const t = term.trim();
    setSearch(t);
    setShowDrop(false);
    if (t) { saveHistory(t); setHistory(loadHistory()); }
    setKeyword(t);
  };

  const handleGenreChange = (g) => {
    const next = new URLSearchParams(searchParams);
    if (g) next.set('genre', g); else next.delete('genre');
    setSearchParams(next, { replace: true });
  };

  const handleMoodChange = (m) => {
    const next = new URLSearchParams(searchParams);
    if (m) next.set('mood', m); else next.delete('mood');
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    commitSearch('');
    const next = new URLSearchParams(searchParams);
    next.delete('genre');
    next.delete('mood');
    setSearchParams(next, { replace: true });
  };

  const dropItems = search.trim() ? suggestions : history;
  const dropType = search.trim() ? 'suggestion' : 'history';
  const filtered = Boolean(keyword || genre || mood);

  /* ── Justified Layout 훅 ── */
  const { containerRef, layout } = useGalleryLayout(displayed, {
    mode: viewMode,
    targetRowHeight: 300,
    gap: 4,
  });

  const handleUpdated = useCallback((updated) => {
    setPhotos(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(prev => (prev?.id === updated.id ? updated : prev));
  }, []);

  /* ── 오류 화면 ── */
  if (error) {
    return (
      <div style={{ ...centerStyle, flexDirection: 'column', gap: 14 }}>
        <div style={{ color: COLORS.danger, fontSize: 15 }}>{error}</div>
        <button onClick={fetchPhotos} style={primaryBtn}>다시 시도</button>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      <style>{`.photo-search-item:hover { background: ${COLORS.surfaceDim}; }`}</style>

      {/* ── 검색바 (자동완성 · 최근 검색어) ── */}
      <form onSubmit={e => { e.preventDefault(); commitSearch(search); }}
        style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '4px 16px 12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', background: COLORS.surfaceDim, borderRadius: 9999, padding: '0 16px',
          border: `1px solid ${showDrop && dropItems.length ? COLORS.primary : COLORS.border}`, transition: 'border-color 0.2s',
        }}>
          <span aria-hidden="true" style={{ color: COLORS.textMuted, fontSize: 15, marginRight: 10 }}>🔍</span>
          <input
            ref={inputRef} type="text" value={search} aria-label="사진 검색"
            onChange={e => { setSearch(e.target.value); setShowDrop(true); }}
            onFocus={() => setShowDrop(true)}
            onKeyDown={e => { if (e.key === 'Escape') setShowDrop(false); }}
            placeholder="사진 제목, 설명 검색..."
            style={{ flex: 1, padding: '12px 0', fontSize: 14, color: COLORS.text, outline: 'none', background: 'transparent', border: 'none' }}
          />
          {keyword && (
            <button type="button" aria-label="검색어 지우기" onClick={() => commitSearch('')}
              style={{ border: 'none', background: 'transparent', color: COLORS.textMuted, cursor: 'pointer', fontSize: 13, padding: 4 }}>✕</button>
          )}
        </div>
        {showDrop && dropItems.length > 0 && (
          <div ref={dropRef} style={{
            position: 'absolute', top: 'calc(100% - 6px)', left: 16, right: 16, zIndex: 100, background: COLORS.surface,
            border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
          }}>
            {dropType === 'history' && (
              <div style={{ padding: '8px 16px 4px', fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>최근 검색어</div>
            )}
            {dropItems.map(item => (
              <div key={item} onMouseDown={e => { e.preventDefault(); commitSearch(item); }}
                className="photo-search-item"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', cursor: 'pointer', fontSize: 14, color: COLORS.text }}>
                <span>{dropType === 'history' ? '🕐 ' : '🔍 '}{item}</span>
                {dropType === 'history' && (
                  <span onMouseDown={e => { e.preventDefault(); e.stopPropagation(); removeHistory(item); setHistory(loadHistory()); }}
                    style={{ fontSize: 12, color: COLORS.textMuted, padding: '2px 6px' }}>✕</span>
                )}
              </div>
            ))}
          </div>
        )}
      </form>

      {/* ── 툴바 한 줄 (PLANNING_explore-toolbar.md) — 정렬 select · 색감 펼침 · 결과 수 · 보기 방식 ── */}
      <style>{`
        .ptb-pill { transition: background 0.15s ease, border-color 0.15s ease; }
        .ptb-pill:hover { background: ${COLORS.border} !important; }
        .ptb-pill:active { transform: scale(0.97); }
        .ptb-pill:focus-visible, .ptb-view:focus-visible, .ptb-chip:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
        .ptb-view { transition: background 0.15s ease, color 0.15s ease; }
        .ptb-view:hover { color: ${COLORS.text} !important; }
        .ptb-chip:hover { filter: brightness(0.96); }
      `}</style>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 16px', minHeight: 52, boxSizing: 'border-box',
        position: 'sticky', top: 0, zIndex: 10,
        background: COLORS.surface,
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <label style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
          <span style={srOnly}>정렬</span>
          <select className="ptb-pill" value={sortIdx} onChange={e => setSortIdx(Number(e.target.value))}
            style={{ ...pillStyle, appearance: 'none', WebkitAppearance: 'none', paddingRight: 28 }}>
            {SORT_OPTIONS.map((opt, idx) => <option key={opt.key ?? opt.value + opt.order} value={idx}>{opt.label}</option>)}
          </select>
          <span aria-hidden="true" style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: COLORS.textMuted, pointerEvents: 'none' }}>▾</span>
        </label>

        <button type="button" className="ptb-pill" aria-expanded={moodOpen} aria-controls="ptb-mood-row"
          onClick={() => setMoodOpen(o => !o)}
          style={{ ...pillStyle, flexShrink: 0, border: `1px solid ${moodOpen ? COLORS.text : 'transparent'}` }}>
          {mood
            ? <><span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: MOOD_COLORS[mood].dot, display: 'inline-block' }} />{MOOD_COLORS[mood].label}</>
            : <><span aria-hidden="true">🎨</span>색감</>}
          <span aria-hidden="true" style={{ fontSize: 10, color: COLORS.textMuted }}>{moodOpen ? '▴' : '▾'}</span>
        </button>

        <span style={{ marginLeft: 'auto', fontSize: 12, color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {displayed.length}{hasNext ? '+' : ''}장
        </span>

        <div role="group" aria-label="보기 방식" style={{ display: 'flex', padding: 2, borderRadius: 10, background: COLORS.bg, flexShrink: 0 }}>
          {VIEW_MODES.map(({ mode, icon, label }) => {
            const on = viewMode === mode;
            return (
              <button key={mode} type="button" className="ptb-view" title={label} aria-label={label} aria-pressed={on}
                onClick={() => setViewMode(mode)}
                style={{
                  width: 32, height: 30, border: 'none', borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, lineHeight: 1,
                  background: on ? COLORS.surface : 'transparent',
                  color: on ? COLORS.text : COLORS.textMuted,
                  boxShadow: on ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                <span aria-hidden="true">{icon}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 색감 펼침 줄 (버튼으로 열 때만) ── */}
      {moodOpen && (
        <div id="ptb-mood-row" style={{ padding: '0 16px 4px', background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
          <MoodChips value={mood} onChange={handleMoodChange} />
        </div>
      )}

      {/* ── 장르 탭바 — 서버 필터 (?genre=) ── */}
      <div style={{ padding: '8px 16px 0', background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
        <GenreTabBar selected={genre} onChange={handleGenreChange} theme="light" />
      </div>

      {/* ── 적용 중인 필터 요약 (Behance 패턴) — 걸린 필터가 있을 때만 ── */}
      {filtered && (
        <div aria-label="적용 중인 필터" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '10px 16px 4px' }}>
          {keyword && <FilterChip label={`🔍 ${keyword}`} onRemove={() => commitSearch('')} />}
          {genre && GENRE_META[genre] && <FilterChip label={`${GENRE_META[genre].emoji} ${GENRE_META[genre].label}`} onRemove={() => handleGenreChange('')} />}
          {mood && <FilterChip dot={MOOD_COLORS[mood].dot} label={MOOD_COLORS[mood].label} onRemove={() => handleMoodChange('')} />}
          <button type="button" onClick={clearFilters}
            style={{ marginLeft: 'auto', border: 'none', background: 'none', padding: '4px 2px', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, cursor: 'pointer' }}>
            모두 지우기
          </button>
        </div>
      )}

      {/* ── 콘텐츠 ── */}
      {loading ? (
        /* 도트 스켈레톤 — masonry로 통일 */
        <>
          <style>{`.gallery-masonry{columns:4 200px}${mq.tablet}{.gallery-masonry{columns:3 200px}}@media(max-width:600px){.gallery-masonry{columns:2}}`}</style>
          <div className="gallery-masonry" style={{ columnGap: 4, padding: 4 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ breakInside: 'avoid', marginBottom: 4 }}>
                <DotSkeletonCard />
              </div>
            ))}
          </div>
        </>
      ) : displayed.length === 0 ? (
        filtered ? (
          <DotEmptyState
            icon="🔍"
            title="검색 결과가 없어요"
            description={keyword ? `"${keyword}"에 해당하는 사진이 없어요.` : '이 조건의 사진이 아직 없어요.'}
            actionLabel="조건 지우기"
            onAction={clearFilters}
            theme="light"
            style={{ minHeight: '50vh' }}
          />
        ) : (
          <DotEmptyState
            icon="📷"
            title="아직 사진이 없어요"
            description="첫 번째 사진을 등록하고 갤러리를 채워보세요."
            actionLabel="첫 사진 등록하기"
            onAction={() => navigate('/photo/new')}
            theme="light"
            style={{ minHeight: '60vh' }}
          />
        )
      ) : viewMode === 'justified' ? (

        /* ── Justified Layout ── */
        <div ref={containerRef} style={{ padding: 4 }}>
          {layout.length > 0 ? (
            layout.map((row, rIdx) => (
              <div
                key={rIdx}
                style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'flex-start' }}
              >
                {row.photos.map(photo => (
                  <JustifiedPhotoCell
                    key={photo.id}
                    photo={photo}
                    onClick={() => setSelected(photo)}
                  />
                ))}
                {/* 마지막 행 — 남은 공간 채우기 */}
                {row.isLastRow && (
                  <div style={{ flex: 1, background: '#ffffff' }} />
                )}
              </div>
            ))
          ) : (
            /* 컨테이너 너비 감지 전 폴백 — masonry로 표시 */
            <>
              <style>{`.gallery-masonry{columns:4 200px}${mq.tablet}{.gallery-masonry{columns:3 200px}}@media(max-width:600px){.gallery-masonry{columns:2}}`}</style>
              <div className="gallery-masonry" style={{ columnGap: 4 }}>
                {displayed.map(photo => (
                  <div key={photo.id} style={{ breakInside: 'avoid', marginBottom: 4 }}>
                    <PhotoCard photo={photo} onClick={() => setSelected(photo)} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      ) : viewMode === 'masonry' ? (

        /* ── Masonry ── */
        <>
          <style>{`.gallery-masonry{columns:4 200px}${mq.tablet}{.gallery-masonry{columns:3 200px}}@media(max-width:600px){.gallery-masonry{columns:2}}`}</style>
          <div className="gallery-masonry" style={{ columnGap: 4, padding: 4 }}>
            {displayed.map(photo => (
              <div key={photo.id} style={{ breakInside: 'avoid', marginBottom: 4 }}>
                <PhotoCard photo={photo} onClick={() => setSelected(photo)} />
              </div>
            ))}
          </div>
        </>

      ) : viewMode === 'magazine' ? (

        /* ── Magazine — MagazineViewer 오버레이가 처리 ── */
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 14 }}>
          매거진 뷰어 로딩 중...
        </div>

      ) : (

        /* ── List ── */
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '16px 16px' }}>
          {displayed.map(photo => (
            <div
              key={photo.id}
              onClick={() => setSelected(photo)}
              style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '12px 0',
                borderBottom: `1px solid ${COLORS.border}`,
                cursor: 'pointer',
              }}
            >
              <img
                src={photo.thumbnailUrl || photo.imageUrl}
                alt={photo.title}
                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
                onError={e => { e.target.style.display = 'none'; }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>
                  {photo.title || '제목 없음'}
                </div>
                {photo.description && (
                  <div style={{
                    fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.5,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {photo.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: COLORS.textMuted }}>
                  <span>♡ {photo.likesCount ?? 0}</span>
                  <span>🔖 {photo.savesCount ?? 0}</span>
                  {photo.colorMood && <span>{photo.colorMood}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && hasNext && viewMode !== 'magazine' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 16px 40px' }}>
          {loadMoreError && <div role="alert" style={{ color: COLORS.danger, fontSize: 13 }}>{loadMoreError}</div>}
          <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
            {loadingMore ? '불러오는 중' : '사진 더 보기'}
          </Button>
        </div>
      )}

      {/* ── 상세 모달 ── */}
      {selected && viewMode !== 'magazine' && (
        <PhotoModal
          photo={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}

      {/* ── 매거진 뷰어 ── */}
      {viewMode === 'magazine' && displayed.length > 0 && (
        <MagazineViewer
          photos={displayed}
          title="매거진 뷰"
          onClose={() => setViewMode('justified')}
        />
      )}
    </div>
  );
}

/* ── 스타일 상수 ── */
const centerStyle = {
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  minHeight: '100vh', background: '#ffffff',
};

const primaryBtn = {
  padding: '7px 16px',
  background: COLORS.primary,
  color: '#fff', border: 'none',
  borderRadius: 10, cursor: 'pointer',
  fontWeight: 700, fontSize: 13,
  transition: 'opacity 0.15s',
};
