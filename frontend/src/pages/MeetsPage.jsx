import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { COLORS } from '../constants/colors';
import meetApi from '../services/meetApi';
import MeetRequestModal from '../components/meet/MeetRequestModal';

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'PENDING', label: '대기중' },
  { key: 'NEGOTIATING', label: '날짜조율' },
  { key: 'CONFIRMED', label: '확정' },
  { key: 'COMPLETED', label: '완료' },
];

const STATUS_LABELS = {
  PENDING: { label: '대기중', color: '#B45309', bg: '#FFF6E5' },
  NEGOTIATING: { label: '날짜조율', color: COLORS.primary, bg: COLORS.primaryLight },
  CONFIRMED: { label: '확정', color: COLORS.success, bg: COLORS.successTonal },
  COMPLETED: { label: '완료', color: COLORS.textMuted, bg: COLORS.surfaceDim },
  CANCELLED: { label: '취소됨', color: COLORS.danger, bg: COLORS.dangerTonal },
};

export default function MeetsPage() {
  const auth = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const [meets, setMeets] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    meetApi.list()
      .then(setMeets)
      .catch(() => setError('약속 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'all' ? meets : meets.filter(m => m.status === tab);

  function getOther(meet) {
    const isRequester = meet.requesterId === auth?.id;
    return isRequester
      ? { name: meet.receiverName, avatar: meet.receiverAvatarUrl }
      : { name: meet.requesterName, avatar: meet.requesterAvatarUrl };
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ color: COLORS.text, fontSize: 22, fontWeight: 700, margin: 0 }}>약속</h1>
            <p style={{ color: COLORS.textMuted, fontSize: 13, margin: '4px 0 0' }}>모델·작가와의 촬영 약속을 관리합니다</p>
          </div>
          <button onClick={() => setShowModal(true)} style={newBtnStyle}>
            + 새 약속
          </button>
        </div>

        {/* underline tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 20, overflowX: 'auto' }}>
          {TABS.map(t => {
            const count = t.key === 'all' ? meets.length : meets.filter(m => m.status === t.key).length;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? `2px solid ${COLORS.primary}` : '2px solid transparent',
                  color: active ? COLORS.primary : COLORS.textMuted,
                  fontWeight: active ? 700 : 400,
                  fontSize: 13,
                  padding: '10px 16px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  marginBottom: -1,
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
                {count > 0 && (
                  <span style={{
                    marginLeft: 5, fontSize: 11, background: active ? COLORS.primaryLight : COLORS.surfaceDim,
                    borderRadius: 10, padding: '1px 6px', color: active ? COLORS.primary : COLORS.textMuted,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* content */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 88, borderRadius: 14, background: COLORS.surfaceDim, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{ color: COLORS.danger, textAlign: 'center', padding: 40, fontSize: 14 }}>{error}</div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
            <div style={{ color: COLORS.textSecondary, fontSize: 15 }}>약속이 없습니다</div>
            <div style={{ color: COLORS.textHint, fontSize: 13, marginTop: 8 }}>
              새 약속 버튼을 눌러 모델이나 작가에게 약속을 요청해보세요
            </div>
          </div>
        )}

        {!loading && filtered.map(meet => {
          const other = getOther(meet);
          const status = STATUS_LABELS[meet.status] || STATUS_LABELS.PENDING;
          const isRequester = meet.requesterId === auth?.id;

          return (
            <div
              key={meet.id}
              onClick={() => navigate(`/meets/${meet.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: '16px 18px',
                cursor: 'pointer',
                marginBottom: 10,
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              {/* avatar */}
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: other.avatar ? `url(${other.avatar}) center/cover` : COLORS.primaryDark,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 18,
              }}>
                {!other.avatar && (other.name?.[0] || '?')}
              </div>

              {/* info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {other.name}
                  </span>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 20,
                    background: status.bg, color: status.color, whiteSpace: 'nowrap',
                  }}>
                    {status.label}
                  </span>
                </div>
                <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
                  {isRequester ? '내가 요청' : '받은 요청'}
                  {meet.locationName && ` · 📍 ${meet.locationName}`}
                  {meet.confirmedDate && ` · ${meet.confirmedDate}`}
                </div>
              </div>

              {/* right info */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {meet.messageCount > 0 && (
                  <div style={{ fontSize: 11, color: COLORS.primary, background: COLORS.primaryLight, borderRadius: 10, padding: '2px 8px', marginBottom: 4 }}>
                    💬 {meet.messageCount}
                  </div>
                )}
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatDate(meet.updatedAt)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* new meet modal — uses search instead of fixed receiver for now */}
      {showModal && (
        <NewMeetModalWrapper
          currentMemberId={auth?.id}
          onClose={() => setShowModal(false)}
          onCreated={meet => {
            setMeets(prev => [meet, ...prev]);
            navigate(`/meets/${meet.id}`);
          }}
        />
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

function NewMeetModalWrapper({ currentMemberId, onClose, onCreated }) {
  const [search, setSearch] = useState('');
  const [member, setMember] = useState(null);
  const [step, setStep] = useState('search'); // 'search' | 'request'
  const [results, setResults] = useState([]);

  async function handleSearch() {
    if (!search.trim()) return;
    try {
      const apiClient = (await import('../api/apiClient')).default;
      const res = await apiClient.get('/auth/members/search', { params: { q: search, size: 10 } });
      setResults(res.data || []);
    } catch {
      setResults([]);
    }
  }

  if (step === 'request' && member) {
    return (
      <MeetRequestModal
        receiverId={member.id}
        receiverName={member.name}
        onClose={onClose}
        onCreated={onCreated}
      />
    );
  }

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 17 }}>누구에게 약속을 요청할까요?</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.textMuted, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="이름 또는 @프로필명 검색"
            style={inputStyle}
          />
          <button onClick={handleSearch} style={searchBtnStyle}>검색</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map(r => (
            <div
              key={r.id}
              onClick={() => { setMember(r); setStep('request'); }}
              style={memberRowStyle}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.primaryLight}
              onMouseLeave={e => e.currentTarget.style.background = COLORS.surfaceDim}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: r.avatarUrl ? `url(${r.avatarUrl}) center/cover` : COLORS.primaryDark, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                {!r.avatarUrl && (r.name?.[0] || '?')}
              </div>
              <div>
                <div style={{ color: COLORS.text, fontSize: 14, fontWeight: 500 }}>{r.name}</div>
                {r.profileName && <div style={{ color: COLORS.textMuted, fontSize: 12 }}>@{r.profileName}</div>}
              </div>
            </div>
          ))}
          {results.length === 0 && search && (
            <div style={{ color: COLORS.textSecondary, textAlign: 'center', padding: 24, fontSize: 13 }}>검색 결과가 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 16,
};

const modalStyle = {
  background: COLORS.surface, border: `1px solid ${COLORS.border}`,
  borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto',
};

const inputStyle = {
  flex: 1, background: COLORS.surfaceDim, border: `1px solid ${COLORS.border}`,
  borderRadius: 8, padding: '9px 13px', color: COLORS.text, fontSize: 13, outline: 'none',
};

const searchBtnStyle = {
  background: COLORS.primary, border: 'none', borderRadius: 8, color: '#fff',
  padding: '9px 16px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
};

const newBtnStyle = {
  background: COLORS.primary, border: 'none', borderRadius: 10, color: '#fff',
  padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
};

const memberRowStyle = {
  display: 'flex', alignItems: 'center', gap: 12,
  background: COLORS.surfaceDim, border: `1px solid ${COLORS.border}`,
  borderRadius: 10, padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s',
};
