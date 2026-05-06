import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotos } from '../hooks/usePhotos';
import { MOOD_COLORS, COLORS } from '../constants/colors';

export default function ListPage() {
  const { photos, loading, error, refetch } = usePhotos();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: COLORS.textSecondary }}>목록 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <div style={{ color: COLORS.danger }}>{error}</div>
        <button
          onClick={refetch}
          style={{ padding: '10px 20px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text }}>목록</h1>
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

      {photos.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: COLORS.textMuted,
            padding: '80px 0',
            fontSize: 15,
          }}
        >
          등록된 사진이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {photos.map((photo, idx) => {
            const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];
            return (
              <div
                key={photo.id}
                onClick={() => navigate(`/photo/${photo.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '12px 16px',
                  background: COLORS.white,
                  borderRadius: 12,
                  cursor: 'pointer',
                  border: `1px solid ${COLORS.border}`,
                  transition: 'box-shadow 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {/* Index */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: '#f0f0f8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: COLORS.textSecondary,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </div>

                {/* Thumbnail */}
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: '#eee',
                  }}
                >
                  <img
                    src={photo.imageUrl || photo.image}
                    alt={photo.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: COLORS.text,
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {photo.title || '제목 없음'}
                  </div>
                  {photo.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: COLORS.textSecondary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {photo.description}
                    </div>
                  )}
                </div>

                {/* Right side */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  {mood && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: mood.bg,
                        padding: '3px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: mood.dot,
                          display: 'inline-block',
                        }}
                      />
                      {mood.label}
                    </span>
                  )}
                  {photo.likeCount != null && (
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                      ♥ {photo.likeCount}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: COLORS.textMuted }}>
                    {photo.gridColSpan || 6}칸
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
