import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { photoApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, MOOD_COLORS } from '../constants/colors';
import { GLASS, GLASS_KEYFRAMES } from '../constants/glass';
import EmptyState from '../components/common/EmptyState';
import { SkeletonFeedCard } from '../components/common/Skeleton';

function FeedCard({ photo, onClick }) {
  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];
  const authorName = photo.memberName || photo.member?.name || '익명';
  const authorAvatar = photo.memberAvatarUrl || photo.member?.avatarUrl;

  function relativeTime(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return '방금';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}일 전`;
    return new Date(dateStr).toLocaleDateString('ko-KR');
  }

  return (
    <div
      style={{
        background: GLASS.light.surface,
        backdropFilter: GLASS.light.blur,
        WebkitBackdropFilter: GLASS.light.blur,
        borderRadius: 20,
        overflow: 'hidden',
        border: `1px solid ${GLASS.light.border}`,
        boxShadow: GLASS.light.shadow,
        transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease',
        animation: 'glassIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
        e.currentTarget.style.boxShadow = GLASS.light.shadowStrong;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = GLASS.light.shadow;
      }}
    >
      {/* 작가 헤더 */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: authorAvatar ? 'transparent' : `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden',
        }}>
          {authorAvatar
            ? <img src={authorAvatar} alt={authorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : authorName.charAt(0).toUpperCase()
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{authorName}</div>
          {mood && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: COLORS.textMuted }}>{mood.label}</span>
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, color: COLORS.textMuted }}>{relativeTime(photo.createdAt)}</span>
      </div>

      {/* 이미지 */}
      <div
        onClick={() => onClick(photo.id)}
        style={{ position: 'relative', aspectRatio: '4/3', background: '#0e0e0e', overflow: 'hidden', cursor: 'pointer' }}
      >
        <img
          src={photo.thumbnailUrl || photo.imageUrl}
          alt={photo.title || '사진'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>

      {/* 하단 액션 바 */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 13, color: COLORS.textMuted }}>♡</span>
        <span style={{ fontSize: 12, color: COLORS.textSecondary, marginRight: 8 }}>{photo.likesCount ?? 0}</span>
        <span style={{ fontSize: 13, color: COLORS.textMuted }}>🔖</span>
        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{photo.savesCount ?? 0}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: COLORS.text, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {photo.title || ''}
        </span>
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f0f2ff 0%, #f5f0ff 40%, #eff7ff 100%)',
    }}>
    <style>{GLASS_KEYFRAMES}</style>
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 20px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>📰 피드</h2>
          <p style={{ fontSize: 13, color: COLORS.textMuted }}>팔로우한 작가들의 최신 작품</p>
        </div>
        {!loading && photos.length === 0 && (
          <button onClick={() => navigate('/explore')} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            border: `1px solid ${GLASS.light.border}`,
            background: GLASS.light.surface,
            backdropFilter: GLASS.light.blur,
            WebkitBackdropFilter: GLASS.light.blur,
            color: COLORS.textSecondary, cursor: 'pointer',
          }}>
            탐색하기
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonFeedCard key={i} />)}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState
          icon="📸"
          title="피드가 비어 있습니다"
          description="마음에 드는 작가를 팔로우하면 여기에 최신 사진이 나타납니다."
          actionLabel="작가 탐색하기"
          onAction={() => navigate('/explore')}
        />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                  padding: '10px 32px', borderRadius: 24,
                  border: `1px solid ${GLASS.light.border}`,
                  background: GLASS.light.surface,
                  backdropFilter: GLASS.light.blur,
                  WebkitBackdropFilter: GLASS.light.blur,
                  color: COLORS.textSecondary,
                  fontWeight: 600, cursor: loadingMore ? 'not-allowed' : 'pointer',
                  fontSize: 14, opacity: loadingMore ? 0.6 : 1,
                  boxShadow: GLASS.light.shadow,
                }}
              >
                {loadingMore ? '로딩 중...' : '더 보기'}
              </button>
            </div>
          )}
          {!hasMore && photos.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: COLORS.textMuted }}>
              모든 게시물을 확인했습니다 ✓
            </div>
          )}
        </>
      )}
    </div>
    </div>
  );
}
