import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { mq } from '../constants/breakpoints';
import gatheringApi from '../services/gatheringApi';
import DotEmptyState from '../components/common/DotEmptyState';

/* ── Shimmer ────────────────────────────────────────────── */
const SHIMMER_KF = `@keyframes sk-shimmer-ga {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`;
const shimmerBase = {
  background: 'linear-gradient(90deg, #ededf4 25%, #f5f5fa 50%, #ededf4 75%)',
  backgroundSize: '200% 100%',
  animation: 'sk-shimmer-ga 1.4s ease-in-out infinite',
  borderRadius: 8,
};

/* ── 스켈레톤 헤더 카드 ─────────────────────────────────── */
function SkeletonHeader() {
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 16, padding: 20, marginBottom: 24,
    }}>
      <div style={{ width: '60%', height: 24, marginBottom: 12, ...shimmerBase }} />
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ width: 80, height: 14, ...shimmerBase }} />
        ))}
      </div>
    </div>
  );
}

/* ── 스켈레톤 그리드 ────────────────────────────────────── */
function SkeletonGrid() {
  return (
    <div className="album-grid">
      {Array(9).fill(0).map((_, i) => (
        <div key={i} style={{ aspectRatio: '1', ...shimmerBase }} />
      ))}
    </div>
  );
}

/* ── 날짜 포맷 ─────────────────────────────────────────── */
function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/* ── 통계 아이템 ─────────────────────────────────────────  */
function StatItem({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
        {label} <strong style={{ color: COLORS.text }}>{value}</strong>
      </span>
    </div>
  );
}

/* ── 사진 카드 (라이트박스 없이 단순 클릭 가능) ─────────── */
function AlbumPhoto({ photo }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        aspectRatio: '1',
        borderRadius: 10, overflow: 'hidden',
        background: COLORS.surfaceDim,
        cursor: 'pointer',
        transform: hovered ? 'scale(1.01)' : 'scale(1)',
        boxShadow: hovered
          ? '0 4px 18px rgba(0,0,0,0.12)'
          : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.15s ease',
      }}
    >
      <img
        src={photo.imageUrl}
        alt={photo.caption || '모임 사진'}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover', display: 'block',
        }}
        loading="lazy"
      />
      {/* 캡션 오버레이 (hover 시) */}
      {photo.caption && hovered && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '24px 10px 10px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
          color: '#fff', fontSize: 11, lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {photo.caption}
        </div>
      )}
      {/* 날짜 배지 (hover 시) */}
      {photo.createdAt && hovered && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          padding: '2px 7px', borderRadius: 99,
          background: 'rgba(0,0,0,0.55)', color: '#fff',
          fontSize: 10, fontWeight: 600,
        }}>
          {formatDate(photo.createdAt)}
        </div>
      )}
    </div>
  );
}

/* ── GatheringAlbumPage ─────────────────────────────────── */
export default function GatheringAlbumPage() {
  const { id } = useParams();

  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAlbum = useCallback(() => {
    setLoading(true);
    setError('');
    gatheringApi.getAlbum(id)
      .then(data => setAlbum(data?.data ?? data))
      .catch(err => {
        if (err?.response?.status === 400) {
          setError('앨범은 모임이 종료된 후에 볼 수 있습니다.');
        } else if (err?.response?.status === 404) {
          setError('모임을 찾을 수 없습니다.');
        } else {
          setError('앨범을 불러오지 못했습니다.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadAlbum(); }, [loadAlbum]);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
      <style>{SHIMMER_KF}{`
        .album-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        ${mq.upToTablet} {
          .album-grid { grid-template-columns: repeat(2, 1fr); }
        }
        ${mq.mobile} {
          .album-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; }
        }
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px' }}>

        {/* ── 뒤로가기 / 내비 ──────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link
            to={`/gatherings/${id}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 9,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface, color: COLORS.textSecondary,
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}
          >
            ← 모임 피드
          </Link>
          <Link
            to="/gatherings"
            style={{
              fontSize: 13, color: COLORS.textMuted, textDecoration: 'none',
            }}
          >
            모임 목록
          </Link>
        </div>

        {/* ── 로딩 ────────────────────────────── */}
        {loading && (
          <>
            <SkeletonHeader />
            <SkeletonGrid />
          </>
        )}

        {/* ── 에러 ────────────────────────────── */}
        {!loading && error && (
          <div style={{
            padding: '20px', borderRadius: 12, textAlign: 'center',
            background: COLORS.dangerTonal, color: COLORS.danger, fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* ── 앨범 콘텐츠 ─────────────────────── */}
        {!loading && !error && album && (
          <>
            {/* 헤더 카드 */}
            <div style={{
              background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 16, padding: '20px 24px', marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, letterSpacing: '0.06em', marginBottom: 6 }}>
                    모임 앨범
                  </div>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text, lineHeight: 1.35 }}>
                    {album.title || '모임 사진 모음'}
                  </h1>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 99, flexShrink: 0,
                  background: COLORS.surfaceDim, border: `1px solid ${COLORS.border}`,
                  fontSize: 11, fontWeight: 700, color: COLORS.textMuted,
                }}>
                  종료됨
                </div>
              </div>

              {/* 통계 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <StatItem icon="📷" label="사진" value={`${album.photoCount ?? 0}장`} />
                <StatItem icon="📝" label="게시물" value={`${album.postCount ?? 0}개`} />
                <StatItem icon="👥" label="참여자" value={`${album.participantCount ?? 0}명`} />
              </div>
            </div>

            {/* 사진 없을 때 빈 상태 */}
            {(!album.photos || album.photos.length === 0) ? (
              <DotEmptyState
                theme="light"
                icon="📷"
                title="아직 사진이 없어요"
                description="모임 피드에서 게시된 사진이 없습니다."
              />
            ) : (
              <>
                <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textSecondary }}>
                    총 {album.photos.length}장
                  </div>
                  <Link
                    to={`/gatherings/${id}`}
                    style={{ fontSize: 13, color: COLORS.primary, fontWeight: 600, textDecoration: 'none' }}
                  >
                    피드에서 자세히 보기 →
                  </Link>
                </div>
                <div className="album-grid">
                  {album.photos.map((photo, i) => (
                    <AlbumPhoto key={photo.postId ? `${photo.postId}-${i}` : i} photo={photo} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
