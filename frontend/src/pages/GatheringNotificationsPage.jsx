import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { mq } from '../constants/breakpoints';
import { gatheringApi } from '../services/gatheringApi';
import DotEmptyState from '../components/common/DotEmptyState';

/* ── 알림 타입 아이콘 맵핑 ─────────────────────────────── */
const TYPE_META = {
  PARTICIPATION_CONFIRMED: { icon: '👥', label: '참여 확정' },
  RECRUITMENT_CLOSED:      { icon: '🔒', label: '모집 마감' },
  GATHERING_STARTED:       { icon: '🎬', label: '모임 시작' },
  NEW_POST:                { icon: '📸', label: '새 게시물' },
  NEW_COMMENT:             { icon: '💬', label: '새 댓글' },
  NEW_LIKE:                { icon: '♥',  label: '좋아요' },
  GATHERING_ENDED:         { icon: '🏁', label: '모임 종료' },
};

/* ── Shimmer Skeleton ─────────────────────────────────── */
const shimmerKeyframes = `@keyframes notif-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
const shimmerStyle = {
  background: 'linear-gradient(90deg, #ededf4 25%, #f5f5fa 50%, #ededf4 75%)',
  backgroundSize: '200% 100%',
  animation: 'notif-shimmer 1.4s ease-in-out infinite',
  borderRadius: 8,
};

function SkeletonNotifRow() {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '16px 20px',
      borderBottom: `1px solid ${COLORS.borderLight}`,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, ...shimmerStyle }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 14, width: '75%', ...shimmerStyle }} />
        <div style={{ height: 12, width: '40%', ...shimmerStyle }} />
      </div>
    </div>
  );
}

/* ── 날짜 상대 표시 ─────────────────────────────────────── */
function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

/* ── NotifRow ─────────────────────────────────────────── */
function NotifRow({ notif, onRead, index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const meta = TYPE_META[notif.type] || { icon: '🔔', label: '알림' };
  const unread = !notif.isRead;

  return (
    <div
      onClick={() => onRead(notif)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '16px 20px',
        background: hovered
          ? COLORS.surfaceDim
          : unread ? COLORS.primaryLight : COLORS.surface,
        borderBottom: `1px solid ${COLORS.borderLight}`,
        cursor: 'pointer',
        transition: 'background 0.12s ease',
        /* unread left accent border */
        borderLeft: unread ? `3px solid ${COLORS.primary}` : '3px solid transparent',
        paddingLeft: unread ? 17 : 20,
        animation: 'fadeInUp 0.3s ease-out both',
        animationDelay: `${Math.min(index, 8) * 40}ms`,
      }}
    >
      {/* 아이콘 */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: unread ? COLORS.primaryTonal : COLORS.surfaceDim,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17,
      }}>
        {meta.icon}
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: '0 0 4px',
          fontSize: 14,
          fontWeight: unread ? 700 : 400,
          color: COLORS.text,
          lineHeight: 1.45,
        }}>
          {notif.message}
        </p>
        <span style={{
          fontSize: 12,
          color: COLORS.textMuted,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            padding: '1px 6px', borderRadius: 99, fontSize: 11,
            background: COLORS.surfaceDim, color: COLORS.textSecondary,
            fontWeight: 600,
          }}>
            {meta.label}
          </span>
          {relativeTime(notif.createdAt)}
        </span>
      </div>

      {/* 읽지 않음 닷 */}
      {unread && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: COLORS.primary, flexShrink: 0, marginTop: 4,
        }} />
      )}
    </div>
  );
}

/* ── GatheringNotificationsPage ──────────────────────── */
export default function GatheringNotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadPage = useCallback(async (pageNum = 0) => {
    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      const res = await gatheringApi.getNotifications({ page: pageNum, size: 20 });
      const items = res.content || (Array.isArray(res) ? res : []);
      const tp = res.totalPages ?? 1;

      setNotifications(prev => pageNum === 0 ? items : [...prev, ...items]);
      setTotalPages(tp);
      setPage(pageNum);
    } catch {
      // silent — no crash on load failure
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPage(0);
  }, [loadPage]);

  const handleRead = useCallback(async (notif) => {
    if (!notif.isRead) {
      // optimistic update
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
      );
      gatheringApi.markNotificationRead(notif.id).catch(() => {
        // rollback on failure
        setNotifications(prev =>
          prev.map(n => n.id === notif.id ? { ...n, isRead: false } : n)
        );
      });
    }
    navigate(`/gatherings/${notif.gatheringId}`);
  }, [navigate]);

  const handleMarkAll = useCallback(async () => {
    if (markingAll) return;
    setMarkingAll(true);
    // optimistic — mark all read locally
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await gatheringApi.markAllNotificationsRead();
    } catch {
      // if server fails, rollback is too complex — just keep optimistic state
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll]);

  const hasUnread = notifications.some(n => !n.isRead);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
      <style>{shimmerKeyframes}{`
        .notif-list { max-width: 680px; margin: 0 auto; }
        ${mq.mobile} { .notif-list { max-width: 100%; } }
      `}</style>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px 0' }}>

        {/* 페이지 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, gap: 12,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.text }}>
              모임 알림
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: COLORS.textMuted }}>
              사진 모임 관련 알림을 확인하세요
            </p>
          </div>

          {hasUnread && (
            <MarkAllButton onClick={handleMarkAll} loading={markingAll} />
          )}
        </div>

        {/* 알림 목록 카드 */}
        <div style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          {loading ? (
            <>
              {[0, 1, 2, 3, 4].map(i => <SkeletonNotifRow key={i} />)}
            </>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '20px 0 8px' }}>
              <DotEmptyState
                theme="light"
                icon="🔔"
                title="새 알림이 없습니다"
                description="모임 참여, 게시물, 댓글 등의 알림이 여기에 표시됩니다"
              />
            </div>
          ) : (
            <>
              {notifications.map((notif, i) => (
                <NotifRow key={notif.id} notif={notif} onRead={handleRead} index={i} />
              ))}

              {page + 1 < totalPages && (
                <div style={{
                  padding: '16px 20px',
                  display: 'flex', justifyContent: 'center',
                  borderTop: `1px solid ${COLORS.borderLight}`,
                }}>
                  <LoadMoreButton
                    onClick={() => loadPage(page + 1)}
                    loading={loadingMore}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Buttons ─────────────────────────────────────────── */
function MarkAllButton({ onClick, loading }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 10, flexShrink: 0,
        background: hovered ? COLORS.surfaceDim : COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.textSecondary,
        fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'all 0.12s ease',
      }}
    >
      ✓ 모두 읽음
    </button>
  );
}

function LoadMoreButton({ onClick, loading }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '9px 24px', borderRadius: 10,
        background: hovered ? COLORS.surfaceDim : COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.textSecondary,
        fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'all 0.12s ease',
      }}
    >
      {loading ? '불러오는 중...' : '더 보기'}
    </button>
  );
}
