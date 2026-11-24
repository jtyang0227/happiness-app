import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import gatheringApi from '../services/gatheringApi';
import DotEmptyState from '../components/common/DotEmptyState';
import UnifiedCalendar, { dateKeyOf } from '../components/calendar/UnifiedCalendar';

const STATUS_META = {
  RECRUITING:          { label: '모집중',   bg: COLORS.primaryLight, color: COLORS.primary },
  RECRUITMENT_CLOSED:  { label: '모집마감', bg: COLORS.surfaceDim,   color: COLORS.textMuted },
  SCHEDULED:           { label: '예정됨',  bg: COLORS.successTonal,  color: COLORS.success },
  ONGOING:             { label: '진행중',   bg: '#FFF6E5',            color: '#B45309' },
  ENDED:               { label: '종료됨',  bg: COLORS.surfaceDim,    color: COLORS.textMuted },
};

function formatTimeRange(startIso, endIso) {
  const opts = { hour: '2-digit', minute: '2-digit' };
  const s = new Date(startIso).toLocaleTimeString('ko-KR', opts);
  const e = endIso ? new Date(endIso).toLocaleTimeString('ko-KR', opts) : null;
  return e ? `${s} ~ ${e}` : s;
}

/* ── 날짜별 모임 목록 카드 ─────────────────────────────── */
function DayGatheringRow({ gathering, onClick, index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const statusMeta = STATUS_META[gathering.status] || STATUS_META.RECRUITING;
  return (
    <div
      onClick={() => onClick(gathering.id)}
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
          {gathering.title}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
          ⏰ {formatTimeRange(gathering.startDateTime, gathering.endDateTime)}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
          👥 참여자 {gathering.participantCount}명
        </div>
      </div>
      <span style={{
        padding: '3px 9px', borderRadius: 99, flexShrink: 0,
        background: statusMeta.bg, color: statusMeta.color,
        fontSize: 11, fontWeight: 700,
      }}>
        {statusMeta.label}
      </span>
      <span style={{ fontSize: 13, color: COLORS.primary, fontWeight: 700, flexShrink: 0 }}>
        →
      </span>
    </div>
  );
}

/* ── GatheringCalendarPage ─────────────────────────────── */
export default function GatheringCalendarPage() {
  const navigate = useNavigate();

  const [gatherings, setGatherings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    setLoading(true);
    gatheringApi.getMy()
      .then(data => setGatherings(Array.isArray(data) ? data : data?.data || []))
      .catch(() => setError('모임 일정을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  // 날짜(YYYY-MM-DD) -> 그 날 시작하는 모임 목록 (UnifiedCalendar 이벤트 형식)
  const byDate = useMemo(() => {
    const map = {};
    for (const g of gatherings) {
      const key = dateKeyOf(g.startDateTime);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push({ id: g.id, dotColor: COLORS.primary, gathering: g });
    }
    return map;
  }, [gatherings]);

  function handleChangeMonth(y, m) {
    setSelectedDate(null);
    setViewYear(y);
    setViewMonth(m);
  }
  function handleSelectDate(dateStr) {
    setSelectedDate(prev => prev === dateStr ? null : dateStr);
  }
  const handleGatheringClick = (id) => navigate(`/gatherings/${id}`);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 20px' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => navigate('/gatherings')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: COLORS.textSecondary, padding: 4, lineHeight: 1 }}
            aria-label="뒤로가기"
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>
            모임 달력
          </h1>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 16,
            background: COLORS.dangerTonal, color: COLORS.danger, fontSize: 14,
          }}>
            {error}
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
          emptyDayMessage="이 날짜에는 모임이 없습니다"
          emptyStateNode={
            <DotEmptyState
              theme="light"
              icon="📅"
              title="참여 중인 모임이 없어요"
              description="날짜를 눌러 그날의 모임을 확인할 수 있어요."
            />
          }
          renderItem={(ev, i) => (
            <DayGatheringRow gathering={ev.gathering} onClick={handleGatheringClick} index={i} />
          )}
        />
      </div>
    </div>
  );
}
