import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../../constants/colors';

const METRICS = [
  { key: 'likes',  label: '좋아요' },
  { key: 'saves',  label: '저장' },
  { key: 'shares', label: '공유' },
];

export default function TopPhotos({ photos = [], metric = 'likes', onChangeMetric }) {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>인기 사진</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => onChangeMetric?.(m.key)}
              style={{
                padding: '5px 10px',
                borderRadius: 20,
                border: `1.5px solid ${metric === m.key ? COLORS.primary : COLORS.border}`,
                background: metric === m.key ? COLORS.primaryLight : COLORS.surface,
                color: metric === m.key ? COLORS.primary : COLORS.textSecondary,
                fontSize: 11,
                fontWeight: metric === m.key ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: COLORS.textMuted, fontSize: 13 }}>
          데이터가 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {photos.slice(0, 5).map((photo, i) => (
            <div
              key={photo.id}
              onClick={() => navigate(`/photo/${photo.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.surface,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = COLORS.bg; }}
              onMouseLeave={e => { e.currentTarget.style.background = COLORS.surface; }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : COLORS.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
                color: i < 3 ? '#fff' : COLORS.textMuted,
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div style={{
                width: 48, height: 48, borderRadius: 8,
                overflow: 'hidden', flexShrink: 0, background: COLORS.bg,
              }}>
                <img
                  src={photo.thumbnailUrl || photo.imageUrl}
                  alt={photo.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {photo.title || '제목 없음'}
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2, display: 'flex', gap: 8 }}>
                  <span>❤️ {photo.likesCount ?? 0}</span>
                  <span>🔖 {photo.savesCount ?? 0}</span>
                  <span>↗ {photo.sharesCount ?? 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
