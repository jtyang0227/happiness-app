import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotos } from '../hooks/usePhotos';
import { COLORS } from '../constants/colors';
import PhotoCard from '../components/photo/PhotoCard';
import PhotoModal from '../components/photo/PhotoModal';

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

export default function GalleryPage() {
  const { photos, loading, error, refetch } = usePhotos();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const sorted = useMemo(() => sortByColor(photos), [photos]);

  const handleUpdated = useCallback((updated) => {
    setSelected(prev => (prev?.id === updated.id ? updated : prev));
  }, []);

  if (loading) {
    return (
      <div style={centerStyle}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `3px solid ${COLORS.galleryBorder}`,
          borderTopColor: COLORS.primary,
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...centerStyle, flexDirection: 'column', gap: 14 }}>
        <div style={{ color: '#ff8080', fontSize: 15 }}>{error}</div>
        <button onClick={refetch} style={primaryBtn}>다시 시도</button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div style={{ ...centerStyle, flexDirection: 'column', gap: 16 }}>
        <span style={{ fontSize: 40, opacity: 0.3 }}>✦</span>
        <div style={{ color: '#555', fontSize: 15 }}>아직 등록된 사진이 없습니다.</div>
        <button onClick={() => navigate('/photo/new')} style={primaryBtn}>첫 사진 등록하기</button>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.galleryBg, minHeight: '100vh' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: `1px solid ${COLORS.galleryBorder}`,
      }}>
        <span style={{ fontSize: 12, color: '#444', fontWeight: 600, letterSpacing: '0.05em' }}>
          {sorted.length}장 · 색상 순
        </span>
        <button onClick={() => navigate('/photo/new')} style={primaryBtn}>
          + 등록
        </button>
      </div>

      {/* Masonry grid */}
      <div style={{
        columns: '4 200px',
        columnGap: 3,
        padding: 3,
      }}>
        {sorted.map(photo => (
          <div key={photo.id} style={{ breakInside: 'avoid', marginBottom: 3 }}>
            <PhotoCard photo={photo} onClick={() => setSelected(photo)} />
          </div>
        ))}
      </div>

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
  padding: '8px 18px',
  background: COLORS.primary,
  color: '#fff', border: 'none',
  borderRadius: 10, cursor: 'pointer',
  fontWeight: 700, fontSize: 13,
  boxShadow: '0 2px 10px rgba(91,110,245,0.3)',
  transition: 'opacity 0.15s',
};
