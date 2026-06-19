import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { photoApi } from '../services/api';
import { MOOD_COLORS, COLORS } from '../constants/colors';
import { GLASS, GLASS_KEYFRAMES } from '../constants/glass';

const HISTORY_KEY = 'searchHistory';
const MAX_HISTORY  = 5;

const MOODS = [
  { value: '', label: '전체' },
  { value: 'WARM', label: '따뜻함' },
  { value: 'COOL', label: '차가움' },
  { value: 'NATURAL', label: '자연' },
  { value: 'VIBRANT', label: '생동감' },
  { value: 'MUTED', label: '차분함' },
  { value: 'ROMANTIC', label: '로맨틱' },
  { value: 'DRAMATIC', label: '드라마틱' },
  { value: 'ENERGETIC', label: '에너지' },
  { value: 'SERENE', label: '평온' },
  { value: 'CLEAN', label: '깔끔함' },
  { value: 'MONOCHROME', label: '흑백' },
];

const RATIOS = [
  { value: '', label: '전체 비율' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
];

const SORT_OPTIONS = [
  { label: '최신순',    sortBy: 'createdAt',  order: 'desc' },
  { label: '오래된 순', sortBy: 'createdAt',  order: 'asc'  },
  { label: '좋아요 순', sortBy: 'likesCount', order: 'desc' },
  { label: '저장 순',   sortBy: 'savesCount', order: 'desc' },
];

/* ── helpers ─────────────────────────────────────────── */

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); }
  catch { return []; }
}

function saveHistory(term) {
  if (!term.trim()) return;
  const prev = loadHistory().filter(h => h !== term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([term, ...prev].slice(0, MAX_HISTORY)));
}

