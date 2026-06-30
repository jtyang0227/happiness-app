import { useState } from 'react';
import MeetCalendar from './MeetCalendar';
import MeetLocationPicker from './MeetLocationPicker';
import meetApi from '../../services/meetApi';

const STEPS = ['날짜 선택', '장소 선택', '메시지'];

export default function MeetRequestModal({ receiverId, receiverName, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [selectedDates, setSelectedDates] = useState([]);
  const [location, setLocation] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleDate(dateStr) {
    setSelectedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const meet = await meetApi.create({
        receiverId,
        proposedDates: selectedDates,
        locationName: location.locationName || null,
        locationAddress: location.locationAddress || null,
        locationLat: location.locationLat || null,
        locationLng: location.locationLng || null,
        initialMessage: message,
      });
      onCreated && onCreated(meet);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || '약속 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>약속 요청</div>
            <div style={{ color: '#9090b0', fontSize: 12, marginTop: 2 }}>→ {receiverName}</div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* step indicator */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
          {STEPS.map((label, i) => (
            <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: i <= step ? '#5b6ef5' : 'rgba(255,255,255,0.08)',
                  border: i === step ? '2px solid #a78bfa' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: i <= step ? '#fff' : '#5c5c7a', fontWeight: 600,
                  transition: 'all 0.2s',
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: 10, color: i === step ? '#a78bfa' : '#5c5c7a', marginTop: 4, whiteSpace: 'nowrap' }}>{label}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ height: 2, flex: 1, background: i < step ? '#5b6ef5' : 'rgba(255,255,255,0.08)', margin: '0 4px', marginBottom: 16, transition: 'background 0.2s' }} />
              )}
            </div>
          ))}
        </div>

        {/* step content */}
        <div style={{ minHeight: 300 }}>
          {step === 0 && (
            <div>
              <div style={{ color: '#ccc', fontSize: 13, marginBottom: 14 }}>
                만날 수 있는 날을 모두 선택하세요.
                <span style={{ color: '#5b6ef5', marginLeft: 8 }}>{selectedDates.length}일 선택됨</span>
              </div>
              <MeetCalendar
                myDates={selectedDates}
                onToggle={toggleDate}
                meetInfo={{
                  myName: '나',
                  theirName: receiverName,
                  locationName: location.locationName,
                  locationAddress: location.locationAddress,
                }}
              />
            </div>
          )}

          {step === 1 && (
            <div>
              <div style={{ color: '#ccc', fontSize: 13, marginBottom: 14 }}>장소를 검색하거나 직접 입력하세요.</div>
              <MeetLocationPicker value={location} onChange={setLocation} />
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ color: '#ccc', fontSize: 13, marginBottom: 14 }}>첫 메시지를 남겨보세요.</div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`안녕하세요 ${receiverName}님, 약속을 제안드립니다!`}
                rows={5}
                maxLength={500}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: 13,
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ textAlign: 'right', fontSize: 11, color: '#5c5c7a', marginTop: 4 }}>{message.length}/500</div>

              {/* summary */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 16px', marginTop: 16 }}>
                <div style={{ fontSize: 11, color: '#9090b0', marginBottom: 8 }}>요약</div>
                <div style={{ color: '#ccc', fontSize: 12, lineHeight: 1.8 }}>
                  <div>📅 가능 날짜: {selectedDates.length > 0 ? selectedDates.slice(0, 3).join(', ') + (selectedDates.length > 3 ? ` 외 ${selectedDates.length - 3}일` : '') : '미선택'}</div>
                  <div>📍 장소: {location.locationName || '미선택'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <div style={{ color: '#f87171', fontSize: 12, margin: '12px 0' }}>{error}</div>}

        {/* footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            style={secondaryBtnStyle}
          >
            {step === 0 ? '취소' : '이전'}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} style={primaryBtnStyle}>
              다음 →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtnStyle, opacity: loading ? 0.6 : 1 }}>
              {loading ? '전송 중…' : '약속 요청 보내기 💌'}
            </button>
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
  background: '#12122a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
  padding: 28,
  width: '100%',
  maxWidth: 480,
  maxHeight: '90vh',
  overflowY: 'auto',
};

const closeBtnStyle = {
  background: 'none', border: 'none', color: '#9090b0',
  fontSize: 18, cursor: 'pointer', padding: 4,
};

const primaryBtnStyle = {
  background: '#5b6ef5', border: 'none', borderRadius: 10,
  color: '#fff', padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
};

const secondaryBtnStyle = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10, color: '#ccc', padding: '10px 20px', cursor: 'pointer', fontSize: 14,
};
