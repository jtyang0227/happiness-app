import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import useAuthStore from '../store/authStore';
import { loadScheduleEvents, TYPE_META } from '../utils/scheduleEvents';
import DotEmptyState from '../components/common/DotEmptyState';
import UnifiedCalendar from '../components/calendar/UnifiedCalendar';
import WorkspaceTabs from '../components/workspace/WorkspaceTabs';

/* ── 통합 일정 한 줄 ─────────────────────────────── */
function DayEventRow({ event, onClick, index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const meta = TYPE_META[event.type];
  return (
    <div
      onClick={() => onClick(event)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
        background: hovered ? COLORS.surfaceDim : COLORS.surface,
        border: `1px solid ${hovered ? COLORS.textHint : COLORS.border}`,
        transition: 'background-color 0.12s ease, border-color 0.12s ease',
        animation: 'fadeInUp 0.25s ease-out both',
        animationDelay: `${Math.min(index, 6) * 40}ms`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>
          {event.title}
        </div>
        {event.time && (
          <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
            ⏰ {event.time}
          </div>
        )}
        {event.subtitle && (
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
            {event.subtitle}
          </div>
        )}
      </div>
      <span style={{
        padding: '3px 9px', borderRadius: 99, flexShrink: 0,
        background: meta.bg, color: meta.color,
        fontSize: 11, fontWeight: 700,
      }}>
        {meta.label}
      </span>
      <span style={{ fontSize: 13, color: COLORS.primary, fontWeight: 700, flexShrink: 0 }}>
        →
      </span>
    </div>
  );
}

/* ── IntegratedCalendarPage ─────────────────────────────── */
export default function IntegratedCalendarPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partialError, setPartialError] = useState('');

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPartialError('');

    loadScheduleEvents(currentUser?.id).then(({ events: merged, failedLabels }) => {
      if (cancelled) return;
      setEvents(merged);
      if (failedLabels.length > 0) {
        setPartialError(`${failedLabels.join('·')} 일정을 불러오지 못했습니다. 나머지 일정은 정상 표시됩니다.`);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const byDate = useMemo(() => {
    const map = {};
    for (const ev of events) {
      if (!map[ev.dateKey]) map[ev.dateKey] = [];
      map[ev.dateKey].push({ ...ev, dotColor: TYPE_META[ev.type].dot });
    }
    return map;
  }, [events]);

  function handleChangeMonth(y, m) {
    setSelectedDate(null);
    setViewYear(y);
    setViewMonth(m);
  }
  function handleSelectDate(dateStr) {
    setSelectedDate(prev => prev === dateStr ? null : dateStr);
  }
  function handleEventClick(event) {
    navigate(event.path);
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
      <WorkspaceTabs />
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 20px' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: COLORS.text }}>
            📅 통합 일정
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted }}>
            촬영 예약·약속·모임을 한 곳에서 확인하세요
          </p>
        </div>

        {/* 범례 */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_META).map(([key, meta]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{meta.label}</span>
            </div>
          ))}
        </div>

        {partialError && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 16,
            background: '#FFF6E5', color: '#B45309', fontSize: 13,
          }}>
            {partialError}
          </div>
        )}

        <UnifiedCalendar
          viewYear={viewYear}
          viewMonth={viewMonth}
          onChangeMonth={handleChangeMonth}
          eventsByDate={byDate}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          loading={loading}
          emptyDayMessage="이 날짜에는 일정이 없습니다"
          emptyStateNode={
            <DotEmptyState
              theme="light"
              icon="📅"
              title="예정된 일정이 없어요"
              description="확정된 예약·약속·모임이 여기에 표시됩니다."
            />
          }
          renderItem={(ev, i) => (
            <DayEventRow event={ev} onClick={handleEventClick} index={i} />
          )}
        />
      </div>
    </div>
  );
}
