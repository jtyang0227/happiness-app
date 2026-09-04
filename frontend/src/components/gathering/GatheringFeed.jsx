import React, { useState, useEffect, useCallback } from 'react';
import { COLORS } from '../../constants/colors';
import gatheringApi from '../../services/gatheringApi';
import GatheringPostComposerModal from './GatheringPostComposerModal';
import DotEmptyState from '../common/DotEmptyState';

/* ── Shimmer 애니메이션 ─────────────────────────────────── */
const SHIMMER_KF = `@keyframes sk-shimmer-gf {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`;
const shimmerBase = {
  background: 'linear-gradient(90deg, #ededf4 25%, #f5f5fa 50%, #ededf4 75%)',
  backgroundSize: '200% 100%',
  animation: 'sk-shimmer-gf 1.4s ease-in-out infinite',
  borderRadius: 8,
};

/* ── 상대 시간 포맷 ────────────────────────────────────── */
function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

/* ── 아바타 ────────────────────────────────────────────── */
function Avatar({ name, avatarUrl, size = 36 }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0, display: 'block',
        }}
        onError={e => { e.target.style.display = 'none'; }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: COLORS.primaryLight,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 700, color: COLORS.primary,
    }}>
      {initial}
    </div>
  );
}

/* ── 스켈레톤 포스트 ────────────────────────────────────── */
function SkeletonPost() {
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 16, overflow: 'hidden', marginBottom: 12,
    }}>
      <div style={{ padding: 16 }}>
        {/* author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', ...shimmerBase }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: '40%', height: 12, marginBottom: 6, ...shimmerBase }} />
            <div style={{ width: '22%', height: 10, ...shimmerBase }} />
          </div>
        </div>
        {/* text lines */}
        <div style={{ height: 12, width: '90%', marginBottom: 6, ...shimmerBase }} />
        <div style={{ height: 12, width: '70%', marginBottom: 14, ...shimmerBase }} />
        {/* photo placeholder */}
        <div style={{ height: 220, ...shimmerBase, borderRadius: 10 }} />
      </div>
      {/* action bar placeholder */}
      <div style={{ height: 40, borderTop: `1px solid ${COLORS.borderLight}`, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 40, height: 10, ...shimmerBase }} />
        <div style={{ width: 40, height: 10, ...shimmerBase }} />
      </div>
    </div>
  );
}

