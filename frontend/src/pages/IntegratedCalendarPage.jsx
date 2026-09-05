import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import useAuthStore from '../store/authStore';
import { bookingApi } from '../services/bookingApi';
import meetApi from '../services/meetApi';
import gatheringApi from '../services/gatheringApi';
import DotEmptyState from '../components/common/DotEmptyState';
import UnifiedCalendar, { dateKeyOf } from '../components/calendar/UnifiedCalendar';

const TYPE_META = {
  booking:   { label: '예약',  bg: COLORS.primaryLight, color: COLORS.primary,  dot: COLORS.primary },
  meet:      { label: '약속',  bg: COLORS.successTonal, color: COLORS.success,  dot: COLORS.success },
  gathering: { label: '모임',  bg: '#FFF6E5',           color: '#B45309',       dot: '#B45309' },
};

function formatTime(t) {
  return t || '';
}

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

    Promise.allSettled([
      bookingApi.getMyBookings('CONFIRMED'),
      meetApi.list(),
      gatheringApi.getMy(),
    ]).then(([bookingResult, meetResult, gatheringResult]) => {
      if (cancelled) return;
      const failedLabels = [];
      const merged = [];

      if (bookingResult.status === 'fulfilled') {
        const bookings = Array.isArray(bookingResult.value) ? bookingResult.value : [];
        for (const b of bookings) {
          const key = dateKeyOf(b.shootDate);
          if (!key) continue;
          merged.push({
            id: `booking-${b.id}`,
            type: 'booking',
            dateKey: key,
            title: b.clientName ? `${b.clientName} 촬영` : '촬영 예약',
            time: formatTime(b.shootTime),
            subtitle: b.shootType || null,
            path: '/bookings',
          });
        }
      } else {
        failedLabels.push('예약');
      }

      if (meetResult.status === 'fulfilled') {
        const meets = Array.isArray(meetResult.value) ? meetResult.value : [];
        for (const m of meets) {
          if (m.status !== 'CONFIRMED') continue;
          const key = dateKeyOf(m.confirmedDate);
          if (!key) continue;
          const isRequester = m.requesterId === currentUser?.id;
          const counterpartName = isRequester ? m.receiverName : m.requesterName;
          merged.push({
            id: `meet-${m.id}`,
            type: 'meet',
            dateKey: key,
            title: counterpartName ? `${counterpartName}님과 약속` : '약속',
            time: formatTime(m.confirmedTime),
            subtitle: m.locationName || null,
            path: `/meets/${m.id}`,
          });
        }
      } else {
        failedLabels.push('약속');
      }

      if (gatheringResult.status === 'fulfilled') {
        const raw = gatheringResult.value;
        const gatherings = Array.isArray(raw) ? raw : raw?.data || [];
        for (const g of gatherings) {
          if (g.status !== 'SCHEDULED' && g.status !== 'ONGOING') continue;
          const key = dateKeyOf(g.startDateTime);
          if (!key) continue;
          const timeLabel = new Date(g.startDateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
          merged.push({
            id: `gathering-${g.id}`,
            type: 'gathering',
            dateKey: key,
            title: g.title,
            time: timeLabel,
            subtitle: `참여자 ${g.participantCount}명`,
            path: `/gatherings/${g.id}`,
          });
        }
      } else {
        failedLabels.push('모임');
      }

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
