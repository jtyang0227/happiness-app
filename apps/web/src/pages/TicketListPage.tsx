import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import useServerClock from '../hooks/useServerClock';
import { apiError, OPEN_STATUS_META, ticketApi } from '../services/ticketApi';
import { formatKst, formatRemaining } from '../utils/serverClock';

const STOPPED = ['CANCELLED', 'POSTPONED'];

/** 공연마다 보여 줄 단계 — 다음에 열릴 것, 없으면 마지막 것 */
function pickPhase(phases: any[], now: number) {
  const live = phases.filter((p) => !STOPPED.includes(p.scheduleStatus));
  return live.find((p) => Date.parse(p.scheduledAt) > now) ?? live[live.length - 1] ?? phases[phases.length - 1] ?? null;
}

/**
 * 예매 일정 목록 (/tickets, 공개) — v2. 남은 시간은 서버 기준 시각(useServerClock)으로 1초마다.
 * 0초가 돼도 "예매 진행 중"은 서버가 확인한 상태(OPEN_CONFIRMED)일 때만 표시한다.
 */
export default function TicketListPage() {
  const { user } = useAuth();
  const clock = useServerClock(3);
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [, setTick] = useState(0);

  useEffect(() => {
    ticketApi.sessions().then(setSessions).catch((e) => setError(apiError(e, '예매 일정을 불러오지 못했어요.')));
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const now = clock.now();
  const sorted = (sessions ?? [])
    .map((s) => ({ s, p: pickPhase(s.phases, now ?? Date.now()) }))
    .filter((x) => x.p)
    // 앞으로 열릴 일정을 가까운 순으로 먼저, 지났거나 취소·연기된 일정은 그 아래 최근 순
    .sort((a, b) => {
      const t = now ?? Date.now();
      const ua = !STOPPED.includes(a.p.scheduleStatus) && Date.parse(a.p.scheduledAt) > t;
      const ub = !STOPPED.includes(b.p.scheduleStatus) && Date.parse(b.p.scheduledAt) > t;
      if (ua !== ub) return ua ? -1 : 1;
      const d = Date.parse(a.p.scheduledAt) - Date.parse(b.p.scheduledAt);
      return ua ? d : -d;
    });

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: '0 0 4px' }}>예매 일정</h1>
          <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted }}>시각은 모두 서버 시계 기준이에요 · 기기 시계와 무관</p>
        </div>
        {user && <Link to="/tickets/alerts" style={{ color: COLORS.primary, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>🔔 내 알림</Link>}
      </div>

      {error ? (
        <div role="alert" style={{ background: COLORS.surface, borderRadius: 16, padding: 20, color: COLORS.danger }}>{error}</div>
      ) : sessions === null ? (
        <div aria-busy="true" aria-label="불러오는 중" style={{ display: 'grid', gap: 12 }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ height: 104, borderRadius: 16, background: COLORS.border, animation: 'pulse 1.4s ease-in-out infinite' }} />)}
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '72px 16px', color: COLORS.textSecondary, background: COLORS.surface, borderRadius: 16 }}>
          <div style={{ fontSize: 40 }} aria-hidden>🎫</div>
          <p style={{ fontWeight: 700, color: COLORS.text, margin: '8px 0 4px' }}>예정된 예매 일정이 없어요</p>
          <p style={{ margin: 0, fontSize: 14 }}>새 일정이 등록되면 여기에 보여 드릴게요.</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
          {sorted.map(({ s, p }) => <SessionCard key={s.id} s={s} p={p} now={now} />)}
        </ul>
      )}
    </main>
  );
}

function SessionCard({ s, p, now }: { s: any; p: any; now: number | null }) {
  const [hover, setHover] = useState(false);
  const target = Date.parse(p.scheduledAt);
  const stopped = STOPPED.includes(p.scheduleStatus);
  const left = now === null ? null : target - now;
  const meta = stopped
    ? { label: p.scheduleStatus === 'CANCELLED' ? '취소' : '연기', fg: COLORS.danger, bg: '#FFEEEF' }
    : left !== null && left <= 0 && (p.openStatus === 'SCHEDULED' || p.openStatus === 'UPCOMING') ? OPEN_STATUS_META.OPEN_CHECK_PENDING
    : OPEN_STATUS_META[p.openStatus] ?? OPEN_STATUS_META.UNKNOWN;
  return (
    <li>
      <Link to={`/tickets/${s.id}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ display: 'block', background: hover ? '#F9FAFB' : COLORS.surface, borderRadius: 16, padding: 20, textDecoration: 'none', color: COLORS.text, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: '1 1 260px' }}>
            <div style={{ fontSize: 17, fontWeight: 700, overflowWrap: 'anywhere' }}>{s.title}</div>
            {s.venue && <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>📍 {s.venue}</div>}
            <div style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 8 }}>{p.name} · {formatKst(target).replace(/:00 KST$/, ' KST')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ background: meta.bg, color: meta.fg, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>{meta.label}</span>
            {!stopped && left !== null && left > 0 && (
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 15 }} aria-label={`남은 시간 ${formatRemaining(left)}`}>{formatRemaining(left)}</span>
            )}
          </div>
        </div>
        {s.phases.length > 1 && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>예매 단계 {s.phases.length}개</div>}
      </Link>
    </li>
  );
}
