import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotos } from '../hooks/usePhotos';
import PhotoCard from '../components/photo/PhotoCard';
import { COLORS } from '../constants/colors';

function packRows(photos) {
  const rows = [];
  let row = [];
  let used = 0;
  for (const photo of photos) {
    const span = photo.gridColSpan || 6;
    if (used + span > 12 && row.length > 0) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push(photo);
    used += span;
  }
  if (row.length) rows.push(row);
  return rows;
}

export default function GalleryPage() {
  const { photos, loading, error, refetch } = usePhotos();
  const navigate = useNavigate();

  const rows = useMemo(() => packRows(photos), [photos]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: COLORS.textSecondary, fontSize: 16 }}>갤러리 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <div style={{ color: COLORS.danger, fontSize: 15 }}>{error}</div>
        <button
          onClick={refetch}
          style={{
            padding: '10px 20px',
            background: COLORS.primary,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <div style={{ fontSize: 48 }}>✦</div>
        <div style={{ color: COLORS.textSecondary, fontSize: 16 }}>아직 사진이 없습니다.</div>
        <button
          onClick={() => navigate('/photo/new')}
          style={{
            padding: '12px 24px',
            background: COLORS.primary,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          첫 사진 등록하기
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 0' }}>
      <div style={{ padding: '0 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text }}>갤러리</h1>
        <button
          onClick={() => navigate('/photo/new')}
          style={{
            padding: '8px 18px',
            background: COLORS.primary,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          + 사진 등록
        </button>
      </div>

      {/* 12-column grid rendered as flex rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} style={{ display: 'flex', gap: 2 }}>
            {row.map(photo => (
              <div
                key={photo.id}
                style={{ flex: photo.gridColSpan || 6, minWidth: 0 }}
              >
                <PhotoCard photo={photo} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
