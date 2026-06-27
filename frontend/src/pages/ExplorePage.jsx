import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { photoApi } from '../services/api';
import { MOOD_COLORS } from '../constants/colors';
import GenreTabBar from '../components/common/GenreTabBar';

const HISTORY_KEY = 'searchHistory';
const MAX_HISTORY  = 5;

const SORT_OPTIONS = [
  { label: '최신순',    sortBy: 'createdAt',  order: 'desc' },
  { label: '오래된 순', sortBy: 'createdAt',  order: 'asc'  },
  { label: '좋아요 순', sortBy: 'likesCount', order: 'desc' },
  { label: '저장 순',   sortBy: 'savesCount', order: 'desc' },
];

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

function Highlight({ text, keyword }) {
  if (!keyword || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(91,110,245,0.35)', color: '#fff', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + keyword.length)}
      </mark>
      {text.slice(idx + keyword.length)}
    </>
  );
}

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
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <img
        src={photo.thumbnailUrl || photo.imageUrl}
        alt={photo.title || '사진'}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onError={e => { e.target.style.display = 'none'; }}
      />

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

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [photos, setPhotos]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [sortIdx, setSortIdx]           = useState(0);
  const [selectedGenre, setSelectedGenre] = useState(() => searchParams.get('genre') || '');
  const [query, setQuery]               = useState({
    keyword: '', colorMood: '', imageRatio: '', tags: '',
    genre: searchParams.get('genre') || '',
    sortBy: 'createdAt', order: 'desc',
  });

  // autocomplete + history
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory]         = useState(loadHistory);
  const [showDrop, setShowDrop]       = useState(false);
  const debounceRef                   = useRef(null);
  const inputRef                      = useRef(null);
  const dropRef                       = useRef(null);

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

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

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
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const commitSearch = useCallback((term) => {
    const t = term.trim();
    setSearch(t);
    setShowDrop(false);
    if (t) { saveHistory(t); setHistory(loadHistory()); }
    const s = SORT_OPTIONS[sortIdx];
    setQuery(q => ({ ...q, keyword: t, sortBy: s.sortBy, order: s.order }));
  }, [sortIdx]);

  const handleGenreChange = useCallback((g) => {
    setSelectedGenre(g);
    const newParams = new URLSearchParams(searchParams);
    if (g) { newParams.set('genre', g); } else { newParams.delete('genre'); }
    setSearchParams(newParams, { replace: true });
    setQuery(q => ({ ...q, genre: g }));
  }, [searchParams, setSearchParams]);

  const handleSortChange = (idx) => {
    const s = SORT_OPTIONS[idx];
    setSortIdx(idx);
    setQuery(q => ({ ...q, sortBy: s.sortBy, order: s.order }));
  };

  const handleSearch = (e) => { e.preventDefault(); commitSearch(search); };

  const dropItems = search.trim() ? suggestions : history;
  const dropType  = search.trim() ? 'suggestion' : 'history';

  return (
    <div style={{ minHeight: '100vh', background: '#090909' }}>
      <style>{`
        .explore-masonry { columns: 4 200px; }
        @media(max-width:1024px) { .explore-masonry { columns: 3; } }
        @media(max-width:640px)  { .explore-masonry { columns: 2; } }
        .explore-search-btn:hover { background: rgba(255,255,255,0.12) !important; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>

        {/* 검색바 */}
        <form onSubmit={handleSearch} style={{ marginBottom: 20, position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: '#1c1c1c',
            border: `1px solid ${showDrop && dropItems.length ? '#5b6ef5' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 9999,
            padding: '0 16px',
            transition: 'border-color 0.2s',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, marginRight: 10, flexShrink: 0 }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
              onKeyDown={e => { if (e.key === 'Escape') setShowDrop(false); }}
              placeholder="사진 제목, 설명 검색..."
              style={{
                flex: 1,
                padding: '13px 0',
                fontSize: 14, color: '#ffffff', outline: 'none',
                background: 'transparent', border: 'none',
              }}
            />
            <select
              value={sortIdx}
              onChange={e => handleSortChange(Number(e.target.value))}
              style={{
                background: 'transparent', border: 'none',
                color: 'rgba(255,255,255,0.50)', fontSize: 13,
                cursor: 'pointer', outline: 'none',
                padding: '13px 0 13px 8px', flexShrink: 0,
              }}
            >
              {SORT_OPTIONS.map((opt, i) => (
                <option key={opt.label} value={i} style={{ background: '#1c1c1c' }}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 검색어 자동완성 + 최근 검색 드롭다운 */}
          {showDrop && dropItems.length > 0 && (
            <div
              ref={dropRef}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
                background: '#161616',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 20, overflow: 'hidden',
                boxShadow: '0 16px 48px rgba(0,0,0,0.70)',
              }}
            >
              {dropType === 'history' && (
                <div style={{ padding: '8px 16px 4px', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                  최근 검색어
                </div>
              )}
              {dropItems.map((item, i) => (
                <div
                  key={i}
                  onMouseDown={e => { e.preventDefault(); commitSearch(item); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px', cursor: 'pointer', fontSize: 14,
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
                      style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', padding: '2px 6px' }}
                    >
                      ✕
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </form>

        {/* 장르 탭바 — Cosmos 언더라인 스타일 */}
        <div style={{ marginBottom: 24 }}>
          <GenreTabBar
            selected={selectedGenre}
            onChange={handleGenreChange}
            theme="dark"
          />
        </div>

        {/* 결과 수 */}
        {!loading && !error && (
          <div style={{ marginBottom: 16, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            {query.keyword
              ? `"${query.keyword}" 검색 결과 ${photos.length}장`
              : `${photos.length}장`}
            {query.genre && (
              <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.25)' }}>
                · {selectedGenre}
              </span>
            )}
          </div>
        )}

        {/* 포토 그리드 */}
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.30)', padding: '80px 0' }}>
            불러오는 중...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', color: '#e53e3e', padding: '80px 0' }}>{error}</div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.40)', fontWeight: 500 }}>
              {query.keyword || query.genre ? '검색 결과가 없습니다.' : '등록된 사진이 없습니다.'}
            </div>
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
