import React from 'react';
import { COLORS } from '../../constants/colors';

export default function TimeSlotPicker({ slots = [], bookedSlots = [], selectedTime, onSelect }) {
  if (slots.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0', color: COLORS.textMuted, fontSize: 13 }}>
        이 날짜에 예약 가능한 시간이 없습니다.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>시간 선택</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {slots.map(time => {
          const isBooked = bookedSlots.includes(time);
          const isSelected = selectedTime === time;

          return (
            <div key={time} style={{ position: 'relative' }}>
              <button
                onClick={() => !isBooked && onSelect(time)}
                disabled={isBooked}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: `1.5px solid ${isSelected ? COLORS.primary : isBooked ? COLORS.border : COLORS.border}`,
                  background: isSelected ? COLORS.primary : isBooked ? COLORS.surfaceDim : COLORS.surface,
                  color: isSelected ? '#fff' : isBooked ? COLORS.textMuted : COLORS.text,
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 400,
                  cursor: isBooked ? 'not-allowed' : 'pointer',
                  opacity: isBooked ? 0.6 : 1,
                  position: 'relative',
                  transition: 'all 0.15s',
                }}
              >
                {time}
                {isBooked && (
                  <span style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: COLORS.textMuted,
                    borderRadius: 20,
                    background: 'rgba(255,255,255,0.75)',
                  }}>
                    마감
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
