import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { mq } from '../constants/breakpoints';
import gatheringApi from '../services/gatheringApi';
import useAuthStore from '../store/authStore';
import DotEmptyState from '../components/common/DotEmptyState';

/* ── 상태 레이블·색상 ───────────────────────────────────── */
const STATUS_META = {
  RECRUITING:          { label: '모집중',    bg: COLORS.primaryLight, color: COLORS.primary },
  RECRUITMENT_CLOSED:  { label: '모집마감',  bg: COLORS.surfaceDim,   color: COLORS.textMuted },
  SCHEDULED:           { label: '예정됨',   bg: COLORS.successTonal,  color: COLORS.success },
  ONGOING:             { label: '진행중',    bg: '#FFF6E5',            color: '#B45309' },
  ENDED:               { label: '종료됨',   bg: COLORS.surfaceDim,    color: COLORS.textMuted },
};

/* ── Skeleton ───────────────────────────────────────────── */
const shimmerKeyframes = `@keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
const shimmerStyle = {
  background: 'linear-gradient(90deg, #ededf4 25%, #f5f5fa 50%, #ededf4 75%)',
  backgroundSize: '200% 100%',
  animation: 'sk-shimmer 1.4s ease-in-out infinite',
  borderRadius: 8,
};

function SkeletonGatheringCard() {
  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      <style>{shimmerKeyframes}</style>
      <div style={{ height: 180, ...shimmerStyle, borderRadius: 0 }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 14, width: '70%', ...shimmerStyle }} />
        <div style={{ height: 12, width: '50%', ...shimmerStyle }} />
        <div style={{ height: 12, width: '40%', ...shimmerStyle }} />
      </div>
    </div>
  );
}

/* ── 날짜 포맷 ─────────────────────────────────────────── */
function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
    + ' '
    + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ── GatheringCard ─────────────────────────────────────── */
function GatheringCard({ gathering, onClick }) {
  const [hovered, setHovered] = useState(false);
  const statusMeta = STATUS_META[gathering.status] || STATUS_META.RECRUITING;
  const isFull = gathering.participantCount >= gathering.maxParticipants;

  return (
    <div
      onClick={() => onClick(gathering.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.15s ease',
      }}
    >
      {/* 썸네일 */}
      <div style={{ position: 'relative', aspectRatio: '4/3', background: COLORS.surfaceDim, overflow: 'hidden' }}>
        {gathering.thumbnailUrl ? (
          <img
            src={gathering.thumbnailUrl}
            alt={gathering.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, color: COLORS.textHint,
          }}>
            📷
          </div>
        )}
        {/* 상태 배지 */}
        <span style={{
          position: 'absolute', top: 10, left: 10,
          padding: '3px 8px', borderRadius: 99,
          background: statusMeta.bg, color: statusMeta.color,
          fontSize: 11, fontWeight: 700,
        }}>
          {statusMeta.label}
        </span>
        {isFull && gathering.status === 'RECRUITING' && (
          <span style={{
            position: 'absolute', top: 10, right: 10,
            padding: '3px 8px', borderRadius: 99,
            background: COLORS.dangerTonal, color: COLORS.danger,
            fontSize: 11, fontWeight: 700,
          }}>
            마감임박
          </span>
        )}
      </div>

      {/* 정보 */}
      <div style={{ padding: '14px 16px' }}>
        <h3 style={{
          margin: '0 0 8px',
          fontSize: 15, fontWeight: 700, color: COLORS.text,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {gathering.title}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: COLORS.textSecondary }}>
            <span>📅</span>
            <span>{formatDateTime(gathering.startDateTime)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: COLORS.textSecondary }}>
            <span>📍</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {gathering.location}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: COLORS.textSecondary }}>
            <span>👥</span>
            <span style={{ fontWeight: 600 }}>
              {gathering.participantCount}/{gathering.maxParticipants}명 참여
              {gathering.waitingCount > 0 && <span style={{ color: COLORS.textMuted }}> (대기 {gathering.waitingCount}명)</span>}
            </span>
          </div>
        </div>

        {gathering.status === 'RECRUITING' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 10, borderTop: `1px solid ${COLORS.borderLight}`,
          }}>
            <span style={{ fontSize: 11, color: COLORS.textMuted }}>
              모집 마감 {formatDate(gathering.recruitmentEndDateTime)}
            </span>
            <span style={{ fontSize: 12, color: COLORS.primary, fontWeight: 700 }}>
              자세히 보기 →
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 내 모임 컴팩트 행 ─────────────────────────────────── */
function MyGatheringRow({ gathering, onClick }) {
  const [hovered, setHovered] = useState(false);
  const statusMeta = STATUS_META[gathering.status] || STATUS_META.RECRUITING;

  return (
    <div
      onClick={() => onClick(gathering.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 16px',
        background: hovered ? COLORS.surfaceDim : COLORS.surface,
        border: `1px solid ${hovered ? COLORS.textHint : COLORS.border}`,
        borderRadius: 12, cursor: 'pointer',
        transition: 'all 0.12s ease',
      }}
    >
      {/* 썸네일 미니 */}
      <div style={{
        width: 48, height: 48, borderRadius: 10, flexShrink: 0,
        background: COLORS.surfaceDim, overflow: 'hidden',
      }}>
        {gathering.thumbnailUrl ? (
          <img
            src={gathering.thumbnailUrl}
            alt={gathering.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📷</div>
        )}
      </div>

      {/* 정보 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {gathering.title}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
          {formatDate(gathering.startDateTime)} · {gathering.location}
        </div>
      </div>

      {/* 상태 */}
      <span style={{
        padding: '3px 8px', borderRadius: 99, flexShrink: 0,
        background: statusMeta.bg, color: statusMeta.color,
        fontSize: 11, fontWeight: 700,
      }}>
        {statusMeta.label}
      </span>
    </div>
  );
}

/* ── GatheringsPage ─────────────────────────────────────── */
export default function GatheringsPage() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const [gatherings, setGatherings] = useState([]);
  const [myGatherings, setMyGatherings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadGatherings = useCallback(async (pageNum = 0) => {
    try {
      setLoading(true);
      const res = await gatheringApi.list({ status: 'RECRUITING', page: pageNum, size: 12 });
      // Spring Page object
      const items = res.content || res.data?.content || (Array.isArray(res) ? res : []);
      const tp = res.totalPages || res.data?.totalPages || 1;
      setGatherings(pageNum === 0 ? items : prev => [...prev, ...items]);
      setTotalPages(tp);
      setPage(pageNum);
    } catch {
      setError('모임 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGatherings(0);
  }, [loadGatherings]);

  useEffect(() => {
    if (!user?.id) return;
    setMyLoading(true);
    gatheringApi.getMy()
      .then(data => setMyGatherings(Array.isArray(data) ? data : data?.data || []))
      .catch(() => {})
      .finally(() => setMyLoading(false));
  }, [user?.id]);

  const handleCardClick = (id) => navigate(`/gatherings/${id}`);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
      <style>{shimmerKeyframes}{`
        .gathering-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        ${mq.upToTablet} {
          .gathering-grid { grid-template-columns: repeat(2, 1fr); }
        }
        ${mq.mobile} {
          .gathering-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 20px' }}>

        {/* 페이지 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 28, gap: 12,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.text }}>
              사진 모임
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: COLORS.textMuted }}>
              사진작가·모델이 함께하는 촬영 모임에 참여해보세요
            </p>
          </div>
          {user && (
            <NewButton onClick={() => navigate('/gatherings/new')} />
          )}
        </div>

        {/* 에러 */}
        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: COLORS.dangerTonal, color: COLORS.danger,
            fontSize: 14, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* 모집중인 모임 */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: COLORS.text, margin: '0 0 16px' }}>
            모집중인 모임
          </h2>

          {loading ? (
            <div className="gathering-grid">
              {[0, 1, 2].map(i => <SkeletonGatheringCard key={i} />)}
            </div>
          ) : gatherings.length === 0 ? (
            <DotEmptyState
              theme="light"
              icon="📷"
              title="모집중인 모임이 없습니다"
              description="아직 진행 중인 모임이 없어요. 직접 모임을 만들어보세요!"
              actionLabel={user ? "+ 모임 만들기" : undefined}
              onAction={user ? () => navigate('/gatherings/new') : undefined}
            />
          ) : (
            <>
              <div className="gathering-grid">
                {gatherings.map(g => (
                  <GatheringCard key={g.id} gathering={g} onClick={handleCardClick} />
                ))}
              </div>
              {page + 1 < totalPages && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <LoadMoreButton onClick={() => loadGatherings(page + 1)} />
                </div>
              )}
            </>
          )}
        </section>

        {/* 내 모임 */}
        {user && (
          <section>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: COLORS.text, margin: '0 0 16px' }}>
              내 모임
            </h2>

            {myLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ height: 72, ...shimmerStyle, borderRadius: 12 }} />
                ))}
              </div>
            ) : myGatherings.length === 0 ? (
              <div style={{
                padding: '32px 20px', textAlign: 'center',
                border: `1px dashed ${COLORS.border}`, borderRadius: 12,
                color: COLORS.textMuted, fontSize: 14,
              }}>
                참여 중인 모임이 없습니다
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myGatherings.map(g => (
                  <MyGatheringRow key={g.id} gathering={g} onClick={handleCardClick} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function NewButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '9px 18px', borderRadius: 10,
        background: hovered ? COLORS.primaryDark : COLORS.primary,
        color: '#fff', border: 'none', cursor: 'pointer',
        fontSize: 14, fontWeight: 700,
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hovered ? '0 4px 12px rgba(49,130,246,0.25)' : '0 2px 6px rgba(49,130,246,0.15)',
        transition: 'all 0.15s ease',
        flexShrink: 0,
      }}
    >
      + 모임 만들기
    </button>
  );
}

function LoadMoreButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 28px', borderRadius: 10,
        background: hovered ? COLORS.surfaceDim : COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.textSecondary, cursor: 'pointer',
        fontSize: 14, fontWeight: 600,
        transition: 'all 0.12s ease',
      }}
    >
      더 보기
    </button>
  );
}
