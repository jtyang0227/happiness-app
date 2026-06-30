import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import meetApi from '../services/meetApi';
import MeetCalendar from '../components/meet/MeetCalendar';
import MeetLocationPicker from '../components/meet/MeetLocationPicker';
import MeetChat from '../components/meet/MeetChat';

const STATUS_LABELS = {
  PENDING: { label: '대기중 ⏳', color: '#f59e0b' },
  NEGOTIATING: { label: '날짜 조율 중 📅', color: '#60a5fa' },
  CONFIRMED: { label: '확정 ✅', color: '#10b981' },
  COMPLETED: { label: '완료 🎉', color: '#9090b0' },
  CANCELLED: { label: '취소됨 ✗', color: '#f87171' },
};

export default function MeetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useAuthStore(s => s.user);
  const [meet, setMeet] = useState(null);
  const [availability, setAvailability] = useState({});
  const [myDates, setMyDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDate, setConfirmDate] = useState('');
  const [confirmTime, setConfirmTime] = useState('');
  const [editLocation, setEditLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('calendar'); // 'calendar'|'location'|'chat'

  useEffect(() => {
    Promise.all([meetApi.getDetail(id), meetApi.getAvailability(id)])
      .then(([m, avail]) => {
        setMeet(m);
        setAvailability(avail);
        const mine = avail[String(auth?.id)];
        setMyDates(mine?.dates || []);
        setNewLocation({ locationName: m.locationName, locationAddress: m.locationAddress, locationLat: m.locationLat, locationLng: m.locationLng });
      })
      .catch(() => setError('약속 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id, auth?.id]);

  const memberId = auth?.id;
  const isRequester = meet?.requesterId === memberId;
  const isReceiver = meet?.receiverId === memberId;
  const other = meet ? (isRequester
    ? { name: meet.receiverName, avatar: meet.receiverAvatarUrl }
    : { name: meet.requesterName, avatar: meet.requesterAvatarUrl }) : {};

  const theirId = meet ? (isRequester ? meet.receiverId : meet.requesterId) : null;
  const theirDates = theirId ? (availability[String(theirId)]?.dates || []) : [];

  async function doAction(fn, successMsg) {
    setActionLoading(true);
    setError('');
    try {
      await fn();
      setSuccess(successMsg);
      const [m, avail] = await Promise.all([meetApi.getDetail(id), meetApi.getAvailability(id)]);
      setMeet(m);
      setAvailability(avail);
    } catch (e) {
      setError(e.response?.data?.message || '오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  }

  async function handleToggleDate(dateStr) {
    const next = myDates.includes(dateStr)
      ? myDates.filter(d => d !== dateStr)
      : [...myDates, dateStr];
    setMyDates(next);
    try {
      await meetApi.submitAvailability(id, next, []);
      const avail = await meetApi.getAvailability(id);
      setAvailability(avail);
    } catch { }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#090909', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#9090b0' }}>불러오는 중…</div>
    </div>
  );

  if (!meet && error) return (
    <div style={{ minHeight: '100vh', background: '#090909', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#f87171' }}>{error}</div>
    </div>
  );

  const statusInfo = STATUS_LABELS[meet.status] || STATUS_LABELS.PENDING;
  const isClosed = meet.status === 'CANCELLED' || meet.status === 'COMPLETED';

  return (
    <div style={{ minHeight: '100vh', background: '#090909', paddingBottom: 80 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
        {/* back + header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => navigate('/meets')} style={{ background: 'none', border: 'none', color: '#9090b0', fontSize: 20, cursor: 'pointer', padding: 4 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: other.avatar ? `url(${other.avatar}) center/cover` : '#4458e0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 }}>
                {!other.avatar && (other.name?.[0] || '?')}
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{other.name}</div>
                <div style={{ fontSize: 12, color: statusInfo.color }}>{statusInfo.label}</div>
              </div>
            </div>
          </div>
          {!isClosed && (
            <button
              onClick={() => doAction(() => meetApi.cancel(id), '약속을 취소했습니다.')}
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, color: '#f87171', padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}
            >
              취소
            </button>
          )}
        </div>

        {/* alerts */}
        {success && <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', color: '#10b981', fontSize: 13, marginBottom: 14 }}>{success}</div>}
        {error && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 14 }}>{error}</div>}

        {/* PENDING — receiver responds */}
        {meet.status === 'PENDING' && isReceiver && (
          <div style={actionCard}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>약속 요청이 도착했습니다</div>
            {meet.initialMessage && <div style={{ color: '#ccc', fontSize: 13, marginBottom: 14, fontStyle: 'italic' }}>"{meet.initialMessage}"</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => doAction(() => meetApi.respond(id, 'accept'), '수락했습니다! 날짜 조율을 시작하세요.')}
                disabled={actionLoading}
                style={{ ...primaryBtn, flex: 1 }}
              >
                ✓ 수락
              </button>
              <button
                onClick={() => doAction(() => meetApi.respond(id, 'reject'), '거절했습니다.')}
                disabled={actionLoading}
                style={{ ...dangerBtn, flex: 1 }}
              >
                ✕ 거절
              </button>
            </div>
          </div>
        )}

        {/* CONFIRMED info */}
        {meet.status === 'CONFIRMED' && (
          <div style={{ ...actionCard, borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.07)' }}>
            <div style={{ color: '#10b981', fontWeight: 600, marginBottom: 4 }}>📅 확정된 약속</div>
            <div style={{ color: '#fff', fontSize: 15 }}>{meet.confirmedDate} {meet.confirmedTime && `· ${meet.confirmedTime}`}</div>
            {meet.status === 'CONFIRMED' && (
              <button
                onClick={() => doAction(() => meetApi.complete(id), '약속이 완료됐습니다!')}
                disabled={actionLoading}
                style={{ ...primaryBtn, marginTop: 12, width: '100%' }}
              >
                완료 처리
              </button>
            )}
          </div>
        )}

        {/* section tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
          {[
            { key: 'calendar', label: '📅 날짜' },
            { key: 'location', label: '📍 장소' },
            { key: 'chat', label: `💬 채팅${meet.messageCount > 0 ? ` (${meet.messageCount})` : ''}` },
          ].map(s => {
            const active = activeSection === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                style={{
                  background: 'none', border: 'none',
                  borderBottom: active ? '2px solid #fff' : '2px solid transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                  fontWeight: active ? 700 : 400,
                  fontSize: 13, padding: '10px 20px', cursor: 'pointer',
                  marginBottom: -1, transition: 'all 0.15s',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* calendar section */}
        {activeSection === 'calendar' && (
          <div style={sectionCard}>
            <MeetCalendar
              myDates={myDates}
              theirDates={theirDates}
              onToggle={isClosed ? undefined : handleToggleDate}
              readOnly={isClosed}
              meetInfo={{
                myName: isRequester ? meet.requesterName : meet.receiverName,
                theirName: other.name,
                locationName: meet.locationName,
                locationAddress: meet.locationAddress,
                confirmedDate: meet.confirmedDate,
                confirmedTime: meet.confirmedTime,
              }}
            />

            {/* confirm date (NEGOTIATING, both parties) */}
            {meet.status === 'NEGOTIATING' && (
              <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                <div style={{ color: '#ccc', fontSize: 13, marginBottom: 10 }}>날짜 확정 (양측 합의 후)</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    value={confirmDate}
                    onChange={e => setConfirmDate(e.target.value)}
                    style={dateInputStyle}
                  />
                  <input
                    type="time"
                    value={confirmTime}
                    onChange={e => setConfirmTime(e.target.value)}
                    style={dateInputStyle}
                  />
                  <button
                    onClick={() => {
                      if (!confirmDate) { setError('날짜를 선택하세요.'); return; }
                      doAction(() => meetApi.confirmDate(id, confirmDate, confirmTime), '날짜가 확정됐습니다!');
                    }}
                    disabled={actionLoading}
                    style={primaryBtn}
                  >
                    확정
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* location section */}
        {activeSection === 'location' && (
          <div style={sectionCard}>
            {editLocation ? (
              <div>
                <MeetLocationPicker
                  value={newLocation}
                  onChange={setNewLocation}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={() => setEditLocation(false)} style={secondaryBtn}>취소</button>
                  <button
                    onClick={() => doAction(
                      () => meetApi.updateLocation(id, newLocation),
                      '장소가 업데이트됐습니다.'
                    ).then(() => setEditLocation(false))}
                    disabled={actionLoading}
                    style={primaryBtn}
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <MeetLocationPicker value={meet} readOnly />
                {!isClosed && (
                  <button onClick={() => setEditLocation(true)} style={{ ...secondaryBtn, marginTop: 14 }}>장소 수정</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* chat section */}
        {activeSection === 'chat' && (
          <div style={{ ...sectionCard, height: 460, display: 'flex', flexDirection: 'column' }}>
            <MeetChat meetId={Number(id)} currentMemberId={memberId} />
          </div>
        )}
      </div>
    </div>
  );
}

const sectionCard = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 14,
  padding: 20,
};

const actionCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14,
  padding: '16px 20px',
  marginBottom: 20,
};

const primaryBtn = {
  background: '#5b6ef5', border: 'none', borderRadius: 8,
  color: '#fff', padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
};

const dangerBtn = {
  background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)',
  borderRadius: 8, color: '#f87171', padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
};

const secondaryBtn = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, color: '#ccc', padding: '9px 18px', cursor: 'pointer', fontSize: 13,
};

const dateInputStyle = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none',
};
