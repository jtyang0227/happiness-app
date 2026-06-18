import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { photoApi } from '../services/api';
import { COLORS } from '../constants/colors';
import PhotoCard from '../components/photo/PhotoCard';
import PhotoModal from '../components/photo/PhotoModal';
import EmptyState from '../components/common/EmptyState';
import { SkeletonGalleryCard } from '../components/common/Skeleton';

const COLOR_ORDER = [
  'WARM', 'ENERGETIC', 'VIBRANT', 'ROMANTIC',
  'NATURAL', 'COOL', 'SERENE',
  'MUTED', 'DRAMATIC', 'CLEAN', 'MONOCHROME',
];

const SORT_OPTIONS = [
  { label: '최신순',       value: 'createdAt',   order: 'desc', clientSort: null },
  { label: '오래된 순',    value: 'createdAt',   order: 'asc',  clientSort: null, key: 'oldest' },
  { label: '좋아요 순',    value: 'likesCount',  order: 'desc', clientSort: null },
  { label: '저장 순',      value: 'savesCount',  order: 'desc', clientSort: null },
  { label: '색상 순',      value: 'color',       order: 'asc',  clientSort: true  },
];

function sortByColor(photos) {
  return [...photos].sort((a, b) => {
    const ai = COLOR_ORDER.indexOf(a.colorMood ?? '');
    const bi = COLOR_ORDER.indexOf(b.colorMood ?? '');
    return (ai === -1 ? COLOR_ORDER.length : ai) - (bi === -1 ? COLOR_ORDER.length : bi);
  });
}

export default function GalleryPage() {
  const navigate = useNavigate();
  const [photos, setPhotos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [selected, setSelected]   = useState(null);
  const [sortIdx, setSortIdx]     = useState(0);
  const [viewMode, setViewMode]   = useState('masonry');

  const currentSort = SORT_OPTIONS[sortIdx];

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = currentSort.clientSort
        ? {}
        : { sortBy: currentSort.value, order: currentSort.order };
      const res = await photoApi.search(params);
      const list = res?.data ?? (Array.isArray(res) ? res : []);
      setPhotos(list);
    } catch {
      setError('사진을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentSort]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const displayed = useMemo(
    () => currentSort.clientSort ? sortByColor(photos) : photos,
    [photos, currentSort]
  );

  const handleUpdated = useCallback((updated) => {
    setPhotos(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(prev => (prev?.id === updated.id ? updated : prev));
  }, []);

  if (error) {
    return (
      <div style={{ ...centerStyle, flexDirection: 'column', gap: 14 }}>
        <div style={{ color: '#ff8080', fontSize: 15 }}>{error}</div>
        <button onClick={fetchPhotos} style={primaryBtn}>다시 시도</button>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.galleryBg, minHeight: '100vh' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', gap: 10, flexWrap: 'wrap',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>

        {/* Sort chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {SORT_OPTIONS.map((opt, idx) => (
            <button
              key={opt.key ?? opt.value + opt.order}
              onClick={() => setSortIdx(idx)}
              style={{
                padding: '5px 12px', borderRadius: 20, border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: sortIdx === idx ? 700 : 500,
                background: sortIdx === idx ? COLORS.primary : 'rgba(255,255,255,0.08)',
                color: sortIdx === idx ? '#fff' : 'rgba(255,255,255,0.55)',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
            {[
              { mode: 'masonry', icon: '⊞' },
              { mode: 'list',    icon: '☰' },
            ].map(({ mode, icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '6px 11px', border: 'none', cursor: 'pointer', fontSize: 15,
                  background: viewMode === mode ? COLORS.primary : 'transparent',
                  color: viewMode === mode ? '#fff' : 'rgba(255,255,255,0.45)',
                  transition: 'all 0.15s',
                }}
              >
                {icon}
              </button>
            ))}
          </div>

          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{displayed.length}장</span>

          <button onClick={() => navigate('/photo/new')} style={primaryBtn}>+ 등록</button>
        </div>
      </div>

      {loading ? (
        /* 스켈레톤 로딩 — 마소닉 */
        <>
          <style>{`
            .gallery-masonry { columns: 4 200px; }
            @media (max-width: 600px) { .gallery-masonry { columns: 2; } }
          `}</style>
          <div className="gallery-masonry" style={{ columnGap: 3, padding: 3 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonGalleryCard key={i} dark />
            ))}
          </div>
        </>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon="✦"
          title="아직 등록된 사진이 없습니다"
          description="첫 번째 사진을 등록하고 갤러리를 채워보세요."
          actionLabel="첫 사진 등록하기"
          onAction={() => navigate('/photo/new')}
          theme="dark"
          style={{ minHeight: '60vh' }}
        />
      ) : viewMode === 'masonry' ? (
        /* Masonry grid — PC 4컬럼, 모바일 2컬럼 */
        <>
          <style>{`
            .gallery-masonry { columns: 4 200px; }
            @media (max-width: 600px) { .gallery-masonry { columns: 2; } }
          `}</style>
          <div className="gallery-masonry" style={{ columnGap: 3, padding: 3 }}>
            {displayed.map(photo => (
              <div key={photo.id} style={{ breakInside: 'avoid', marginBottom: 3 }}>
                <PhotoCard photo={photo} onClick={() => setSelected(photo)} />
              </div>
            ))}
          </div>
        </>
      ) : (
        /* List view */
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '16px 16px' }}>
          {displayed.map(photo => (
            <div
              key={photo.id}
              onClick={() => setSelected(photo)}
              style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
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
                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 4 }}>
                  {photo.title || '제목 없음'}
                </div>
                {photo.description && (
                  <div style={{
                    fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 1.5,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {photo.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  <span>♡ {photo.likesCount ?? 0}</span>
                  <span>🔖 {photo.savesCount ?? 0}</span>
                  {photo.colorMood && <span>{photo.colorMood}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <PhotoModal
          photo={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

const centerStyle = {
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  minHeight: '100vh', background: COLORS.galleryBg,
};

const primaryBtn = {
  padding: '7px 16px',
  background: COLORS.primary,
  color: '#fff', border: 'none',
  borderRadius: 10, cursor: 'pointer',
  fontWeight: 700, fontSize: 13,
  boxShadow: '0 2px 10px rgba(91,110,245,0.3)',
  transition: 'opacity 0.15s',
};
