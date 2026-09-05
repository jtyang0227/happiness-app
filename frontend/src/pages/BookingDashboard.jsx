import React, { useState, useEffect } from 'react';
import { COLORS } from '../constants/colors';
import { bookingApi } from '../services/bookingApi';
import AvailabilityModal from '../components/booking/AvailabilityModal';
import Button from '../components/common/Button';
import DotEmptyState from '../components/common/DotEmptyState';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

const STATUS_TABS = [
  { key: 'REQUESTED', label: '대기 중' },
  { key: 'CONFIRMED', label: '확정됨' },
  { key: 'COMPLETED', label: '완료' },
  { key: 'CANCELLED', label: '취소/거절' },
];

const SHOOT_LABELS = {
  WEDDING: '💍 웨딩', SNAP: '📷 스냅', PROFILE: '👤 프로필',
  MATERNITY: '🌸 만삭', NEWBORN: '👶 신생아', COMMERCIAL: '📦 상업', CUSTOM: '✏️ 협의',
};

export default function BookingDashboard() {
  const isDesktop = useIsDesktop();
  const [activeStatus, setActiveStatus] = useState('REQUESTED');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAvailability, setShowAvailability] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = (status) => {
    setLoading(true);
    bookingApi.getMyBookings(status)
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setError('예약 목록을 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(activeStatus); setSelectedId(null); }, [activeStatus]);

  const handleConfirm = async (id) => {
    setActionLoading(id);
    try {
      await bookingApi.confirmBooking(id);
      setBookings(prev => prev.filter(b => b.id !== id));
      setSelectedId(prev => (prev === id ? null : prev));
    } catch { setError('확인 처리에 실패했습니다.'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal);
    try {
      await bookingApi.rejectBooking(rejectModal, rejectReason);
      setBookings(prev => prev.filter(b => b.id !== rejectModal));
      setSelectedId(prev => (prev === rejectModal ? null : prev));
      setRejectModal(null);
      setRejectReason('');
    } catch { setError('거절 처리에 실패했습니다.'); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('이 예약을 취소하시겠습니까?')) return;
    setActionLoading(id);
    try {
      await bookingApi.cancelBooking(id);
      setBookings(prev => prev.filter(b => b.id !== id));
      setSelectedId(prev => (prev === id ? null : prev));
    } catch { setError('취소 처리에 실패했습니다.'); }
    finally { setActionLoading(null); }
  };

  const bookedDaysThisMonth = new Set(
    bookings
      .filter(b => b.status === 'CONFIRMED' || b.status === 'REQUESTED')
      .map(b => b.shootDate)
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  function renderTabs() {
    return (
      <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveStatus(t.key); setError(''); }}
            style={{
              flex: 1, padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeStatus === t.key ? 700 : 400,
              color: activeStatus === t.key ? COLORS.primary : COLORS.textSecondary,
              borderBottom: `2px solid ${activeStatus === t.key ? COLORS.primary : 'transparent'}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  function renderActions(b, compact) {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {b.status === 'REQUESTED' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handleConfirm(b.id); }}
              disabled={actionLoading === b.id}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', background: COLORS.success, color: '#fff', fontSize: 13, fontWeight: 700, cursor: actionLoading === b.id ? 'not-allowed' : 'pointer', opacity: actionLoading === b.id ? 0.6 : 1 }}
            >
              ✓ 확인
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setRejectModal(b.id); setRejectReason(''); }}
              disabled={actionLoading === b.id}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${COLORS.danger}`, background: COLORS.surface, color: COLORS.danger, fontSize: 13, fontWeight: 700, cursor: actionLoading === b.id ? 'not-allowed' : 'pointer' }}
            >
              ✗ 거절
            </button>
          </>
        )}
        {b.status === 'CONFIRMED' && (
          <button
            onClick={(e) => { e.stopPropagation(); handleCancel(b.id); }}
            disabled={actionLoading === b.id}
            style={{ flex: compact ? 'none' : 1, padding: compact ? '9px 16px' : '9px 0', borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: actionLoading === b.id ? 'not-allowed' : 'pointer' }}
          >
            취소
          </button>
        )}
      </div>
    );
  }

  function renderBookingList(compact) {
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => <div key={i} style={{ height: compact ? 78 : 120, borderRadius: 16, background: COLORS.surfaceDim, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
        </div>
      );
    }
    if (bookings.length === 0) {
      return (
        <DotEmptyState
          theme="light"
          icon="📅"
          title="예약이 없습니다"
          description={
            activeStatus === 'REQUESTED'
              ? '대기 중인 예약 요청이 없습니다. 가용 시간을 설정해두면 클라이언트가 예약을 요청할 수 있어요.'
              : `${STATUS_TABS.find(t => t.key === activeStatus)?.label} 상태의 예약이 없습니다.`
          }
          actionLabel={activeStatus === 'REQUESTED' ? '⚙ 가용 시간 설정하기' : undefined}
          onAction={activeStatus === 'REQUESTED' ? () => setShowAvailability(true) : undefined}
        />
      );
    }
    if (compact) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bookings.map(b => {
            const selected = selectedId === b.id;
            return (
              <div
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                style={{
                  background: selected ? COLORS.primaryLight : COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderLeft: selected ? `3px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
                  borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                  transition: 'background-color 0.1s ease',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>
                  {SHOOT_LABELS[b.shootType] || b.shootType || '촬영'}
                </div>
                <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 }}>
                  👤 {b.clientName || b.name || '-'}
                </div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                  📅 {formatDate(b.shootDate)} {b.shootTime && `· ${b.shootTime}`}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bookings.map(b => (
          <div key={b.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>
                  {SHOOT_LABELS[b.shootType] || b.shootType || '촬영'}
                </div>
                <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 }}>
                  📅 {formatDate(b.shootDate)} {b.shootTime && `· ${b.shootTime}`}
                </div>
                <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>
                  👤 {b.clientName || b.name || '-'}
                </div>
                {(b.phone || b.clientPhone) && (
                  <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                    📞 {b.phone || b.clientPhone}
                  </div>
                )}
                {b.memo && (
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6, padding: '8px 10px', background: COLORS.bg, borderRadius: 8, lineHeight: 1.5 }}>
                    {b.memo}
                  </div>
                )}
              </div>
            </div>
            {renderActions(b, false)}
          </div>
        ))}
      </div>
    );
  }

  function renderDetailPanel() {
    const selected = bookings.find(b => b.id === selectedId);
    if (!selected) {
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 16, color: COLORS.textMuted }}>예약을 선택하면 상세 내용을 확인할 수 있습니다</div>
        </div>
      );
    }
    return (
      <div style={{ maxWidth: 480 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>
          {SHOOT_LABELS[selected.shootType] || selected.shootType || '촬영'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: COLORS.text, marginBottom: 20 }}>
          <div>날짜: {formatDate(selected.shootDate)} {selected.shootTime && `${selected.shootTime}`}</div>
          <div>고객: {selected.clientName || selected.name || '-'} {(selected.phone || selected.clientPhone) && `· ${selected.phone || selected.clientPhone}`}</div>
          {selected.memo && (
            <div style={{ padding: '10px 12px', background: COLORS.bg, borderRadius: 8, color: COLORS.textSecondary, lineHeight: 1.6 }}>
              메모: {selected.memo}
            </div>
          )}
        </div>

        {selected.status === 'CONFIRMED' && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: COLORS.successTonal || '#E5F9F0', color: COLORS.success, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
            확정된 예약입니다
          </div>
        )}

        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 20 }}>
          {renderActions(selected, true)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg }}>
      {isDesktop ? (
        <div style={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 60px)' }}>
          {/* left panel */}
          <div style={{ width: 360, flexShrink: 0, borderRight: `1px solid ${COLORS.border}`, overflowY: 'auto', background: COLORS.surface, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: 0 }}>예약 관리</h1>
                <button
                  onClick={() => setShowAvailability(true)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${COLORS.primary}`, background: COLORS.primaryLight, color: COLORS.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  ⚙ 설정
                </button>
              </div>
              {error && (
                <div style={{ background: '#fff0f0', border: `1px solid ${COLORS.danger}`, borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 12, color: COLORS.danger }}>
                  {error}
                </div>
              )}
              {renderTabs()}
            </div>
            <div style={{ padding: '0 12px 12px' }}>
              {renderBookingList(true)}
            </div>
          </div>

          {/* right detail panel */}
          <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: COLORS.bg }}>
            {renderDetailPanel()}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, margin: 0 }}>예약 관리</h1>
            <button
              onClick={() => setShowAvailability(true)}
              style={{ padding: '10px 16px', borderRadius: 12, border: `1.5px solid ${COLORS.primary}`, background: COLORS.primaryLight, color: COLORS.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              ⚙ 가용 시간 설정
            </button>
          </div>

          {/* Mini calendar dots view */}
          {bookedDaysThisMonth.size > 0 && (
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>이번 달 예약 있는 날짜</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Array.from(bookedDaysThisMonth).sort().map(d => (
                  <div key={d} style={{ padding: '4px 10px', borderRadius: 20, background: COLORS.primaryLight, color: COLORS.primary, fontSize: 12, fontWeight: 700 }}>
                    {d?.slice(5)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: '#fff0f0', border: `1px solid ${COLORS.danger}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: COLORS.danger }}>
              {error}
            </div>
          )}

          {renderTabs()}
          {renderBookingList(false)}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal !== null && (
        <div onClick={() => setRejectModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: COLORS.surface, borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 380 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: COLORS.text, margin: '0 0 16px' }}>예약 거절</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="거절 사유 (선택)"
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 13, color: COLORS.text, background: COLORS.surface, resize: 'vertical', outline: 'none', fontFamily: 'inherit', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setRejectModal(null)} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleReject} disabled={actionLoading === rejectModal} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: COLORS.danger, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>거절하기</button>
            </div>
          </div>
        </div>
      )}

      {showAvailability && <AvailabilityModal onClose={() => setShowAvailability(false)} />}
    </div>
  );
}