/* ── 포스트 카드 ─────────────────────────────────────────── */
function PostCard({ post, currentUserId, isParticipating, onDelete, index = 0 }) {
  const [liked, setLiked] = useState(post.likedByMe || false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isMyPost = currentUserId && post.memberId === currentUserId;
  const sortedPhotos = (post.photos || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  async function handleLike() {
    if (!isParticipating || likeLoading) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => wasLiked ? Math.max(0, c - 1) : c + 1);
    setLikeLoading(true);
    try {
      if (wasLiked) {
        await gatheringApi.unlikePost(post.id);
      } else {
        await gatheringApi.likePost(post.id);
      }
    } catch {
      // revert optimistic update
      setLiked(wasLiked);
      setLikeCount(c => wasLiked ? c + 1 : Math.max(0, c - 1));
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || commentLoading) return;
    const text = newComment.trim();
    setCommentLoading(true);
    try {
      const res = await gatheringApi.addComment(post.id, text);
      // unwrap ApiResponse or use returned data
      const added = res?.data || res || {
        id: Date.now(),
        memberId: currentUserId,
        memberName: '나',
        memberAvatarUrl: null,
        content: text,
        createdAt: new Date().toISOString(),
      };
      setComments(prev => [...prev, added]);
      setNewComment('');
    } catch {
      // silent — comment not added
    } finally {
      setCommentLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await gatheringApi.deletePost(post.id);
      onDelete(post.id);
    } catch {
      setDeleting(false);
      setShowDeleteMenu(false);
    }
  }

  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 16, overflow: 'hidden', marginBottom: 12,
      animation: 'fadeInUp 0.3s ease-out both',
      animationDelay: `${Math.min(index, 8) * 40}ms`,
    }}>
      {/* ── 헤더: 아바타 + 이름 + 시간 + 삭제 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 0' }}>
        <Avatar name={post.memberName} avatarUrl={post.memberAvatarUrl} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, lineHeight: 1.3 }}>
            {post.memberName}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>
            {relativeTime(post.createdAt)}
          </div>
        </div>
        {isMyPost && !showDeleteMenu && (
          <button
            onClick={() => setShowDeleteMenu(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, color: COLORS.textHint, padding: '0 4px', lineHeight: 1,
            }}
            aria-label="더보기"
          >
            ···
          </button>
        )}
        {isMyPost && showDeleteMenu && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setShowDeleteMenu(false)}
              style={{
                padding: '4px 10px', borderRadius: 7,
                border: `1px solid ${COLORS.border}`, background: COLORS.surface,
                cursor: 'pointer', fontSize: 12, color: COLORS.textSecondary,
              }}
            >
              취소
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '4px 12px', borderRadius: 7,
                border: 'none', background: COLORS.danger,
                cursor: deleting ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 700, color: '#fff',
              }}
            >
              {deleting ? '...' : '삭제'}
            </button>
          </div>
        )}
      </div>

      {/* ── 게시글 텍스트 ────────────────────────── */}
      {post.content && (
        <div style={{
          padding: '10px 16px',
          fontSize: 14, color: COLORS.text, lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
        }}>
          {post.content}
        </div>
      )}
      {post.hashtags && (
        <div style={{ padding: '2px 16px 8px', fontSize: 13, color: COLORS.primary }}>
          {post.hashtags}
        </div>
      )}

      {/* ── 사진 ─────────────────────────────────── */}
      {sortedPhotos.length === 1 && (
        <div style={{ marginTop: post.content || post.hashtags ? 0 : 10 }}>
          <div style={{ background: COLORS.surfaceDim }}>
            <img
              src={sortedPhotos[0].imageUrl}
              alt={sortedPhotos[0].caption || ''}
              style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }}
            />
          </div>
          {sortedPhotos[0].caption && (
            <div style={{
              padding: '6px 16px',
              fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic',
            }}>
              {sortedPhotos[0].caption}
            </div>
          )}
        </div>
      )}
      {sortedPhotos.length > 1 && (
        <div style={{
          overflowX: 'auto', display: 'flex', gap: 6,
          padding: '8px 16px 4px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {sortedPhotos.map((photo, pi) => (
            <div key={photo.id ?? pi} style={{ flexShrink: 0, width: 180 }}>
              <div style={{
                height: 140, background: COLORS.surfaceDim,
                borderRadius: 8, overflow: 'hidden',
              }}>
                <img
                  src={photo.imageUrl}
                  alt={photo.caption || ''}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              {photo.caption && (
                <div style={{
                  fontSize: 11, color: COLORS.textMuted,
                  marginTop: 3, fontStyle: 'italic',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 액션 바: 좋아요 + 댓글 ───────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 18,
        padding: '10px 16px',
        borderTop: `1px solid ${COLORS.borderLight}`,
        marginTop: sortedPhotos.length > 0 ? 8 : 0,
      }}>
        <button
          onClick={handleLike}
          style={{
            background: 'none', border: 'none',
            cursor: isParticipating ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 14, padding: 0,
            color: liked ? COLORS.danger : COLORS.textMuted,
            fontWeight: liked ? 700 : 400,
            opacity: isParticipating ? 1 : 0.55,
            transition: 'color 0.12s',
          }}
          aria-label="좋아요"
        >
          <span style={{
            display: 'inline-block',
            transform: liked ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.15s ease-out',
          }}>
            {liked ? '♥' : '♡'}
          </span>
          {' '}{likeCount}
        </button>
        <button
          onClick={() => setShowComments(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 14, color: COLORS.textMuted, padding: 0,
          }}
          aria-label="댓글"
        >
          💬 {comments.length}
        </button>
      </div>

      {/* ── 댓글 목록 + 입력 ─────────────────────── */}
      {showComments && (
        <div style={{
          borderTop: `1px solid ${COLORS.borderLight}`,
          padding: '12px 16px',
        }}>
          {comments.length > 0 ? (
            <div style={{ marginBottom: 12 }}>
              {comments.map((c, ci) => (
                <div key={c.id ?? ci} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <Avatar name={c.memberName} avatarUrl={c.memberAvatarUrl} size={28} />
                  <div style={{
                    flex: 1, background: COLORS.surfaceDim,
                    borderRadius: 10, padding: '7px 10px',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>
                      {c.memberName}
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.5 }}>
                      {c.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 10, textAlign: 'center' }}>
              아직 댓글이 없습니다
            </div>
          )}

          {/* 댓글 입력 — 참여자만 */}
          {isParticipating && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="댓글을 입력하세요..."
                style={{
                  flex: 1, padding: '8px 12px',
                  border: `1px solid ${COLORS.border}`, borderRadius: 20,
                  fontSize: 13, color: COLORS.text, background: COLORS.surface,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || commentLoading}
                style={{
                  padding: '8px 14px', borderRadius: 20,
                  background: !newComment.trim() || commentLoading ? COLORS.surfaceDim : COLORS.primary,
                  border: 'none',
                  cursor: !newComment.trim() || commentLoading ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 700,
                  color: !newComment.trim() || commentLoading ? COLORS.textMuted : '#fff',
                  flexShrink: 0, transition: 'all 0.12s',
                }}
              >
                게시
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 더 보기 버튼 ───────────────────────────────────────── */
function LoadMoreButton({ onClick, loading }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block', width: '100%',
        padding: '11px',
        background: hovered ? COLORS.surfaceDim : COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10, cursor: loading ? 'default' : 'pointer',
        fontSize: 13, fontWeight: 600, color: COLORS.textSecondary,
        transition: 'background 0.12s',
        marginTop: 4,
      }}
    >
      {loading ? '불러오는 중...' : '더 보기'}
    </button>
  );
}

/* ── GatheringFeed ─────────────────────────────────────── */
/**
 * Props:
 *   gatheringId   {string|number}  모임 ID
 *   status        {string}         ONGOING | ENDED
 *   isParticipating {boolean}      로컬 세션 상태 기반 (myStatus === 'PARTICIPATING')
 *   currentUser   {object|null}    로그인 유저 (authStore)
 */
export default function GatheringFeed({ gatheringId, status, isParticipating, currentUser }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [showComposer, setShowComposer] = useState(false);

  const isOngoing = status === 'ONGOING';

  const loadPosts = useCallback(async (pageNum = 0) => {
    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      const res = await gatheringApi.getPosts(gatheringId, { page: pageNum, size: 10 });
      // Unwrap Spring Page (may be wrapped in ApiResponse)
      const pageData = res?.data ?? res;
      const items = pageData?.content ?? (Array.isArray(pageData) ? pageData : []);
      const total = pageData?.totalPages ?? 1;

      setPosts(prev => (pageNum === 0 ? items : [...prev, ...items]));
      setHasMore(pageNum + 1 < total);
      setPage(pageNum);
    } catch (err) {
      if (err?.response?.status === 400) {
        setError('피드를 불러올 수 없습니다. (모임 상태 오류)');
      } else {
        setError('피드를 불러오지 못했습니다.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [gatheringId]);

  useEffect(() => {
    loadPosts(0);
  }, [loadPosts]);

  function handlePostDeleted(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  function handlePostCreated() {
    setShowComposer(false);
    loadPosts(0); // 최신 피드로 갱신
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <style>{SHIMMER_KF}</style>

      {/* ── 섹션 헤더 ─────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLORS.text }}>
          {isOngoing ? '📸 모임 피드' : '📷 모임 사진'}
        </h2>
        <span style={{ fontSize: 12, color: COLORS.textMuted }}>
          {isOngoing ? '진행 중' : '종료됨'}
        </span>
      </div>

      {/* ── 포스트 작성 진입 (ONGOING + 참여자) ── */}
      {isOngoing && isParticipating && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowComposer(true)}
              style={{
                flex: 1, padding: '11px',
                background: COLORS.primary, border: 'none', borderRadius: 10,
                cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff',
                transition: 'background 0.12s',
              }}
            >
              📷 사진 올리기
            </button>
            <button
              onClick={() => setShowComposer(true)}
              style={{
                flex: 1, padding: '11px',
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`, borderRadius: 10,
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                color: COLORS.textSecondary,
                transition: 'background 0.12s',
              }}
            >
              ✏️ 글 작성
            </button>
          </div>
        </div>
      )}

      {/* ── 비참여자 안내 (ONGOING) ───────────── */}
      {isOngoing && !isParticipating && currentUser && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 14,
          background: COLORS.surfaceDim, border: `1px solid ${COLORS.border}`,
          fontSize: 13, color: COLORS.textMuted,
        }}>
          모임에 참여한 멤버만 사진을 올리고 좋아요를 누를 수 있습니다
        </div>
      )}

      {/* ── 로딩 스켈레톤 ─────────────────────── */}
      {loading ? (
        <>
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
        </>
      ) : error ? (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: COLORS.dangerTonal, color: COLORS.danger,
          fontSize: 13, marginBottom: 12,
        }}>
          {error}
        </div>
      ) : posts.length === 0 ? (
        <DotEmptyState
          theme="light"
          icon="📸"
          title="아직 게시된 사진이 없어요"
          description={
            isOngoing && isParticipating
              ? "첫 번째 사진을 올려보세요!"
              : "모임 참여자들이 사진을 올리면 여기에 표시됩니다."
          }
        />
      ) : (
        <>
          {posts.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              index={i}
              currentUserId={currentUser?.id}
              isParticipating={isParticipating}
              onDelete={handlePostDeleted}
            />
          ))}
          {hasMore && (
            <LoadMoreButton onClick={() => loadPosts(page + 1)} loading={loadingMore} />
          )}
        </>
      )}

      {/* ── 포스트 작성 모달 ──────────────────── */}
      {showComposer && (
        <GatheringPostComposerModal
          gatheringId={gatheringId}
          onClose={() => setShowComposer(false)}
          onSuccess={handlePostCreated}
        />
      )}
    </div>
  );
}
