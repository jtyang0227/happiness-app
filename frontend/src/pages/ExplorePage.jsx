import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { photoApi } from '../services/api';
import { MOOD_COLORS } from '../constants/colors';
import GenreTabBar from '../components/common/GenreTabBar';
import { GLASS_KEYFRAMES } from '../constants/glass';

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
      <mark style={{ background: '#fff3a3', color: '#1a1a2e', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + keyword.length)}
      </mark>
      {text.slice(idx + keyword.length)}
    </>
  );
}

/* ── ExplorePhotoCard — Cosmos dark editorial ───────── */

function ExplorePhotoCard({ photo, keyword }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];

  return (
    <div
      onClick={() => navigate(`/photo/${photo.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 8, overflow: 'hidden',
        cursor: 'pointer', position: 'relative',
        background: '#0f0f0f',
        transform: hovered ? 'scale(1.01)' : 'scale(1)',
        transition: `transform 0.3s cubic-bezier(0.4,0,0.2,1)`,
      }}
    >
      <img
        src={photo.thumbnailUrl || photo.imageUrl}
        alt={photo.title || '사진'}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onError={e => { e.target.style.display = 'none'; }}
      />

      {/* Mood badge */}
      {mood && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: '3px 9px', borderRadius: 10,
          fontSize: 11, fontWeight: 600, color: '#fff',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
          {mood.label}
        </div>
      )}

      {/* Author + title overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)',
        padding: '32px 12px 12px',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 4 }}>
          <Highlight text={photo.title || '제목 없음'} keyword={keyword} />
        </div>
        {photo.description && (
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            <Highlight text={photo.description} keyword={keyword} />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{photo.imageRatio}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>♡ {photo.likesCount ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

/* ── ExplorePage ─────────────────────────────────────── */

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [photos, setPhotos]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [mood, setMood]             = useState('');
  const [imageRatio, setImageRatio] = useState('');
  const [genre, setGenre]           = useState(null);
  const [sortIdx, setSortIdx]       = useState(0);
  const [tagInput, setTagInput]     = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(() => searchParams.get('genre') || '');
  const [query, setQuery]           = useState({ keyword: '', colorMood: '', imageRatio: '', tags: '', genre: searchParams.get('genre') || '', sortBy: 'createdAt', order: 'desc' });

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
      genre:      overrides.genre !== undefined ? overrides.genre : genre,
      tags:       q.tags,
      genre:      overrides.genre !== undefined ? overrides.genre : selectedGenre,
      sortBy:     s.sortBy,
      order:      s.order,
    }));
  }, [search, mood, imageRatio, sortIdx, selectedGenre]);

  const commitSearch = useCallback((term) => {
    const t = term.trim();
    setSearch(t);
    setShowDrop(false);
    if (t) { saveHistory(t); setHistory(loadHistory()); }
    const s = SORT_OPTIONS[sortIdx];
    setQuery(q => ({ keyword: t, colorMood: mood, imageRatio, tags: q.tags, genre: selectedGenre, sortBy: s.sortBy, order: s.order }));
  }, [sortIdx, mood, imageRatio, selectedGenre]);

  const handleGenreChange = useCallback((genre) => {
    setSelectedGenre(genre);
    const newParams = new URLSearchParams(searchParams);
    if (genre) { newParams.set('genre', genre); } else { newParams.delete('genre'); }
    setSearchParams(newParams, { replace: true });
    applyFilters({ genre });
  }, [searchParams, setSearchParams, applyFilters]);

  const handleSearch = (e) => { e.preventDefault(); commitSearch(search); };

  const dropItems = search.trim() ? suggestions : history;
  const dropType  = search.trim() ? 'suggestion' : 'history';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090909',
    }}>
    <style>{GLASS_KEYFRAMES}{`
      .explore-masonry { columns: 4 200px; }
      @media(max-width:1024px) { .explore-masonry { columns: 3; } }
      @media(max-width:640px)  { .explore-masonry { columns: 2; } }
    `}</style>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>탐색</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>{photos.length}장의 사진을 둘러보세요</p>
      </div>

      {/* Search form + sort */}
      <form onSubmit={handleSearch} style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        {/* Dark pill search bar */}
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
              padding: '12px 20px', borderRadius: 9999,
              fontSize: 14, color: '#ffffff', outline: 'none',
              background: '#1c1c1c',
              border: `1px solid ${showDrop && dropItems.length ? '#5b6ef5' : 'rgba(255,255,255,0.10)'}`,
              transition: 'border-color 0.2s',
            }}
          />

          {/* Dropdown */}
          {showDrop && dropItems.length > 0 && (
            <div
              ref={dropRef}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
                background: '#161616',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: '0 16px 48px rgba(0,0,0,0.70)',
              }}
            >
              {dropType === 'history' && (
                <div style={{ padding: '8px 12px 4px', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
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
                    color: 'rgba(255,255,255,0.80)', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
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
                      style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '2px 6px' }}
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
            padding: '12px 14px', borderRadius: 9999,
            border: '1px solid rgba(255,255,255,0.10)', fontSize: 13, color: 'rgba(255,255,255,0.70)',
            background: '#1c1c1c',
            cursor: 'pointer', outline: 'none',
          }}
        >
          {SORT_OPTIONS.map((opt, idx) => (
            <option key={opt.label} value={idx}>{opt.label}</option>
          ))}
        </select>
        <button
          type="submit"
          style={{
            padding: '12px 24px', borderRadius: 9999,
            background: `linear-gradient(135deg, #5b6ef5, #a78bfa)`,
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

      {/* Genre tab bar */}
      <div style={{ marginBottom: 12 }}>
        <GenreTabBar
          selected={selectedGenre}
          onChange={handleGenreChange}
          theme="dark"
        />
      </div>

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
                background: active ? (moodInfo?.bg ?? '#5b6ef5') : 'rgba(255,255,255,0.07)',
                color: active ? (moodInfo?.dot ?? '#fff') : 'rgba(255,255,255,0.55)',
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
                border: `1.5px solid ${active ? '#5b6ef5' : 'rgba(255,255,255,0.12)'}`,
                background: active ? 'rgba(91,110,245,0.18)' : 'transparent',
                color: active ? '#a78bfa' : 'rgba(255,255,255,0.50)',
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
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginBottom: 6 }}>
          태그 검색 (사진에 태그된 이름)
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {activeTags.map(tag => (
            <span key={tag} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 20,
              background: '#5b6ef5', color: '#fff', fontSize: 12, fontWeight: 700,
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
                border: '1.5px solid rgba(255,255,255,0.12)', outline: 'none',
                color: '#ffffff', background: 'rgba(255,255,255,0.05)',
                width: 140,
              }}
            />
          </form>
        </div>
      </div>

      {/* Active keyword badge */}
      {query.keyword && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>검색:</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            background: 'rgba(91,110,245,0.18)', color: '#a78bfa', fontSize: 13, fontWeight: 700,
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
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: '60px 0' }}>불러오는 중...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', color: '#e53e3e', padding: '60px 0' }}>{error}</div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: '60px 0', fontSize: 15 }}>
          {query.keyword || query.colorMood || query.imageRatio ? '검색 결과가 없습니다.' : '등록된 사진이 없습니다.'}
        </div>
      ) : (
        <div className="explore-masonry" style={{ columnGap: 8 }}>
          {photos.map(photo => (
            <div key={photo.id} style={{ breakInside: 'avoid', marginBottom: 8 }}>
              <ExplorePhotoCard photo={photo} keyword={query.keyword} />
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
