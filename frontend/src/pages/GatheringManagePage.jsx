import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import gatheringApi from '../services/gatheringApi';
import useAuthStore from '../store/authStore';

const shimmerKeyframes = `@keyframes sk-shimmer-m { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
const shimmerStyle = {
  background: 'linear-gradient(90deg, #ededf4 25%, #f5f5fa 50%, #ededf4 75%)',
  backgroundSize: '200% 100%',
  animation: 'sk-shimmer-m 1.4s ease-in-out infinite',
  borderRadius: 8,
};

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

/* ── 참여자 행 ─────────────────────────────────────────── */
function ParticipantRow({ entry, statusLabel, statusColor, statusBg, showReason }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: `1px solid ${COLORS.borderLight}`,
    }}>
      {/* 아바타 placeholder — 서버가 memberId만 반환함 */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: COLORS.primaryLight,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: COLORS.primary,
      }}>
        {String(entry.memberId).slice(-2)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
          회원 #{entry.memberId}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
          {formatDate(entry.joinedAt)}
        </div>
        {/* reason은 생성자 전용 — GatheringManagePage에서만 표시 */}
        {showReason && entry.reason && (
          <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 3, fontStyle: 'italic' }}>
            "{entry.reason}"
          </div>
        )}
      </div>

      <span style={{
        padding: '3px 9px', borderRadius: 99, flexShrink: 0,
        background: statusBg, color: statusColor,
        fontSize: 11, fontWeight: 700,
      }}>
        {statusLabel}
      </span>
    </div>
  );
}

/* ── 섹션 박스 ─────────────────────────────────────────── */
function Section({ title, count, children, emptyText }) {
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 16, overflow: 'hidden', marginBottom: 16,
    }}>
      <div style={{
        padding: '14px 16px',
        borderBottom: count > 0 ? `1px solid ${COLORS.border}` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: COLORS.text }}>
          {title}
        </h3>
        <span style={{
          padding: '2px 8px', borderRadius: 99,
          background: COLORS.surfaceDim, color: COLORS.textMuted,
          fontSize: 12, fontWeight: 700,
        }}>
          {count}명
        </span>
      </div>
      {count === 0 ? (
        <div style={{ padding: '20px 16px', textAlign: 'center', color: COLORS.textMuted, fontSize: 13 }}>
          {emptyText}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/* ── GatheringManagePage ───────────────────────────────── */
export default function GatheringManagePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const [gathering, setGathering] = useState(null);
  const [participants, setParticipants] = useState(null);
  const [loadingGathering, setLoadingGathering] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState('');
  const [closeMsg, setCloseMsg] = useState('');
  const [closingRecruitment, setClosingRecruitment] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const loadGathering = useCallback(() => {
    setLoadingGathering(true);
    gatheringApi.getDetail(id)
      .then(data => setGathering(data.data || data))
      .catch(() => setError('모임 정보를 불러오지 못했습니다.'))
      .finally(() => setLoadingGathering(false));
  }, [id]);

  const loadParticipants = useCallback(() => {
    setLoadingParticipants(true);
    gatheringApi.getParticipants(id)
      .then(data => setParticipants(data.data || data))
      .catch(err => {
        if (err?.response?.status === 403) {
          setAccessDenied(true);
        } else {
          setError('참여자 목록을 불러오지 못했습니다.');
        }
      })
      .finally(() => setLoadingParticipants(false));
  }, [id]);

  useEffect(() => {
    loadGathering();
    loadParticipants();
  }, [loadGathering, loadParticipants]);

  async function handleCloseRecruitment() {
    setClosingRecruitment(true);
    setCloseMsg('');
    try {
      await gatheringApi.closeRecruitment(id);
      setGathering(prev => prev ? { ...prev, status: 'RECRUITMENT_CLOSED' } : prev);
      setCloseMsg('모집이 마감되었습니다.');
      setConfirmClose(false);
    } catch {
      setCloseMsg('모집 마감 중 오류가 발생했습니다.');
    } finally {
      setClosingRecruitment(false);
    }
  }

  /* ── 접근 거부 ──────────────────────────────────────── */
  if (accessDenied) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>접근 권한이 없습니다</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 24 }}>이 페이지는 모임 생성자만 볼 수 있습니다</div>
          <button
            onClick={() => navigate(`/gatherings/${id}`)}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface, cursor: 'pointer',
              fontSize: 14, color: COLORS.textSecondary,
            }}
          >
            상세 페이지로
          </button>
        </div>
      </div>
    );
  }

  const isLoading = loadingGathering || loadingParticipants;

  /* ── 스켈레톤 ───────────────────────────────────────── */
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
        <style>{shimmerKeyframes}</style>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
          <div style={{ height: 28, width: 200, ...shimmerStyle, marginBottom: 24 }} />
          <div style={{ height: 80, ...shimmerStyle, borderRadius: 12, marginBottom: 12 }} />
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: 60, ...shimmerStyle, borderRadius: 10, marginBottom: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ color: COLORS.danger, fontSize: 14 }}>{error}</div>
      </div>
    );
  }

  const isRecruiting = gathering?.status === 'RECRUITING';
  const participating = participants?.participating || [];
  const waiting = participants?.waiting || [];
  const notParticipating = participants?.notParticipating || [];
  const participantCount = participants?.participantCount ?? gathering?.participantCount ?? 0;
  const maxParticipants = participants?.maxParticipants ?? gathering?.maxParticipants ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
      <style>{shimmerKeyframes}</style>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => navigate(`/gatherings/${id}`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: COLORS.textSecondary, padding: 4, lineHeight: 1 }}
            aria-label="뒤로가기"
          >
            ←
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>참여자 관리</h1>
            {gathering && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: COLORS.textMuted }}>
                {gathering.title}
              </p>
            )}
          </div>
        </div>

        {/* 통계 카드 */}
        <div style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 16, padding: '16px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, marginBottom: 2 }}>참여 인원</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text }}>
              {participantCount}<span style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 400 }}>/{maxParticipants}명</span>
            </div>
          </div>
          {waiting.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, marginBottom: 2 }}>대기자</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#B45309' }}>{waiting.length}명</div>
            </div>
          )}
          {/* 모집 마감 버튼 */}
          {isRecruiting && (
            <div style={{ marginLeft: 'auto' }}>
              {confirmClose ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: COLORS.danger }}>정말 마감?</span>
                  <button onClick={() => setConfirmClose(false)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.surface, cursor: 'pointer', fontSize: 12, color: COLORS.textSecondary }}>
                    취소
                  </button>
                  <button
                    onClick={handleCloseRecruitment}
                    disabled={closingRecruitment}
                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: COLORS.danger, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#fff' }}
                  >
                    {closingRecruitment ? '처리 중...' : '마감'}
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmClose(true)} style={{
                  padding: '9px 16px', borderRadius: 10,
                  background: COLORS.dangerTonal, border: `1px solid ${COLORS.danger}`,
                  color: COLORS.danger, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                }}>
                  모집 마감
                </button>
              )}
            </div>
          )}
        </div>

        {/* 마감 메시지 */}
        {closeMsg && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 16,
            background: closeMsg.includes('오류') ? COLORS.dangerTonal : COLORS.successTonal,
            color: closeMsg.includes('오류') ? COLORS.danger : COLORS.success,
            fontSize: 14,
          }}>
            {closeMsg}
          </div>
        )}

        {/* 참여자 */}
        <Section title="참여자" count={participating.length} emptyText="아직 참여자가 없습니다">
          {participating.map(entry => (
            <ParticipantRow
              key={entry.id}
              entry={entry}
              statusLabel="참여중"
              statusColor={COLORS.success}
              statusBg={COLORS.successTonal}
              showReason={false}
            />
          ))}
        </Section>

        {/* 대기자 */}
        {waiting.length > 0 && (
          <Section title="대기자" count={waiting.length} emptyText="">
            {waiting.map(entry => (
              <ParticipantRow
                key={entry.id}
                entry={entry}
                statusLabel="대기중"
                statusColor="#B45309"
                statusBg="#FFF6E5"
                showReason={false}
              />
            ))}
          </Section>
        )}

        {/* 미참여 — reason은 이 페이지에서만 노출 */}
        {notParticipating.length > 0 && (
          <Section title="미참여" count={notParticipating.length} emptyText="">
            {notParticipating.map(entry => (
              <ParticipantRow
                key={entry.id}
                entry={entry}
                statusLabel="미참여"
                statusColor={COLORS.textMuted}
                statusBg={COLORS.surfaceDim}
                showReason={true}
              />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}
