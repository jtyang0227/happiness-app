import React from 'react';
import { COLORS } from '../../constants/colors';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function BookingCalendar({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  availableDates = new Set(),
  bookedSlots = {},
  selectedDate,
  onSelectDate,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=Sun

  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  const formatDate = (d) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          onClick={onPrevMonth}
          style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${COLORS.border}`, background: COLORS.surface, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="이전 달"
        >
          ◀
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>
          {year}년 {month}월
        </div>
        <button
          onClick={onNextMonth}
          style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${COLORS.border}`, background: COLORS.surface, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="다음 달"
        >
          ▶
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{
            textAlign: 'center', fontSize: 11, fontWeight: 600,
            color: i === 0 ? COLORS.danger : i === 6 ? COLORS.primary : COLORS.textMuted,
            padding: '4px 0',
          }}>
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (d === null) {
            return <div key={`empty-${i}`} />;
          }

          const dateStr = formatDate(d);
          const dateObj = new Date(year, month - 1, d);
          dateObj.setHours(0, 0, 0, 0);

          const isPast = dateObj <= today;
          const isToday = dateObj.getTime() === today.getTime();
          const isAvailable = availableDates.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const isUnavailable = isPast || !isAvailable;
          const weekdayIdx = dateObj.getDay();
          const isWeekend = weekdayIdx === 0 || weekdayIdx === 6;

          return (
            <div
              key={d}
              onClick={() => !isUnavailable && onSelectDate(dateStr)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '4px 2px',
                cursor: isUnavailable ? 'not-allowed' : 'pointer',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: isSelected || isToday ? 700 : 400,
                background: isSelected ? COLORS.primary : 'transparent',
                color: isSelected
                  ? '#fff'
                  : isUnavailable
                  ? COLORS.textMuted
                  : isWeekend
                  ? (weekdayIdx === 0 ? COLORS.danger : COLORS.primary)
                  : COLORS.text,
                opacity: isUnavailable ? 0.4 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => {
                if (!isUnavailable && !isSelected) e.currentTarget.style.background = COLORS.primaryLight;
              }}
              onMouseLeave={e => {
                if (!isSelected) e.currentTarget.style.background = 'transparent';
              }}
              >
                {d}
              </div>
              {/* Today dot */}
              {isToday && !isSelected && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: COLORS.primary, marginTop: 1 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
