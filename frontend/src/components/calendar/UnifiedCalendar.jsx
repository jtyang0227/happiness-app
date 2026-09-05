import React from 'react';
import { COLORS } from '../../constants/colors';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "2026-09-20T18:00:00" 또는 "2026-09-20" → "2026-09-20" */
export function dateKeyOf(iso) {
  if (!iso) return null;
  return iso.slice(0, 10);
}

export function formatDateKo(dateKey) {
  if (!dateKey) return '';
  const d = new Date(dateKey + 'T00:00:00');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_LABELS[d.getDay()]})`;
}

/**
 * 월간 달력 + 날짜 클릭 패널 공용 컴포넌트.
 * GatheringCalendarPage(모임 전용)와 IntegratedCalendarPage(통합)에서 재사용된다.
 *
 * eventsByDate: { 'YYYY-MM-DD': Array<{ id, dotColor? }> } — 날짜별 표시할 일정 목록
 * renderItem: (event, index) => JSX — 선택된 날짜 패널의 일정 한 줄
 */
export default function UnifiedCalendar({
  viewYear,
  viewMonth,
  onChangeMonth,
  eventsByDate,
  selectedDate,
  onSelectDate,
  renderItem,
  emptyDayMessage = '이 날짜에는 일정이 없습니다',
  emptyStateNode = null,
  loading = false,
}) {
  const today = new Date();
  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthName = `${viewYear}년 ${viewMonth + 1}월`;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (viewMonth === 0) onChangeMonth(viewYear - 1, 11);
    else onChangeMonth(viewYear, viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) onChangeMonth(viewYear + 1, 0);
    else onChangeMonth(viewYear, viewMonth + 1);
  }

  const hasAnyEvents = Object.keys(eventsByDate).length > 0;
  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  return (
    <div>
      <div style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: 16, padding: 20, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={prevMonth} style={navBtnStyle} aria-label="이전 달">‹</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{monthName}</span>
          <button onClick={nextMonth} style={navBtnStyle} aria-label="다음 달">›</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 12, padding: '4px 0',
              color: i === 0 ? COLORS.danger : i === 6 ? COLORS.primary : COLORS.textMuted,
            }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const dateStr = isoDate(viewYear, viewMonth, day);
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate === dateStr;
            const dayEvents = eventsByDate[dateStr] || [];
            const dotColors = [...new Set(dayEvents.map(e => e.dotColor || COLORS.primary))].slice(0, 3);
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                style={{
                  height: 44, borderRadius: 10, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 3,
                  background: isSelected ? COLORS.primary : hasEvents ? COLORS.primaryLight : 'transparent',
                  border: isToday && !isSelected ? `1.5px solid ${COLORS.primary}` : '1px solid transparent',
                  color: isSelected ? '#fff' : COLORS.text,
                  transition: 'all 0.12s',
                }}
                title={hasEvents ? `${dayEvents.length}개 일정` : ''}
              >
                <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400 }}>{day}</span>
                {hasEvents && (
                  <span style={{ display: 'flex', gap: 2 }}>
                    {dotColors.map((c, i) => (
                      <span key={i} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: isSelected ? '#fff' : c,
                        display: 'inline-block',
                      }} />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate ? (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, margin: '0 0 12px' }}>
            {formatDateKo(selectedDate)}
          </h2>
          {selectedEvents.length === 0 ? (
            <div style={{
              padding: '20px', textAlign: 'center', borderRadius: 12,
              border: `1px dashed ${COLORS.border}`, color: COLORS.textMuted, fontSize: 13,
            }}>
              {emptyDayMessage}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedEvents.map((ev, i) => (
                <React.Fragment key={ev.id}>{renderItem(ev, i)}</React.Fragment>
              ))}
            </div>
          )}
        </div>
      ) : !loading && !hasAnyEvents && emptyStateNode ? (
        emptyStateNode
      ) : (
        <div style={{ textAlign: 'center', fontSize: 13, color: COLORS.textMuted, padding: '12px 0' }}>
          {loading ? '불러오는 중...' : '날짜를 눌러 그날의 일정을 확인하세요'}
        </div>
      )}
    </div>
  );
}

const navBtnStyle = {
  background: COLORS.surfaceDim,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  color: COLORS.text,
  width: 32, height: 32,
  cursor: 'pointer',
  fontSize: 18,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
