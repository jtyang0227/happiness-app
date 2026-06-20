import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { photoApi } from '../services/api';
import { COLORS } from '../constants/colors';
import { glassDark } from '../constants/glass';
import PhotoCard from '../components/photo/PhotoCard';
import PhotoModal from '../components/photo/PhotoModal';
import EmptyState from '../components/common/EmptyState';
import { SkeletonGalleryCard } from '../components/common/Skeleton';
import { useGalleryLayout } from '../hooks/useGalleryLayout';

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

/* ── 정렬 옵션 ── */
const SORT_OPTIONS = [
  { label: '최신순',    value: 'createdAt',    order: 'desc', clientSort: null },
  { label: '오래된 순', value: 'createdAt',    order: 'asc',  clientSort: null, key: 'oldest' },
  { label: '좋아요 순', value: 'likesCount',   order: 'desc', clientSort: null },
  { label: '저장 순',   value: 'savesCount',   order: 'desc', clientSort: null },
  { label: '색상 순',   value: 'color',        order: 'asc',  clientSort: true  },
  { label: '수동 순',   value: 'displayOrder', order: 'asc',  clientSort: null  },
];

/* ── 뷰 모드 ── */
const VIEW_MODES = [
  { mode: 'justified', icon: '▦', label: 'Justified' },
  { mode: 'masonry',   icon: '⊞', label: 'Masonry'   },
  { mode: 'list',      icon: '☰', label: 'List'       },
];

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
        background: '#1a1a2e',
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

/* ── GalleryPage ── */
export default function GalleryPage() {
  const navigate = useNavigate();

  const [photos, setPhotos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState(null);
  const [sortIdx, setSortIdx]   = useState(0);
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem('gallery_view') ?? 'justified',
  );

  const currentSort = SORT_OPTIONS[sortIdx];

  // 뷰 모드 localStorage 저장
  useEffect(() => {
    localStorage.setItem('gallery_view', viewMode);
  }, [viewMode]);

  /* ── 데이터 패치 ── */
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
    [photos, currentSort],
  );

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
        <div style={{ color: '#ff8080', fontSize: 15 }}>{error}</div>
        <button onClick={fetchPhotos} style={primaryBtn}>다시 시도</button>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.galleryBg, minHeight: '100vh' }}>

      {/* ── 툴바 ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', gap: 10, flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 10,
        ...glassDark('dark'),
        borderRadius: 0,
        borderLeft: 'none', borderRight: 'none', borderTop: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>

        {/* 정렬 칩 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {SORT_OPTIONS.map((opt, idx) => (
            <button
              key={opt.key ?? opt.value + opt.order}
              onClick={() => setSortIdx(idx)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12,
                fontWeight: sortIdx === idx ? 700 : 500,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                ...(sortIdx === idx
                  ? {
                      background: COLORS.primary, color: '#fff',
                      boxShadow: '0 2px 10px rgba(91,110,245,0.35), inset 0 1.5px 0 rgba(255,255,255,0.25)',
                    }
                  : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }
                ),
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 우측 컨트롤 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* 뷰 모드 3종 토글 */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            {VIEW_MODES.map(({ mode, icon, label }) => (
              <button
                key={mode}
                title={label}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '6px 11px', border: 'none', cursor: 'pointer', fontSize: 14,
                  background: viewMode === mode ? COLORS.primary : 'transparent',
                  color: viewMode === mode ? '#fff' : 'rgba(255,255,255,0.45)',
                  transition: 'all 0.15s',
                }}
              >
                {icon}
              </button>
            ))}
          </div>

          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            {displayed.length}장
          </span>

          <button onClick={() => navigate('/photo/new')} style={primaryBtn}>+ 등록</button>
        </div>
      </div>

      {/* ── 콘텐츠 ── */}
      {loading ? (
        /* 스켈레톤 — masonry로 통일 */
        <>
          <style>{`.gallery-masonry{columns:4 200px}@media(max-width:600px){.gallery-masonry{columns:2}}`}</style>
          <div className="gallery-masonry" style={{ columnGap: 4, padding: 4 }}>
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
                  <div style={{ flex: 1, background: COLORS.galleryBg }} />
                )}
              </div>
            ))
          ) : (
            /* 컨테이너 너비 감지 전 폴백 — masonry로 표시 */
            <>
              <style>{`.gallery-masonry{columns:4 200px}@media(max-width:600px){.gallery-masonry{columns:2}}`}</style>
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
          <style>{`.gallery-masonry{columns:4 200px}@media(max-width:600px){.gallery-masonry{columns:2}}`}</style>
          <div className="gallery-masonry" style={{ columnGap: 4, padding: 4 }}>
            {displayed.map(photo => (
              <div key={photo.id} style={{ breakInside: 'avoid', marginBottom: 4 }}>
                <PhotoCard photo={photo} onClick={() => setSelected(photo)} />
              </div>
            ))}
          </div>
        </>

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

      {/* ── 상세 모달 ── */}
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

/* ── 스타일 상수 ── */
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
