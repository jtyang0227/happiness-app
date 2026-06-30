import { useState } from 'react';

const COLORS = {
  mine: '#5b6ef5',
  theirs: '#a78bfa',
  overlap: '#10b981',
  past: '#2a2a3e',
  today: '#4458e0',
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDateKo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KO[d.getDay()]})`;
}

export default function MeetCalendar({
  myDates = [],
  theirDates = [],
  onToggle,
  readOnly = false,
  meetInfo = null,
  // meetInfo: { myName, theirName, locationName, locationAddress, confirmedDate, confirmedTime }
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  const mySet = new Set(myDates);
  const theirSet = new Set(theirDates);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function handleDayClick(dateStr, isPast) {
    if (isPast) return;
    setSelectedDate(prev => prev === dateStr ? null : dateStr);
    if (!readOnly && onToggle) onToggle(dateStr);
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = `${viewYear}년 ${viewMonth + 1}월`;

  // Memo panel data
  const memoDate = selectedDate;
  const memoHasMine = memoDate ? mySet.has(memoDate) : false;
  const memoHasTheirs = memoDate ? theirSet.has(memoDate) : false;
  const isConfirmedDay = meetInfo?.confirmedDate && memoDate === meetInfo.confirmedDate;

  return (
    <div style={{ userSelect: 'none' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={navBtnStyle}>‹</button>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{monthName}</span>
        <button onClick={nextMonth} style={navBtnStyle}>›</button>
      </div>

      {/* day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAY_LABELS.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : '#9090b0', padding: '2px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const dateStr = isoDate(viewYear, viewMonth, day);
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;
          const hasMine = mySet.has(dateStr);
          const hasTheirs = theirSet.has(dateStr);
          const isOverlap = hasMine && hasTheirs;
          const isSelected = selectedDate === dateStr;

          let bg = 'transparent';
          let color = isPast ? '#4a4a6a' : '#ccc';
          let border = '1px solid transparent';

          if (isPast) {
            bg = COLORS.past;
            color = '#4a4a6a';
          } else if (isOverlap) {
            bg = COLORS.overlap;
            color = '#fff';
            border = `1px solid ${COLORS.overlap}`;
          } else if (hasMine) {
            bg = COLORS.mine;
            color = '#fff';
            border = `1px solid ${COLORS.mine}`;
          } else if (hasTheirs) {
            bg = COLORS.theirs;
            color = '#fff';
            border = `1px solid ${COLORS.theirs}`;
          } else if (isToday) {
            border = `1px solid ${COLORS.today}`;
            color = '#fff';
          }

          if (isSelected) {
            border = '2px solid #fff';
          }

          return (
            <div
              key={dateStr}
              onClick={() => handleDayClick(dateStr, isPast)}
              style={{
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                background: bg,
                border,
                color,
                fontSize: 13,
                cursor: isPast ? 'default' : 'pointer',
                transition: 'all 0.12s',
                boxShadow: isSelected ? '0 0 0 2px rgba(255,255,255,0.25)' : 'none',
              }}
              title={isOverlap ? '양측 모두 가능' : hasMine ? '내가 선택한 날' : hasTheirs ? '상대방이 선택한 날' : ''}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        {[
          { color: COLORS.mine, label: '내 가능일' },
          { color: COLORS.theirs, label: '상대 가능일' },
          { color: COLORS.overlap, label: '겹치는 날 ✓' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9090b0' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />
            {label}
          </div>
        ))}
      </div>

      {/* Memo panel — shown when a date is selected */}
      {memoDate && (
        <div style={{
          marginTop: 16,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '14px 16px',
          animation: 'memoFadeIn 0.18s ease',
        }}>
          <style>{`@keyframes memoFadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>

          {/* date header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 15 }}>📋</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{formatDateKo(memoDate)}</span>
            </div>
            {isConfirmedDay && (
              <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.2)', color: '#10b981', borderRadius: 20, padding: '2px 9px', fontWeight: 600 }}>
                ✅ 확정일
              </span>
            )}
            <button
              onClick={() => setSelectedDate(null)}
              style={{ background: 'none', border: 'none', color: '#5c5c7a', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/* participants */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#9090b0', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 7 }}>
              참여 인원
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <MemoParticipantRow
                name={meetInfo?.myName || '나'}
                isMe
                available={memoHasMine}
              />
              {meetInfo?.theirName && (
                <MemoParticipantRow
                  name={meetInfo.theirName}
                  isMe={false}
                  available={memoHasTheirs}
                />
              )}
            </div>
          </div>

          {/* location */}
          {(meetInfo?.locationName || meetInfo?.locationAddress) ? (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 11 }}>
              <div style={{ fontSize: 11, color: '#9090b0', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 7 }}>
                약속 장소
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>📍</span>
                <div>
                  {meetInfo.locationName && (
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{meetInfo.locationName}</div>
                  )}
                  {meetInfo.locationAddress && (
                    <div style={{ color: '#9090b0', fontSize: 12, marginTop: 2 }}>{meetInfo.locationAddress}</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#5c5c7a', fontSize: 12 }}>
                <span>📍</span>
                <span>장소 미정</span>
              </div>
            </div>
          )}

          {/* confirmed time */}
          {isConfirmedDay && meetInfo?.confirmedTime && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 11, marginTop: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 14 }}>⏰</span>
                <span style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>{meetInfo.confirmedTime}</span>
              </div>
            </div>
          )}

          {/* overlap hint */}
          {memoHasMine && memoHasTheirs && (
            <div style={{
              marginTop: 11, borderTop: '1px solid rgba(16,185,129,0.2)', paddingTop: 11,
              background: 'rgba(16,185,129,0.07)', borderRadius: 8, padding: '8px 12px', marginLeft: -4, marginRight: -4,
            }}>
              <div style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>
                ✓ 양측 모두 가능한 날입니다
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MemoParticipantRow({ name, isMe, available }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: isMe ? 'rgba(91,110,245,0.25)' : 'rgba(167,139,250,0.25)',
        border: `1.5px solid ${isMe ? '#5b6ef5' : '#a78bfa'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isMe ? '#5b6ef5' : '#a78bfa', fontSize: 12, fontWeight: 700,
      }}>
        {(name || '?')[0].toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ color: '#e0e0e0', fontSize: 13 }}>{name}</span>
        {isMe && <span style={{ color: '#9090b0', fontSize: 11, marginLeft: 5 }}>(나)</span>}
      </div>
      <span style={{
        fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 600,
        background: available ? 'rgba(16,185,129,0.15)' : 'rgba(144,144,176,0.12)',
        color: available ? '#10b981' : '#9090b0',
      }}>
        {available ? '✓ 가능' : '미표시'}
      </span>
    </div>
  );
}

const navBtnStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  color: '#fff',
  width: 28,
  height: 28,
  cursor: 'pointer',
  fontSize: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
