import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { photoApi } from '../services/api';
import { MOOD_COLORS, COLORS } from '../constants/colors';

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
  { label: '최신순',    sortBy: 'createdAt',    order: 'desc' },
  { label: '오래된 순', sortBy: 'createdAt',    order: 'asc'  },
  { label: '좋아요 순', sortBy: 'likesCount',   order: 'desc' },
  { label: '저장 순',   sortBy: 'savesCount',   order: 'desc' },
];

function PhotoCard({ photo }) {
  const navigate = useNavigate();
  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];

  return (
    <div
      onClick={() => navigate(`/photo/${photo.id}`)}
      style={{
        background: COLORS.surface,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
      }}
    >
      {/* Image */}
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
        {/* 색상 팔레트 도트 */}
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

      {/* Content */}
      <div style={{ padding: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 6, lineHeight: 1.4 }}>
          {photo.title || '제목 없음'}
        </h3>
        {photo.description && (
          <p style={{
            fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.5, marginBottom: 10,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {photo.description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: COLORS.textMuted }}>
            {photo.imageRatio}
          </span>
          <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>
            ♡ {photo.likesCount ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [photos, setPhotos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [mood, setMood]           = useState('');
  const [imageRatio, setImageRatio] = useState('');
  const [sortIdx, setSortIdx]     = useState(0);
  const [query, setQuery]         = useState({ keyword: '', colorMood: '', imageRatio: '', sortBy: 'createdAt', order: 'desc' });

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await photoApi.search(query);
      const list = res?.data ?? (Array.isArray(res) ? res : []);
      setPhotos(list);
    } catch {
      setError('사진을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const applyFilters = useCallback((overrides = {}) => {
    const s = SORT_OPTIONS[overrides.sortIdx ?? sortIdx];
    setQuery({
      keyword:    overrides.keyword    ?? search.trim(),
      colorMood:  overrides.colorMood  ?? mood,
      imageRatio: overrides.imageRatio ?? imageRatio,
      sortBy:     s.sortBy,
      order:      s.order,
    });
  }, [search, mood, imageRatio, sortIdx]);

  const handleSearch = (e) => {
    e.preventDefault();
    applyFilters();
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>탐색</h1>
        <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>
          {photos.length}장의 사진을 둘러보세요
        </p>
      </div>

      {/* Search form + sort */}
      <form onSubmit={handleSearch} style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="제목, 설명 검색..."
          style={{
            flex: 1, padding: '11px 16px', borderRadius: 12,
            border: `1.5px solid ${COLORS.border}`, fontSize: 14, color: COLORS.text, outline: 'none',
          }}
        />
        <select
          value={sortIdx}
          onChange={e => {
            const idx = Number(e.target.value);
            setSortIdx(idx);
            applyFilters({ sortIdx: idx });
          }}
          style={{
            padding: '11px 14px', borderRadius: 12,
            border: `1.5px solid ${COLORS.border}`, fontSize: 13, color: COLORS.text,
            background: COLORS.surface, cursor: 'pointer', outline: 'none',
          }}
        >
          {SORT_OPTIONS.map((opt, idx) => (
            <option key={opt.label} value={idx}>{opt.label}</option>
          ))}
        </select>
        <button
          type="submit"
          style={{
            padding: '11px 20px', borderRadius: 12,
            background: COLORS.primary, color: '#fff', border: 'none',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
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
              onClick={() => {
                const next = mood === m.value ? '' : m.value;
                setMood(next);
                applyFilters({ colorMood: next });
              }}
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
              onClick={() => {
                const next = imageRatio === r.value ? '' : r.value;
                setImageRatio(next);
                applyFilters({ imageRatio: next });
              }}
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

      {/* Content */}
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
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>
      )}
    </div>
  );
}

const centerStyle = {
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  minHeight: '70vh',
};

const primaryBtn = {
  padding: '8px 18px', background: COLORS.primary, color: '#fff',
  border: 'none', borderRadius: 10, cursor: 'pointer',
  fontWeight: 700, fontSize: 13,
};

const chipStyle = (active) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '5px 12px', borderRadius: 20,
  border: `1.5px solid ${active ? COLORS.primary : COLORS.border}`,
  background: active ? COLORS.primaryLight : COLORS.surface,
  color: active ? COLORS.primary : COLORS.textSecondary,
  fontSize: 12, fontWeight: active ? 700 : 500,
  cursor: 'pointer', transition: 'all 0.15s',
});
