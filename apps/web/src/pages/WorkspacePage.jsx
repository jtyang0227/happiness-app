import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { inquiryApi } from '../services/api';
import { bookingApi } from '../services/bookingApi';
import meetApi from '../services/meetApi';
import { deliveryApi } from '../services/deliveryApi';
import WorkspaceTabs from '../components/workspace/WorkspaceTabs';
import { loadScheduleEvents, TYPE_META } from '../utils/scheduleEvents';

/**
 * 업무 — 한눈에 (/workspace, 인증). PLANNING_nav-consolidation.md 2.3.
 * 문의·예약·수금·납품·약속에서 "지금 처리할 것"의 수를 모으고, 다가오는 7일 일정을 통합 달력과 같은 규칙으로 보여준다.
 * 신규 백엔드 없이 기존 API를 병렬 호출 — 하나가 실패해도 나머지 카드는 보이고 실패한 카드만 "—".
 */
const DAYS_AHEAD = 7;

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(key, todayKey, tomorrowKey) {
  if (key === todayKey) return '오늘';
  if (key === tomorrowKey) return '내일';
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}월 ${d}일 (${'일월화수목금토'[date.getDay()]})`;
}

function SummaryCard({ icon, label, value, to, hint }) {
  const loaded = value !== undefined;
  const active = typeof value === 'number' && value > 0;
  return (
    <Link to={to} className="ws-card" style={{
      display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 18px', borderRadius: 14, textDecoration: 'none',
      background: COLORS.surface, border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
    }}>
      <span style={{ fontSize: 13, color: COLORS.textMuted }}><span aria-hidden="true">{icon} </span>{label}</span>
      {loaded ? (
        <span style={{ fontSize: 28, fontWeight: 800, color: active ? COLORS.text : COLORS.textHint, fontVariantNumeric: 'tabular-nums' }}>
          {value === null ? '—' : value}
        </span>
      ) : (
        <span aria-hidden="true" style={{ width: 48, height: 32, borderRadius: 8, background: COLORS.border, animation: 'pulse 1.4s ease-in-out infinite' }} />
      )}
      <span style={{ fontSize: 12, color: value === null ? COLORS.danger : COLORS.primary, fontWeight: 600 }}>
        {value === null ? '불러오지 못했어요' : hint}
      </span>
    </Link>
  );
}

export default function WorkspacePage() {
  const { user } = useAuth();
  // undefined = 로딩 중, null = 실패, number = 값
  const [counts, setCounts] = useState({});
  const [events, setEvents] = useState(null);
  const [scheduleError, setScheduleError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const num = (r, pick) => (r.status === 'fulfilled' ? pick(r.value) : null);
    Promise.allSettled([
      inquiryApi.getUnreadCount(user.id),
      bookingApi.getMyBookings('REQUESTED'),
      bookingApi.getMyBookings('CONFIRMED'),
      deliveryApi.getMyList(),
      meetApi.getPendingCount(),
    ]).then(([inq, requested, confirmed, deliveries, meets]) => {
      if (!alive) return;
      setCounts({
        inquiry: num(inq, v => (typeof v === 'number' ? v : v?.count ?? 0)),
        bookingRequests: num(requested, v => (Array.isArray(v) ? v.length : 0)),
        unpaid: num(confirmed, v => (Array.isArray(v) ? v : [])
          .filter(b => b.depositStatus === 'PENDING' || b.balanceStatus === 'PENDING').length),
        deliveriesWaiting: num(deliveries, v => (Array.isArray(v) ? v : [])
          .filter(d => d.status === 'PENDING' || d.status === 'REVIEWED').length),
        meets: num(meets, v => v || 0),
      });
    });
    loadScheduleEvents(user.id).then(({ events: all, failedLabels }) => {
      if (!alive) return;
      const start = new Date();
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + DAYS_AHEAD - 1);
      const from = ymd(start);
      const to = ymd(end);
      setEvents(all.filter(e => e.dateKey >= from && e.dateKey <= to)
        .sort((a, b) => (a.dateKey + (a.time || '')).localeCompare(b.dateKey + (b.time || ''))));
      if (failedLabels.length) setScheduleError(`${failedLabels.join('·')} 일정을 불러오지 못했어요.`);
    });
    return () => { alive = false; };
  }, [user?.id]);

  const today = new Date();
  const todayKey = ymd(today);
  const tomorrowKey = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  const grouped = (events || []).reduce((acc, e) => {
    (acc[e.dateKey] = acc[e.dateKey] || []).push(e);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
      <WorkspaceTabs />
      <style>{`
        .ws-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .ws-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
        .ws-card:focus-visible, .ws-event:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
        .ws-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        @media (max-width: 1023px) { .ws-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 599px)  { .ws-grid { grid-template-columns: repeat(2, 1fr); } }
        .ws-event { transition: background 0.12s ease; }
        .ws-event:hover { background: ${COLORS.surfaceDim}; }
        @media (prefers-reduced-motion: reduce) { .ws-card, .ws-card:hover { transition: none; transform: none; } }
      `}</style>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 16px' }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: COLORS.text }}>업무</h1>
        <p style={{ margin: '6px 0 20px', fontSize: 14, color: COLORS.textMuted }}>오늘 처리할 일을 모아 봤어요</p>

        <div className="ws-grid">
          <SummaryCard icon="✉" label="새 문의" value={counts.inquiry} to="/inbox" hint="문의 확인하기 →" />
          <SummaryCard icon="📥" label="예약 요청" value={counts.bookingRequests} to="/bookings" hint="확정·거절하기 →" />
          <SummaryCard icon="💰" label="미수금 예약" value={counts.unpaid} to="/bookings" hint="수금 확인하기 →" />
          <SummaryCard icon="📦" label="고객 확인 대기 납품" value={counts.deliveriesWaiting} to="/deliveries" hint="납품 보기 →" />
          <SummaryCard icon="🤝" label="응답 대기 약속" value={counts.meets} to="/meets" hint="약속 보기 →" />
        </div>

        <section aria-labelledby="ws-upcoming" style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <h2 id="ws-upcoming" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: COLORS.text }}>다가오는 7일</h2>
            <Link to="/calendar" style={{ fontSize: 13, color: COLORS.primary, fontWeight: 600, textDecoration: 'none' }}>통합 달력 보기 →</Link>
          </div>
          {scheduleError && <div role="alert" style={{ fontSize: 13, color: COLORS.danger, marginBottom: 10 }}>{scheduleError}</div>}
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: '6px 0' }}>
            {events === null ? (
              [0, 1, 2].map(i => (
                <div key={i} aria-hidden="true" style={{ margin: '10px 16px', height: 20, borderRadius: 6, background: COLORS.border, animation: 'pulse 1.4s ease-in-out infinite' }} />
              ))
            ) : events.length === 0 ? (
              <p style={{ margin: 0, padding: '24px 16px', fontSize: 14, color: COLORS.textMuted, textAlign: 'center' }}>
                7일 안에 잡힌 일정이 없어요
              </p>
            ) : Object.entries(grouped).map(([key, list]) => (
              <div key={key}>
                <div style={{ padding: '10px 16px 4px', fontSize: 12, fontWeight: 700, color: key === todayKey ? COLORS.primary : COLORS.textMuted }}>
                  {dayLabel(key, todayKey, tomorrowKey)}
                </div>
                {list.map(e => (
                  <Link key={e.id} to={e.path} className="ws-event" style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', textDecoration: 'none', color: COLORS.text,
                  }}>
                    <span aria-label={TYPE_META[e.type].label} style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_META[e.type].dot, flexShrink: 0 }} />
                    <span style={{ width: 48, fontSize: 13, color: COLORS.textSecondary, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{e.time || '종일'}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                    {e.subtitle && <span style={{ fontSize: 12, color: COLORS.textMuted, flexShrink: 0 }}>{e.subtitle}</span>}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
