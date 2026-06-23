import React, { useState, useEffect } from 'react';
import { COLORS } from '../constants/colors';
import { bookingApi } from '../services/bookingApi';
import AvailabilityModal from '../components/booking/AvailabilityModal';

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
  const [activeStatus, setActiveStatus] = useState('REQUESTED');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAvailability, setShowAvailability] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  const load = (status) => {
    setLoading(true);
    bookingApi.getMyBookings(status)
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setError('예약 목록을 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(activeStatus); }, [activeStatus]);

  const handleConfirm = async (id) => {
    setActionLoading(id);
    try {
      await bookingApi.confirmBooking(id);
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch { setError('확인 처리에 실패했습니다.'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal);
    try {
      await bookingApi.rejectBooking(rejectModal, rejectReason);
      setBookings(prev => prev.filter(b => b.id !== rejectModal));
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
    } catch { setError('취소 처리에 실패했습니다.'); }
    finally { setActionLoading(null); }
  };

  const bookedDaysThisMonth = new Set(
    bookings
      .filter(b => b.status === 'CONFIRMED' || b.status === 'REQUESTED')
      .map(b => b.date)
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
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

      {/* Status tabs */}
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

      {/* Booking list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => <div key={i} style={{ height: 120, borderRadius: 16, background: COLORS.surfaceDim, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: COLORS.textMuted }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 14, color: COLORS.text, fontWeight: 600, marginBottom: 4 }}>예약이 없습니다</div>
          <div style={{ fontSize: 13 }}>
            {activeStatus === 'REQUESTED' ? '대기 중인 예약 요청이 없습니다.' : `${STATUS_TABS.find(t => t.key === activeStatus)?.label} 상태의 예약이 없습니다.`}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map(b => (
            <div key={b.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>
                    {SHOOT_LABELS[b.shootType] || b.shootType || '촬영'}
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 }}>
                    📅 {formatDate(b.date)} {b.time && `· ${b.time}`}
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

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                {b.status === 'REQUESTED' && (
                  <>
                    <button
                      onClick={() => handleConfirm(b.id)}
                      disabled={actionLoading === b.id}
                      style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', background: COLORS.success, color: '#fff', fontSize: 13, fontWeight: 700, cursor: actionLoading === b.id ? 'not-allowed' : 'pointer', opacity: actionLoading === b.id ? 0.6 : 1 }}
                    >
                      ✓ 확인
                    </button>
                    <button
                      onClick={() => { setRejectModal(b.id); setRejectReason(''); }}
                      disabled={actionLoading === b.id}
                      style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${COLORS.danger}`, background: COLORS.surface, color: COLORS.danger, fontSize: 13, fontWeight: 700, cursor: actionLoading === b.id ? 'not-allowed' : 'pointer' }}
                    >
                      ✗ 거절
                    </button>
                  </>
                )}
                {b.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleCancel(b.id)}
                    disabled={actionLoading === b.id}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: actionLoading === b.id ? 'not-allowed' : 'pointer' }}
                  >
                    취소
                  </button>
                )}
              </div>
            </div>
          ))}
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