function removeHistory(term) {
  const updated = loadHistory().filter(h => h !== term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

/** 텍스트에서 keyword와 일치하는 부분을 하이라이트 span으로 렌더링 */
function Highlight({ text, keyword }) {
  if (!keyword || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#fff3a3', color: COLORS.text, borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + keyword.length)}
      </mark>
      {text.slice(idx + keyword.length)}
    </>
  );
}

/* ── PhotoCard ───────────────────────────────────────── */

function PhotoCard({ photo, keyword }) {
  const navigate = useNavigate();
  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];

  return (
    <div
      onClick={() => navigate(`/photo/${photo.id}`)}
      style={{
        background: GLASS.light.surface,
        backdropFilter: GLASS.light.blur,
        WebkitBackdropFilter: GLASS.light.blur,
        borderRadius: 20, overflow: 'hidden',
        border: `1px solid ${GLASS.light.border}`,
        boxShadow: GLASS.light.shadow,
        cursor: 'pointer',
        transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease',
        animation: 'glassIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
        e.currentTarget.style.boxShadow = GLASS.light.shadowStrong;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = GLASS.light.shadow;
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: '#f0f0f0' }}>
        <img
          src={photo.thumbnailUrl || photo.imageUrl}
          alt={photo.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
        {mood && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            display: 'flex', alignItems: 'center', gap: 4,
            background: mood.bg, padding: '3px 9px', borderRadius: 10,
            fontSize: 11, fontWeight: 700,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
            {mood.label}
          </div>
        )}
        {photo.dominantColor && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            width: 14, height: 14, borderRadius: '50%',
            background: photo.dominantColor,
            border: '2px solid rgba(255,255,255,0.8)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          }} />
        )}
      </div>

      <div style={{ padding: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 6, lineHeight: 1.4 }}>
          <Highlight text={photo.title || '제목 없음'} keyword={keyword} />
        </h3>
        {photo.description && (
          <p style={{
            fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.5, marginBottom: 10,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            <Highlight text={photo.description} keyword={keyword} />
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: COLORS.textMuted }}>{photo.imageRatio}</span>
          <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>♡ {photo.likesCount ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

/* ── ExplorePage ─────────────────────────────────────── */

export default function ExplorePage() {
  const [photos, setPhotos]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [mood, setMood]             = useState('');
  const [imageRatio, setImageRatio] = useState('');
  const [sortIdx, setSortIdx]       = useState(0);
  const [tagInput, setTagInput]     = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const [query, setQuery]           = useState({ keyword: '', colorMood: '', imageRatio: '', tags: '', sortBy: 'createdAt', order: 'desc' });

  // autocomplete + history
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory]         = useState(loadHistory);
  const [showDrop, setShowDrop]       = useState(false);
  const debounceRef                   = useRef(null);
  const inputRef                      = useRef(null);
  const dropRef                       = useRef(null);

  /* ── fetch photos ─────────────────────────────────── */
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await photoApi.search(query);
      setPhotos(res?.data ?? (Array.isArray(res) ? res : []));
    } catch {
      setError('사진을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  /* ── tag helpers ──────────────────────────────────── */
  const addTag = (tag) => {
    const t = tag.trim();
    if (!t || activeTags.includes(t)) return;
    const next = [...activeTags, t];
    setActiveTags(next);
    const s = SORT_OPTIONS[sortIdx];
    setQuery(q => ({ ...q, tags: next.join(','), sortBy: s.sortBy, order: s.order }));
    setTagInput('');
  };

  const removeTag = (tag) => {
    const next = activeTags.filter(t => t !== tag);
    setActiveTags(next);
    setQuery(q => ({ ...q, tags: next.join(',') }));
  };

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  /* ── autocomplete debounce ────────────────────────── */
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

  /* ── close dropdown on outside click ─────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── helpers ──────────────────────────────────────── */
  const applyFilters = useCallback((overrides = {}) => {
    const s = SORT_OPTIONS[overrides.sortIdx ?? sortIdx];
    setQuery(q => ({
      keyword:    overrides.keyword    ?? search.trim(),
      colorMood:  overrides.colorMood  ?? mood,
      imageRatio: overrides.imageRatio ?? imageRatio,
      tags:       q.tags,
      sortBy:     s.sortBy,
      order:      s.order,
    }));
  }, [search, mood, imageRatio, sortIdx]);

  const commitSearch = useCallback((term) => {
    const t = term.trim();
    setSearch(t);
    setShowDrop(false);
    if (t) { saveHistory(t); setHistory(loadHistory()); }
    const s = SORT_OPTIONS[sortIdx];
    setQuery(q => ({ keyword: t, colorMood: mood, imageRatio, tags: q.tags, sortBy: s.sortBy, order: s.order }));
  }, [sortIdx, mood, imageRatio]);

  const handleSearch = (e) => { e.preventDefault(); commitSearch(search); };

  const dropItems = search.trim() ? suggestions : history;
  const dropType  = search.trim() ? 'suggestion' : 'history';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f0f2ff 0%, #f8f5ff 50%, #eff8ff 100%)',
    }}>
    <style>{GLASS_KEYFRAMES}</style>
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>탐색</h1>
        <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>{photos.length}장의 사진을 둘러보세요</p>
      </div>

      {/* Search form + sort */}
      <form onSubmit={handleSearch} style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        {/* Glass search pill */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDrop(true); }}
            onFocus={() => setShowDrop(true)}
            onKeyDown={e => { if (e.key === 'Escape') setShowDrop(false); }}
            placeholder="제목, 설명 검색... (유사어 포함)"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 20px', borderRadius: 50,
              border: `1px solid ${showDrop && dropItems.length ? COLORS.primary : GLASS.light.border}`,
              fontSize: 14, color: COLORS.text, outline: 'none',
              background: GLASS.light.surfaceStrong,
              backdropFilter: GLASS.light.blur,
              WebkitBackdropFilter: GLASS.light.blur,
              boxShadow: GLASS.light.shadow,
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
          />

          {/* Dropdown */}
          {showDrop && dropItems.length > 0 && (
            <div
              ref={dropRef}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
                background: GLASS.light.surfaceStrong,
                backdropFilter: GLASS.light.blurStrong,
                WebkitBackdropFilter: GLASS.light.blurStrong,
                borderRadius: 20,
                border: `1px solid ${GLASS.light.border}`,
                boxShadow: GLASS.light.shadowStrong, overflow: 'hidden',
              }}
            >
              {dropType === 'history' && (
                <div style={{ padding: '8px 12px 4px', fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>
                  최근 검색어
                </div>
              )}
              {dropItems.map((item, i) => (
                <div
                  key={i}
                  onMouseDown={e => { e.preventDefault(); commitSearch(item); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 14px', cursor: 'pointer', fontSize: 14,
                    color: COLORS.text, transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = COLORS.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span>
                    {dropType === 'history' ? '🕐 ' : '🔍 '}
                    <Highlight text={item} keyword={search} />
                  </span>
                  {dropType === 'history' && (
                    <span
                      onMouseDown={e => {
                        e.stopPropagation();
                        removeHistory(item);
                        setHistory(loadHistory());
                      }}
                      style={{ fontSize: 12, color: COLORS.textMuted, padding: '2px 6px' }}
                    >
                      ✕
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <select
          value={sortIdx}
          onChange={e => {
            const idx = Number(e.target.value);
            setSortIdx(idx);
            applyFilters({ sortIdx: idx });
          }}
          style={{
            padding: '12px 14px', borderRadius: 50,
            border: `1px solid ${GLASS.light.border}`, fontSize: 13, color: COLORS.text,
            background: GLASS.light.surfaceStrong,
            backdropFilter: GLASS.light.blur,
            WebkitBackdropFilter: GLASS.light.blur,
            cursor: 'pointer', outline: 'none',
            boxShadow: GLASS.light.shadow,
          }}
        >
          {SORT_OPTIONS.map((opt, idx) => (
            <option key={opt.label} value={idx}>{opt.label}</option>
          ))}
        </select>
        <button
          type="submit"
          style={{
            padding: '12px 24px', borderRadius: 50,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
            color: '#fff', border: 'none',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(91,110,245,0.35)',
            transition: 'opacity 0.15s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(1.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = ''; }}
        >
          검색
        </button>
      </form>

      {/* Mood filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {MOODS.map(m => {
          const moodInfo = m.value ? MOOD_COLORS[m.value] : null;
          const active = mood === m.value;
          return (
            <button
              key={m.value}
              onClick={() => { const next = mood === m.value ? '' : m.value; setMood(next); applyFilters({ colorMood: next }); }}
              style={{
                padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12,
                fontWeight: active ? 700 : 500,
                background: active ? (moodInfo?.bg ?? COLORS.primary) : COLORS.border,
                color: active ? (moodInfo?.dot ?? '#fff') : COLORS.textSecondary,
                transition: 'all 0.15s',
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Ratio filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {RATIOS.map(r => {
          const active = imageRatio === r.value;
          return (
            <button
              key={r.value}
              onClick={() => { const next = imageRatio === r.value ? '' : r.value; setImageRatio(next); applyFilters({ imageRatio: next }); }}
              style={{
                padding: '4px 11px', borderRadius: 20,
                border: `1.5px solid ${active ? COLORS.primary : COLORS.border}`,
                background: active ? COLORS.primaryLight : COLORS.surface,
                color: active ? COLORS.primary : COLORS.textSecondary,
                fontSize: 12, fontWeight: active ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Tag filter */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 600, marginBottom: 6 }}>
          태그 검색 (사진에 태그된 이름)
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {activeTags.map(tag => (
            <span key={tag} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 20,
              background: COLORS.primary, color: '#fff', fontSize: 12, fontWeight: 700,
            }}>
              #{tag}
              <span onClick={() => removeTag(tag)} style={{ cursor: 'pointer', opacity: 0.8, fontSize: 11 }}>✕</span>
            </span>
          ))}
          <form onSubmit={e => { e.preventDefault(); addTag(tagInput); }} style={{ display: 'flex', gap: 4 }}>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="태그 입력 후 Enter"
              style={{
                padding: '5px 10px', borderRadius: 20, fontSize: 12,
                border: `1.5px solid ${COLORS.border}`, outline: 'none', color: COLORS.text,
                width: 140,
              }}
            />
          </form>
        </div>
      </div>

      {/* Active keyword badge */}
      {query.keyword && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: COLORS.textSecondary }}>검색:</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            background: COLORS.primaryLight, color: COLORS.primary, fontSize: 13, fontWeight: 700,
          }}>
            {query.keyword}
            <span
              onClick={() => { setSearch(''); commitSearch(''); }}
              style={{ cursor: 'pointer', fontWeight: 400 }}
            >✕</span>
          </span>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: 'center', color: COLORS.textMuted, padding: '60px 0' }}>불러오는 중...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', color: COLORS.danger, padding: '60px 0' }}>{error}</div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', color: COLORS.textMuted, padding: '60px 0', fontSize: 15 }}>
          {query.keyword || query.colorMood || query.imageRatio ? '검색 결과가 없습니다.' : '등록된 사진이 없습니다.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {photos.map(photo => (
            <PhotoCard key={photo.id} photo={photo} keyword={query.keyword} />
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
