import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import gatheringApi from '../services/gatheringApi';
import useAuthStore from '../store/authStore';
import GatheringFeed from '../components/gathering/GatheringFeed';

/* ── 상태 메타 ─────────────────────────────────────────── */
const STATUS_META = {
  RECRUITING:          { label: '모집중',   bg: COLORS.primaryLight, color: COLORS.primary },
  RECRUITMENT_CLOSED:  { label: '모집마감', bg: COLORS.surfaceDim,   color: COLORS.textMuted },
  SCHEDULED:           { label: '예정됨',  bg: COLORS.successTonal,  color: COLORS.success },
  ONGOING:             { label: '진행중',   bg: '#FFF6E5',            color: '#B45309' },
  ENDED:               { label: '종료됨',  bg: COLORS.surfaceDim,    color: COLORS.textMuted },
};

/* ── 날짜 포맷 ─────────────────────────────────────────── */
function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
    + ' '
    + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ── 미참여 사유 선택 모달 ─────────────────────────────── */
const NOT_PARTICIPATING_REASONS = [
  { value: '일정이 맞지 않아요', label: '일정이 맞지 않아요' },
  { value: '장소가 멀어서요', label: '장소가 멀어서요' },
  { value: '개인 사정이 있어요', label: '개인 사정이 있어요' },
  { value: '직접 입력', label: '기타 (직접 입력)' },
];

