import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import gatheringApi from '../services/gatheringApi';
import DotEmptyState from '../components/common/DotEmptyState';

const STATUS_META = {
  RECRUITING:          { label: '모집중',   bg: COLORS.primaryLight, color: COLORS.primary },
  RECRUITMENT_CLOSED:  { label: '모집마감', bg: COLORS.surfaceDim,   color: COLORS.textMuted },
  SCHEDULED:           { label: '예정됨',  bg: COLORS.successTonal,  color: COLORS.success },
  ONGOING:             { label: '진행중',   bg: '#FFF6E5',            color: '#B45309' },
  ENDED:               { label: '종료됨',  bg: COLORS.surfaceDim,    color: COLORS.textMuted },
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dateKeyOf(iso) {
  if (!iso) return null;
  return iso.slice(0, 10); // "2026-09-20T18:00:00" -> "2026-09-20"
}

function formatTimeRange(startIso, endIso) {
  const opts = { hour: '2-digit', minute: '2-digit' };
  const s = new Date(startIso).toLocaleTimeString('ko-KR', opts);
  const e = endIso ? new Date(endIso).toLocaleTimeString('ko-KR', opts) : null;
  return e ? `${s} ~ ${e}` : s;
}

function formatDateKo(dateKey) {
  if (!dateKey) return '';
  const d = new Date(dateKey + 'T00:00:00');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_LABELS[d.getDay()]})`;
}

/* ── 날짜별 모임 목록 카드 ─────────────────────────────── */
function DayGatheringRow({ gathering, onClick }) {
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
        transition: 'all 0.12s ease',
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

  // 날짜(YYYY-MM-DD) -> 그 날 시작하는 모임 목록
  const byDate = useMemo(() => {
    const map = {};
    for (const g of gatherings) {
      const key = dateKeyOf(g.startDateTime);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(g);
    }
    return map;
  }, [gatherings]);

  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthName = `${viewYear}년 ${viewMonth + 1}월`;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    setSelectedDate(null);
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    setSelectedDate(null);
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const selectedGatherings = selectedDate ? (byDate[selectedDate] || []) : [];
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

        {/* 달력 카드 */}
        <div style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 16, padding: 20, marginBottom: 20,
        }}>
          {/* 월 이동 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={prevMonth} style={navBtnStyle}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{monthName}</span>
            <button onClick={nextMonth} style={navBtnStyle}>›</button>
          </div>

          {/* 요일 라벨 */}
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

          {/* 날짜 셀 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const dateStr = isoDate(viewYear, viewMonth, day);
              const isToday = dateStr === todayStr;
              const isSelected = selectedDate === dateStr;
              const dayGatherings = byDate[dateStr] || [];
              const hasGathering = dayGatherings.length > 0;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(prev => prev === dateStr ? null : dateStr)}
                  style={{
                    height: 44, borderRadius: 10, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 3,
                    background: isSelected ? COLORS.primary : hasGathering ? COLORS.primaryLight : 'transparent',
                    border: isToday && !isSelected ? `1.5px solid ${COLORS.primary}` : '1px solid transparent',
                    color: isSelected ? '#fff' : COLORS.text,
                    transition: 'all 0.12s',
                  }}
                  title={hasGathering ? `${dayGatherings.length}개 모임` : ''}
                >
                  <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400 }}>{day}</span>
                  {hasGathering && (
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: isSelected ? '#fff' : COLORS.primary,
                      display: 'inline-block',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 선택한 날짜의 모임 목록 */}
        {selectedDate ? (
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, margin: '0 0 12px' }}>
              {formatDateKo(selectedDate)}
            </h2>
            {selectedGatherings.length === 0 ? (
              <div style={{
                padding: '20px', textAlign: 'center', borderRadius: 12,
                border: `1px dashed ${COLORS.border}`, color: COLORS.textMuted, fontSize: 13,
              }}>
                이 날짜에는 모임이 없습니다
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedGatherings.map(g => (
                  <DayGatheringRow key={g.id} gathering={g} onClick={handleGatheringClick} />
                ))}
              </div>
            )}
          </div>
        ) : !loading && gatherings.length === 0 ? (
          <DotEmptyState
            theme="light"
            icon="📅"
            title="참여 중인 모임이 없어요"
            description="날짜를 눌러 그날의 모임을 확인할 수 있어요."
          />
        ) : (
          <div style={{ textAlign: 'center', fontSize: 13, color: COLORS.textMuted, padding: '12px 0' }}>
            {loading ? '불러오는 중...' : '날짜를 눌러 그날의 모임을 확인하세요'}
          </div>
        )}
      </div>
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
