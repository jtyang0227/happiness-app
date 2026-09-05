import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { COLORS } from '../constants/colors';
import meetApi from '../services/meetApi';
import MeetRequestModal from '../components/meet/MeetRequestModal';
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
  const isDesktop = useIsDesktop();
  const [meets, setMeets] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

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

  function renderTabs(compact) {
    return (
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${COLORS.border}`, marginBottom: compact ? 12 : 20, overflowX: 'auto' }}>
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
                fontSize: compact ? 12 : 13,
                padding: compact ? '8px 10px' : '10px 16px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginBottom: -1,
                transition: 'color 0.15s ease, border-color 0.15s ease',
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
    );
  }

  function renderList(compact) {
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: compact ? 72 : 88, borderRadius: 14, background: COLORS.surfaceDim, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      );
    }
    if (error) {
      return <div style={{ color: COLORS.danger, textAlign: 'center', padding: 40, fontSize: 14 }}>{error}</div>;
    }
    if (filtered.length === 0) {
      return (
        <DotEmptyState
          theme="light"
          icon="🤝"
          title="아직 약속이 없습니다"
          description="작가/모델을 검색해 첫 약속을 요청해보세요"
          actionLabel={tab === 'all' ? '+ 새 약속 요청하기' : undefined}
          onAction={tab === 'all' ? () => setShowModal(true) : undefined}
        />
      );
    }
    return filtered.map(meet => {
      const other = getOther(meet);
      const status = STATUS_LABELS[meet.status] || STATUS_LABELS.PENDING;
      const isRequester = meet.requesterId === auth?.id;
      const selected = compact && selectedId === meet.id;

      return (
        <div
          key={meet.id}
          onClick={() => (compact ? setSelectedId(meet.id) : navigate(`/meets/${meet.id}`))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: compact ? 12 : 14,
            background: selected ? COLORS.primaryLight : COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderLeft: selected ? `3px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
            borderRadius: compact ? 10 : 14,
            padding: compact ? '14px 16px' : '16px 18px',
            cursor: 'pointer',
            marginBottom: compact ? 8 : 10,
            transition: compact
              ? 'background-color 0.1s ease'
              : 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={e => {
            if (compact) {
              if (!selected) e.currentTarget.style.background = COLORS.surfaceDim;
            } else {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
            }
          }}
          onMouseLeave={e => {
            if (compact) {
              e.currentTarget.style.background = selected ? COLORS.primaryLight : COLORS.surface;
            } else {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {/* avatar */}
          <div style={{
            width: compact ? 40 : 46, height: compact ? 40 : 46, borderRadius: '50%', flexShrink: 0,
            background: other.avatar ? `url(${other.avatar}) center/cover` : COLORS.primaryDark,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: compact ? 15 : 18,
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
              {!compact && meet.locationName && ` · 📍 ${meet.locationName}`}
              {meet.confirmedDate && ` · ${meet.confirmedDate}`}
            </div>
          </div>

          {/* right info */}
          {!compact && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {meet.messageCount > 0 && (
                <div style={{ fontSize: 11, color: COLORS.primary, background: COLORS.primaryLight, borderRadius: 10, padding: '2px 8px', marginBottom: 4 }}>
                  💬 {meet.messageCount}
                </div>
              )}
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatDate(meet.updatedAt)}</div>
            </div>
          )}
        </div>
      );
    });
  }

  function renderPreviewPanel() {
    const selected = meets.find(m => m.id === selectedId);
    if (!selected) {
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
          <div style={{ fontSize: 16, color: COLORS.textMuted }}>약속을 선택하세요</div>
        </div>
      );
    }
    const other = getOther(selected);
    const status = STATUS_LABELS[selected.status] || STATUS_LABELS.PENDING;
    return (
      <div style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: other.avatar ? `url(${other.avatar}) center/cover` : COLORS.primaryDark,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 24,
          }}>
            {!other.avatar && (other.name?.[0] || '?')}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>{other.name}</div>
            <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 20, background: status.bg, color: status.color }}>
              {status.label}
            </span>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: '20px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: COLORS.text }}>
          {selected.confirmedDate && (
            <div>확정 날짜: {selected.confirmedDate}{selected.confirmedTime ? ` ${selected.confirmedTime}` : ''}</div>
          )}
          {selected.locationName && <div>장소: {selected.locationName}</div>}
          {selected.messageCount > 0 && (
            <div style={{ color: COLORS.textSecondary }}>메시지 {selected.messageCount}개</div>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: '20px 0' }} />

        <Button variant="secondary" onClick={() => navigate(`/meets/${selected.id}`)}>
          채팅으로 이동 →
        </Button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: isDesktop ? 0 : 80 }}>
      {isDesktop ? (
        <div style={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 60px)' }}>
          {/* left panel */}
          <div style={{ width: 320, flexShrink: 0, borderRight: `1px solid ${COLORS.border}`, overflowY: 'auto', background: COLORS.surface, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 16px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h1 style={{ color: COLORS.text, fontSize: 18, fontWeight: 700, margin: 0 }}>약속</h1>
                <button onClick={() => setShowModal(true)} style={{ ...newBtnStyle, padding: '6px 12px', fontSize: 12 }}>
                  + 새 약속
                </button>
              </div>
              {renderTabs(true)}
            </div>
            <div style={{ padding: '0 12px 12px' }}>
              {renderList(true)}
            </div>
          </div>

          {/* right preview panel */}
          <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: COLORS.bg }}>
            {renderPreviewPanel()}
          </div>
        </div>
      ) : (
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

          {renderTabs(false)}
          {renderList(false)}
        </div>
      )}

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
