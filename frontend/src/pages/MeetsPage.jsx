import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
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
  PENDING: { label: '대기중', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  NEGOTIATING: { label: '날짜조율', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  CONFIRMED: { label: '확정', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  COMPLETED: { label: '완료', color: '#9090b0', bg: 'rgba(144,144,176,0.12)' },
  CANCELLED: { label: '취소됨', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
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
    <div style={{ minHeight: '100vh', background: '#090909', paddingBottom: 80 }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>약속</h1>
            <p style={{ color: '#9090b0', fontSize: 13, margin: '4px 0 0' }}>모델·작가와의 촬영 약속을 관리합니다</p>
          </div>
          <button onClick={() => setShowModal(true)} style={newBtnStyle}>
            + 새 약속
          </button>
        </div>

        {/* cosmos-style underline tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 20, overflowX: 'auto' }}>
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
                  borderBottom: active ? '2px solid #fff' : '2px solid transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.45)',
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
                    marginLeft: 5, fontSize: 11, background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '1px 6px', color: active ? '#fff' : '#9090b0',
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
              <div key={i} style={{ height: 88, borderRadius: 14, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{ color: '#f87171', textAlign: 'center', padding: 40, fontSize: 14 }}>{error}</div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
            <div style={{ color: '#5c5c7a', fontSize: 15 }}>약속이 없습니다</div>
            <div style={{ color: '#3a3a5a', fontSize: 13, marginTop: 8 }}>
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
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '16px 18px',
                cursor: 'pointer',
                marginBottom: 10,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              {/* avatar */}
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: other.avatar ? `url(${other.avatar}) center/cover` : '#4458e0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 18,
              }}>
                {!other.avatar && (other.name?.[0] || '?')}
              </div>

              {/* info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {other.name}
                  </span>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 20,
                    background: status.bg, color: status.color, whiteSpace: 'nowrap',
                  }}>
                    {status.label}
                  </span>
                </div>
                <div style={{ color: '#9090b0', fontSize: 12 }}>
                  {isRequester ? '내가 요청' : '받은 요청'}
                  {meet.locationName && ` · 📍 ${meet.locationName}`}
                  {meet.confirmedDate && ` · ${meet.confirmedDate}`}
                </div>
              </div>

              {/* right info */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {meet.messageCount > 0 && (
                  <div style={{ fontSize: 11, color: '#5b6ef5', background: 'rgba(91,110,245,0.15)', borderRadius: 10, padding: '2px 8px', marginBottom: 4 }}>
                    💬 {meet.messageCount}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#5c5c7a' }}>{formatDate(meet.updatedAt)}</div>
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
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>누구에게 약속을 요청할까요?</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9090b0', fontSize: 18, cursor: 'pointer' }}>✕</button>
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
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(91,110,245,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: r.avatarUrl ? `url(${r.avatarUrl}) center/cover` : '#4458e0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                {!r.avatarUrl && (r.name?.[0] || '?')}
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{r.name}</div>
                {r.profileName && <div style={{ color: '#9090b0', fontSize: 12 }}>@{r.profileName}</div>}
              </div>
            </div>
          ))}
          {results.length === 0 && search && (
            <div style={{ color: '#5c5c7a', textAlign: 'center', padding: 24, fontSize: 13 }}>검색 결과가 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 16,
};

const modalStyle = {
  background: '#12122a', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto',
};

const inputStyle = {
  flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '9px 13px', color: '#fff', fontSize: 13, outline: 'none',
};

const searchBtnStyle = {
  background: '#5b6ef5', border: 'none', borderRadius: 8, color: '#fff',
  padding: '9px 16px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
};

const newBtnStyle = {
  background: '#5b6ef5', border: 'none', borderRadius: 10, color: '#fff',
  padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
};

const memberRowStyle = {
  display: 'flex', alignItems: 'center', gap: 12,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 10, padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s',
};