function NotParticipatingModal({ participantCount, maxParticipants, onConfirm, onClose, loading }) {
  const [selected, setSelected] = useState('일정이 맞지 않아요');
  const [customReason, setCustomReason] = useState('');
  const isCustom = selected === '직접 입력';
  const finalReason = isCustom ? customReason.trim() : selected;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: COLORS.surface,
          borderRadius: 20, padding: '24px 20px',
          width: '100%', maxWidth: 400,
          boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
        }}
      >
        <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: COLORS.text }}>
          미참여 사유
        </h3>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: COLORS.textMuted }}>
          현재 {participantCount}/{maxParticipants}명 참여 중
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {NOT_PARTICIPATING_REASONS.map(r => (
            <label
              key={r.value}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${selected === r.value ? COLORS.primary : COLORS.border}`,
                background: selected === r.value ? COLORS.primaryLight : COLORS.surface,
                transition: 'all 0.12s',
              }}
            >
              <input
                type="radio"
                name="notReason"
                value={r.value}
                checked={selected === r.value}
                onChange={() => setSelected(r.value)}
                style={{ accentColor: COLORS.primary }}
              />
              <span style={{ fontSize: 14, color: COLORS.text }}>{r.label}</span>
            </label>
          ))}
        </div>

        {isCustom && (
          <textarea
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            placeholder="사유를 입력해주세요 (최대 200자)"
            maxLength={200}
            rows={3}
            style={{
              width: '100%', padding: '10px 12px',
              border: `1px solid ${COLORS.border}`, borderRadius: 10,
              fontSize: 14, color: COLORS.text, background: COLORS.surface,
              resize: 'none', boxSizing: 'border-box', marginBottom: 14,
            }}
          />
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px',
              background: COLORS.surfaceDim, border: `1px solid ${COLORS.border}`,
              borderRadius: 10, cursor: 'pointer',
              fontSize: 14, fontWeight: 600, color: COLORS.textSecondary,
            }}
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(finalReason)}
            disabled={loading || (isCustom && !customReason.trim())}
            style={{
              flex: 1, padding: '12px',
              background: loading ? COLORS.textHint : COLORS.primary,
              border: 'none', borderRadius: 10,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 700, color: '#fff',
            }}
          >
            {loading ? '처리 중...' : '미참여 확인'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 참여 확인 모달 ────────────────────────────────────── */
function ParticipateConfirmModal({ participantCount, maxParticipants, onConfirm, onClose, loading }) {
  const spotsLeft = maxParticipants - participantCount;
  const willWait = spotsLeft <= 0;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: COLORS.surface,
          borderRadius: 20, padding: '24px 20px',
          width: '100%', maxWidth: 380,
          boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: COLORS.text }}>
          모임 참여
        </h3>
        <p style={{ margin: '0 0 6px', fontSize: 14, color: COLORS.textSecondary }}>
          현재 참여 인원 <strong>{participantCount}/{maxParticipants}명</strong>
        </p>
        {willWait ? (
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#B45309', background: '#FFF6E5', padding: '10px 12px', borderRadius: 10 }}>
            ⚠ 현재 정원이 가득 찼습니다. 참여하면 대기자 명단에 등록됩니다.
          </p>
        ) : (
          <p style={{ margin: '0 0 20px', fontSize: 13, color: COLORS.textMuted }}>
            남은 자리 {spotsLeft}명 · 참여 후 취소할 수 있습니다
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px', background: COLORS.surfaceDim,
            border: `1px solid ${COLORS.border}`, borderRadius: 10,
            cursor: 'pointer', fontSize: 14, fontWeight: 600, color: COLORS.textSecondary,
          }}>
            취소
          </button>
          <button onClick={onConfirm} disabled={loading} style={{
            flex: 1, padding: '12px',
            background: loading ? COLORS.textHint : COLORS.primary,
            border: 'none', borderRadius: 10,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 700, color: '#fff',
          }}>
            {loading ? '처리 중...' : '참여하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 모집 마감 확인 ────────────────────────────────────── */
function CloseRecruitmentButton({ onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (confirming) {
    return (
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: '12px 14px', borderRadius: 10,
        background: COLORS.dangerTonal, border: `1px solid ${COLORS.danger}`,
      }}>
        <span style={{ fontSize: 13, color: COLORS.danger, flex: 1 }}>
          정말 모집을 마감하시겠습니까?
        </span>
        <button
          onClick={() => setConfirming(false)}
          style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.surface, cursor: 'pointer', fontSize: 13, color: COLORS.textSecondary }}
        >
          취소
        </button>
        <button
          onClick={async () => {
            setLoading(true);
            await onClose();
            setLoading(false);
            setConfirming(false);
          }}
          disabled={loading}
          style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: COLORS.danger, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}
        >
          {loading ? '처리 중...' : '마감'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{
        padding: '10px 18px', borderRadius: 10,
        background: COLORS.dangerTonal, border: `1px solid ${COLORS.danger}`,
        color: COLORS.danger, cursor: 'pointer',
        fontSize: 14, fontWeight: 700, transition: 'all 0.12s',
      }}
    >
      모집 마감
    </button>
  );
}

/* ── GatheringDetailPage ───────────────────────────────── */
export default function GatheringDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const [gathering, setGathering] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 이번 세션에서의 참여 상태 (optimistic)
  const [myStatus, setMyStatus] = useState(null); // null | 'PARTICIPATING' | 'WAITING' | 'NOT_PARTICIPATING'

  const [showParticipateModal, setShowParticipateModal] = useState(false);
  const [showNotParticipateModal, setShowNotParticipateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    gatheringApi.getDetail(id)
      .then(data => setGathering(data.data || data))
      .catch(() => setError('모임 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: COLORS.textMuted, fontSize: 14 }}>불러오는 중...</div>
      </div>
    );
  }

  if (error || !gathering) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ color: COLORS.danger, fontSize: 14, marginBottom: 16 }}>
          {error || '모임을 찾을 수 없습니다.'}
        </div>
        <button onClick={() => navigate('/gatherings')} style={{
          padding: '9px 18px', borderRadius: 10, border: `1px solid ${COLORS.border}`,
          background: COLORS.surface, cursor: 'pointer', fontSize: 14, color: COLORS.textSecondary,
        }}>
          목록으로
        </button>
      </div>
    );
  }

  const statusMeta = STATUS_META[gathering.status] || STATUS_META.RECRUITING;
  const isCreator = user && gathering.createdBy === user.id;
  const isRecruiting = gathering.status === 'RECRUITING';
  const isClosed = ['RECRUITMENT_CLOSED', 'SCHEDULED'].includes(gathering.status);
  const isActiveOrEnded = ['ONGOING', 'ENDED'].includes(gathering.status);

  /* ── 참여하기 ─────────────────────────────────────────── */
  async function handleParticipate() {
    setActionLoading(true);
    setActionMsg('');
    try {
      const res = await gatheringApi.respond(id, 'PARTICIPATING');
      const resultStatus = res?.status || res?.data?.status || 'PARTICIPATING';
      setMyStatus(resultStatus);
      if (resultStatus === 'WAITING') {
        setActionMsg('정원이 가득 찼습니다. 대기자 명단에 등록되었습니다.');
      } else {
        setActionMsg('참여 신청이 완료되었습니다!');
      }
      // 카운트 갱신
      setGathering(prev => ({
        ...prev,
        participantCount: resultStatus === 'PARTICIPATING' ? prev.participantCount + 1 : prev.participantCount,
        waitingCount: resultStatus === 'WAITING' ? prev.waitingCount + 1 : prev.waitingCount,
      }));
    } catch (err) {
      setActionMsg(err?.response?.data?.message || '참여 신청 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
      setShowParticipateModal(false);
    }
  }

  /* ── 미참여 ───────────────────────────────────────────── */
  async function handleNotParticipate(reason) {
    setActionLoading(true);
    setActionMsg('');
    try {
      await gatheringApi.respond(id, 'NOT_PARTICIPATING', reason);
      setMyStatus('NOT_PARTICIPATING');
      setActionMsg('미참여 처리되었습니다.');
    } catch (err) {
      setActionMsg(err?.response?.data?.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
      setShowNotParticipateModal(false);
    }
  }

  /* ── 참여 취소 ─────────────────────────────────────────── */
  async function handleCancelParticipation() {
    if (!window.confirm('참여를 취소하시겠습니까?')) return;
    setActionLoading(true);
    try {
      await gatheringApi.cancelParticipation(id);
      setMyStatus(null);
      setActionMsg('참여가 취소되었습니다.');
      setGathering(prev => ({
        ...prev,
        participantCount: Math.max(0, prev.participantCount - 1),
      }));
    } catch {
      setActionMsg('취소 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  }

  /* ── 모집 마감 ─────────────────────────────────────────── */
  async function handleCloseRecruitment() {
    try {
      await gatheringApi.closeRecruitment(id);
      setGathering(prev => ({ ...prev, status: 'RECRUITMENT_CLOSED' }));
      setActionMsg('모집이 마감되었습니다.');
    } catch {
      setActionMsg('모집 마감 중 오류가 발생했습니다.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 20px 0' }}>

        {/* 뒤로가기 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: COLORS.textSecondary, padding: 4, lineHeight: 1 }}
            aria-label="뒤로가기"
          >
            ←
          </button>
          {isCreator && (
            <Link to={`/gatherings/${id}/edit`} style={{
              padding: '7px 14px', borderRadius: 9,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textSecondary, fontSize: 13, fontWeight: 600,
              textDecoration: 'none', background: COLORS.surface,
            }}>
              수정
            </Link>
          )}
        </div>
      </div>

      {/* 썸네일 */}
      {gathering.thumbnailUrl && (
        <div style={{ width: '100%', maxWidth: 720, margin: '0 auto', aspectRatio: '16/7', overflow: 'hidden' }}>
          <img
            src={gathering.thumbnailUrl}
            alt={gathering.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.parentElement.style.display = 'none'; }}
          />
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>

        {/* 정보 카드 */}
        <div style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 16, padding: '20px', marginTop: 20, marginBottom: 20,
        }}>
          {/* 상태 배지 */}
          <div style={{ marginBottom: 10 }}>
            <span style={{
              padding: '4px 10px', borderRadius: 99,
              background: statusMeta.bg, color: statusMeta.color,
              fontSize: 12, fontWeight: 700,
            }}>
              {statusMeta.label}
            </span>
          </div>

          <h1 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 700, color: COLORS.text, lineHeight: 1.35 }}>
            {gathering.title}
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <InfoRow icon="📅" label="일시">
              {formatDateTime(gathering.startDateTime)} ~ {new Date(gathering.endDateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </InfoRow>
            <InfoRow icon="📍" label="장소">
              {gathering.location}
            </InfoRow>
            <InfoRow icon="👥" label="참여 인원">
              <strong>{gathering.participantCount}</strong> / {gathering.maxParticipants}명
              {gathering.waitingCount > 0 && (
                <span style={{ color: COLORS.textMuted, marginLeft: 6 }}>대기 {gathering.waitingCount}명</span>
              )}
            </InfoRow>
            {isRecruiting && (
              <InfoRow icon="⏰" label="모집 마감">
                {formatDate(gathering.recruitmentEndDateTime)}
              </InfoRow>
            )}
            {gathering.fee && (
              <InfoRow icon="💰" label="참가비">{gathering.fee}</InfoRow>
            )}
            {gathering.shootTheme && (
              <InfoRow icon="🎨" label="촬영 테마">{gathering.shootTheme}</InfoRow>
            )}
          </div>
        </div>

        {/* 소개글 */}
        {gathering.description && (
          <div style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 16, padding: '20px', marginBottom: 20,
          }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: COLORS.text }}>모임 소개</h2>
            <p style={{ margin: 0, fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {gathering.description}
            </p>
          </div>
        )}

        {/* 상세 설명 */}
        {gathering.detailDescription && (
          <div style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 16, padding: '20px', marginBottom: 20,
          }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: COLORS.text }}>상세 내용</h2>
            <p style={{ margin: 0, fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {gathering.detailDescription}
            </p>
          </div>
        )}

        {/* 준비 안내 */}
        {gathering.preparationNote && (
          <div style={{
            background: COLORS.primaryLight, border: `1px solid ${COLORS.primaryTonal || '#C9E2FF'}`,
            borderRadius: 16, padding: '16px 20px', marginBottom: 20,
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: COLORS.primary }}>📋 준비 안내</h2>
            <p style={{ margin: 0, fontSize: 13, color: COLORS.primary, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {gathering.preparationNote}
            </p>
          </div>
        )}

        {/* 액션 메시지 */}
        {actionMsg && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 16,
            background: actionMsg.includes('오류') ? COLORS.dangerTonal : COLORS.successTonal,
            color: actionMsg.includes('오류') ? COLORS.danger : COLORS.success,
            fontSize: 14,
          }}>
            {actionMsg}
          </div>
        )}

        {/* ── RECRUITING: 참여 액션 영역 ─────────────────── */}
        {isRecruiting && user && !isCreator && (
          <div style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 16, padding: '20px', marginBottom: 20,
          }}>
            {myStatus === null && (
              <div style={{ display: 'flex', gap: 12 }}>
                <ParticipateButton onClick={() => setShowParticipateModal(true)} />
                <NotParticipateButton onClick={() => setShowNotParticipateModal(true)} />
              </div>
            )}
            {(myStatus === 'PARTICIPATING' || myStatus === 'WAITING') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: myStatus === 'WAITING' ? '#FFF6E5' : COLORS.successTonal,
                  color: myStatus === 'WAITING' ? '#B45309' : COLORS.success,
                  fontSize: 14, fontWeight: 600,
                }}>
                  {myStatus === 'WAITING' ? '⏳ 대기자 명단에 등록되었습니다' : '✓ 참여 신청 완료'}
                </div>
                <button
                  onClick={handleCancelParticipation}
                  disabled={actionLoading}
                  style={{
                    padding: '9px 16px', borderRadius: 9,
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.surface, cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: COLORS.textSecondary,
                  }}
                >
                  참여 취소
                </button>
              </div>
            )}
            {myStatus === 'NOT_PARTICIPATING' && (
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: COLORS.surfaceDim,
                color: COLORS.textMuted, fontSize: 14,
              }}>
                미참여로 응답했습니다
              </div>
            )}
          </div>
        )}

        {/* ── 생성자 액션 영역 ─────────────────────────── */}
        {isCreator && isRecruiting && (
          <div style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 16, padding: '20px', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link
                to={`/gatherings/${id}/manage`}
                style={{
                  padding: '10px 18px', borderRadius: 10,
                  background: COLORS.primaryLight, border: 'none',
                  color: COLORS.primary, fontSize: 14, fontWeight: 700,
                  textDecoration: 'none', display: 'inline-block',
                }}
              >
                👥 참여자 관리
              </Link>
              <CloseRecruitmentButton onClose={handleCloseRecruitment} />
            </div>
          </div>
        )}

        {/* ── 모집마감 / 예정됨 ────────────────────────── */}
        {isClosed && (
          <div style={{
            padding: '16px 20px', borderRadius: 12, marginBottom: 20,
            background: COLORS.surfaceDim, border: `1px solid ${COLORS.border}`,
            color: COLORS.textMuted, fontSize: 14, textAlign: 'center',
          }}>
            🔒 모집이 마감되었습니다
          </div>
        )}

        {/* ── 진행중 / 종료: 실제 피드 ─────────────────── */}
        {isActiveOrEnded && (
          <>
            <GatheringFeed
              gatheringId={id}
              status={gathering.status}
              isParticipating={myStatus === 'PARTICIPATING'}
              currentUser={user}
            />
            {gathering.status === 'ENDED' && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <Link
                  to={`/gatherings/${id}/album`}
                  style={{
                    display: 'inline-block',
                    padding: '10px 24px', borderRadius: 10,
                    background: COLORS.primaryLight,
                    border: `1px solid ${COLORS.primaryTonal}`,
                    color: COLORS.primary, fontSize: 14, fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  📷 사진 앨범 보기
                </Link>
              </div>
            )}
          </>
        )}

        {/* 해시태그 */}
        {gathering.hashtags && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {gathering.hashtags.split(/\s+/).filter(Boolean).map((tag, i) => (
              <span key={i} style={{
                padding: '4px 10px', borderRadius: 99,
                background: COLORS.surfaceDim, border: `1px solid ${COLORS.border}`,
                fontSize: 12, color: COLORS.textSecondary,
              }}>
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 모달들 */}
      {showParticipateModal && (
        <ParticipateConfirmModal
          participantCount={gathering.participantCount}
          maxParticipants={gathering.maxParticipants}
          onConfirm={handleParticipate}
          onClose={() => setShowParticipateModal(false)}
          loading={actionLoading}
        />
      )}
      {showNotParticipateModal && (
        <NotParticipatingModal
          participantCount={gathering.participantCount}
          maxParticipants={gathering.maxParticipants}
          onConfirm={handleNotParticipate}
          onClose={() => setShowNotParticipateModal(false)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

function InfoRow({ icon, label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: COLORS.textSecondary }}>
      <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: COLORS.textMuted, minWidth: 64, flexShrink: 0 }}>{label}</span>
      <span style={{ color: COLORS.text, flex: 1 }}>{children}</span>
    </div>
  );
}

function ParticipateButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, padding: '12px',
        background: hovered ? COLORS.primaryDark : COLORS.primary,
        border: 'none', borderRadius: 12, cursor: 'pointer',
        fontSize: 15, fontWeight: 700, color: '#fff',
        transition: 'all 0.15s', boxShadow: hovered ? '0 4px 14px rgba(49,130,246,0.28)' : 'none',
      }}
    >
      ✓ 참여하기
    </button>
  );
}

function NotParticipateButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, padding: '12px',
        background: hovered ? COLORS.surfaceDim : COLORS.surface,
        border: `1px solid ${hovered ? COLORS.textHint : COLORS.border}`,
        borderRadius: 12, cursor: 'pointer',
        fontSize: 15, fontWeight: 600, color: COLORS.textSecondary,
        transition: 'all 0.15s',
      }}
    >
      ✗ 미참여
    </button>
  );
}
