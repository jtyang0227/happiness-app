import { useState } from 'react';

const COLORS = {
  mine: '#5b6ef5',
  theirs: '#a78bfa',
  overlap: '#10b981',
  past: '#2a2a3e',
  today: '#4458e0',
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function MeetCalendar({ myDates = [], theirDates = [], onToggle, readOnly = false }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

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

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = `${viewYear}년 ${viewMonth + 1}월`;

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

          return (
            <div
              key={dateStr}
              onClick={() => !isPast && !readOnly && onToggle && onToggle(dateStr)}
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
                cursor: isPast || readOnly ? 'default' : 'pointer',
                transition: 'opacity 0.15s',
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
