import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { photoApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, MOOD_COLORS } from '../constants/colors';

function FeedCard({ photo, onClick }) {
  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];
  const createdAt = photo.createdAt ? new Date(photo.createdAt).toLocaleDateString('ko-KR') : '';

  return (
    <div
      onClick={() => onClick(photo.id)}
      style={{
        background: COLORS.surface,
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1px solid ${COLORS.border}`,
        transition: 'transform 0.18s, box-shadow 0.18s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(91,110,245,0.12)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4/3', background: '#0e0e0e', overflow: 'hidden' }}>
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
      </div>
      <div style={{ padding: '14px 16px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 6, lineHeight: 1.4 }}>
          {photo.title || '제목 없음'}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>{createdAt}</span>
          <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>♡ {photo.likesCount ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 20;

  const loadFeed = useCallback(async (pageNum = 0, append = false) => {
    if (!user?.id) return;
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await photoApi.getFeed(user.id, { page: pageNum, size: PAGE_SIZE });
      const items = res?.data ?? [];
      setPhotos(prev => append ? [...prev, ...items] : items);
      setHasMore(items.length === PAGE_SIZE);
    } catch {
      // 팔로우 없거나 오류 — 빈 피드 표시
      if (!append) setPhotos([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id]);

  useEffect(() => {
    setPage(0);
    loadFeed(0, false);
  }, [loadFeed]);

  const handleLoadMore = async () => {
    const next = page + 1;
    setPage(next);
    await loadFeed(next, true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.primary,
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 8 }}>피드</h2>
      <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 28 }}>
        팔로우한 작가들의 최신 작품
      </p>

      {photos.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 0',
          color: COLORS.textMuted, fontSize: 15,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>피드가 비어있습니다</div>
          <div style={{ fontSize: 13, marginBottom: 24 }}>작가를 팔로우하면 여기서 새 작품을 볼 수 있습니다.</div>
          <button
            onClick={() => navigate('/explore')}
            style={{
              padding: '10px 24px', background: COLORS.primary, color: '#fff',
              border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14,
            }}
          >
            작가 탐색하기
          </button>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 20,
          }}>
            {photos.map(photo => (
              <FeedCard key={photo.id} photo={photo} onClick={id => navigate(`/photo/${id}`)} />
            ))}
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  padding: '10px 32px', borderRadius: 10,
                  border: `1.5px solid ${COLORS.border}`,
                  background: COLORS.surface, color: COLORS.textSecondary,
                  fontWeight: 600, cursor: loadingMore ? 'not-allowed' : 'pointer',
                  fontSize: 14, opacity: loadingMore ? 0.6 : 1,
                }}
              >
                {loadingMore ? '로딩 중...' : '더 보기'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
