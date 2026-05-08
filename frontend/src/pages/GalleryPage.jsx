import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotos } from '../hooks/usePhotos';
import PhotoCard from '../components/photo/PhotoCard';
import PhotoModal from '../components/photo/PhotoModal';

// 색상 정렬 순서: 따뜻한 색 → 자연 → 차가운 색 → 무채색
const COLOR_ORDER = ['WARM', 'ENERGETIC', 'VIBRANT', 'ROMANTIC', 'NATURAL', 'COOL', 'SERENE', 'MUTED', 'DRAMATIC', 'CLEAN', 'MONOCHROME'];

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
    setSelected(prev => prev?.id === updated.id ? updated : prev);
  }, []);

  if (loading) {
    return (
      <div style={centerStyle}>
        <div style={{ color: '#9ca3af', fontSize: 16 }}>갤러리 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...centerStyle, flexDirection: 'column', gap: 12 }}>
        <div style={{ color: '#e53e3e', fontSize: 15 }}>{error}</div>
        <button onClick={refetch} style={primaryBtn}>다시 시도</button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div style={{ ...centerStyle, flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>✦</div>
        <div style={{ color: '#9ca3af', fontSize: 16 }}>아직 사진이 없습니다.</div>
        <button onClick={() => navigate('/photo/new')} style={primaryBtn}>첫 사진 등록하기</button>
      </div>
    );
  }

  return (
    <div style={{ background: '#111111', minHeight: '100vh' }}>
      {/* 헤더 바 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 20px', borderBottom: '1px solid #1f1f1f',
      }}>
        <span style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>
          {sorted.length}개 · 색상순 정렬
        </span>
        <button onClick={() => navigate('/photo/new')} style={primaryBtn}>+ 사진 등록</button>
      </div>

      {/* 마소늬 그리드 — CSS columns */}
      <div style={{
        columns: '4 220px',
        columnGap: 4,
        padding: 4,
      }}>
        {sorted.map(photo => (
          <div key={photo.id} style={{ breakInside: 'avoid', marginBottom: 4 }}>
            <PhotoCard photo={photo} onClick={() => setSelected(photo)} />
          </div>
        ))}
      </div>

      {/* 상세 모달 */}
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
  height: '60vh', background: '#111111', minHeight: '100vh',
};

const primaryBtn = {
  padding: '9px 18px',
  background: '#5b6ef5',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 14,
};
