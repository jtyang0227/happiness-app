import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../components/common/Button';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import useServerClock from '../hooks/useServerClock';
import { apiError, OPEN_STATUS_META, ticketApi } from '../services/ticketApi';
import { accuracyLevel, formatInZone, formatKst, formatRemaining } from '../utils/serverClock';

const OFFSET_OPTIONS = [
  { key: '24h', label: '24시간 전' },
  { key: '1h', label: '1시간 전' },
  { key: '10m', label: '10분 전' },
  { key: '1m', label: '1분 전' },
];

const ACCURACY_TEXT = {
  WARN: '네트워크 지연으로 ±0.5초 정도 차이날 수 있어요.',
  UNRELIABLE: '현재 시간 정확도를 보장할 수 없습니다.',
};

/**
 * 예매 카운트다운 (/tickets/:id, 공개) — PROMPT D. 남은 시간은 서버 기준 시각으로 계산하고,
 * 0초가 돼도 "예매 진행 중"은 서버가 오픈을 확인(OPEN_CONFIRMED)했을 때만 쓴다.
 */
export default function TicketCountdownPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const clock = useServerClock();
  const [session, setSession] = useState<any>(null);
  const [phaseId, setPhaseId] = useState<number | null>(null);
  const [cd, setCd] = useState<any>(null);
  const [error, setError] = useState('');
  const [, setTick] = useState(0);
  const refetchAt = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    ticketApi.session(id).then(setSession).catch((e) => setError(e?.response?.status === 404 ? 'NOT_FOUND' : apiError(e, '공연 정보를 불러오지 못했습니다.')));
  }, [id]);

  const loadCountdown = useCallback(async () => {
    try {
      const data = await ticketApi.countdown(id, phaseId ?? undefined);
      setCd(data);
      if (phaseId === null) setPhaseId(data.phaseId);
      // 서버가 정한 간격으로 다시 맞춘다(남은 시간이 짧을수록 자주)
      if (refetchAt.current) clearTimeout(refetchAt.current);
      refetchAt.current = setTimeout(() => { clock.resync(); loadCountdown(); }, data.resyncAfterMs);
    } catch (e) {
      if (!cd) setError(apiError(e, '예매 일정을 불러오지 못했습니다.'));
    }
  }, [id, phaseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadCountdown();
    return () => { if (refetchAt.current) clearTimeout(refetchAt.current); };
  }, [loadCountdown]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 100);
    return () => clearInterval(t);
  }, []);

  const now = clock.now();
  const remaining = cd && cd.remainingMs !== null && now !== null ? Math.max(0, cd.targetEpochMs - now) : null;

  // 0초가 되면 서버 판정을 다시 받아 온다(시간 도달만으로 오픈이라고 하지 않음)
  const reachedRef = useRef(false);
  useEffect(() => {
    if (remaining === 0 && !reachedRef.current && cd && (cd.openStatus === 'SCHEDULED' || cd.openStatus === 'UPCOMING')) {
      reachedRef.current = true;
      setTimeout(loadCountdown, 1500);
    }
    if (remaining !== null && remaining > 0) reachedRef.current = false;
  }, [remaining, cd, loadCountdown]);

  if (error === 'NOT_FOUND') return <Shell><Empty title="공연을 찾을 수 없어요" desc="주소를 다시 확인해 주세요." /></Shell>;
  if (error) return <Shell><Empty title="불러오지 못했어요" desc={error} /></Shell>;
  if (!session || !cd) return <Shell><Skeleton /></Shell>;

  const level = clock.failed ? 'UNRELIABLE' : cd.accuracy.level === 'UNRELIABLE' ? 'UNRELIABLE' : accuracyLevel(clock.rttMs, cd.serverTimeGrade);
  const stopped = cd.scheduleStatus === 'CANCELLED' || cd.scheduleStatus === 'POSTPONED';
  const reached = remaining === 0 && !stopped;
  const meta = reached && (cd.openStatus === 'SCHEDULED' || cd.openStatus === 'UPCOMING') ? OPEN_STATUS_META.OPEN_CHECK_PENDING : OPEN_STATUS_META[cd.openStatus] ?? OPEN_STATUS_META.UNKNOWN;

  return (
    <Shell>
      <nav aria-label="예매 일정 이동" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 14 }}>
        <Link to="/tickets" style={{ color: COLORS.textSecondary, textDecoration: 'none', fontWeight: 600 }}>← 전체 일정</Link>
        {user && <Link to="/tickets/alerts" style={{ color: COLORS.primary, textDecoration: 'none', fontWeight: 700 }}>🔔 내 알림</Link>}
      </nav>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: '0 0 4px' }}>{session.title}</h1>
      {session.venue && <p style={{ margin: 0, color: COLORS.textSecondary, fontSize: 14 }}>📍 {session.venue}</p>}

      {session.phases.length > 1 && (
        <div role="tablist" aria-label="예매 단계" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '20px 0 0' }}>
          {session.phases.map((p) => (
            <button key={p.id} role="tab" aria-selected={p.id === phaseId} onClick={() => { setCd(null); setPhaseId(p.id); }}
              style={{ border: `1px solid ${p.id === phaseId ? COLORS.primary : COLORS.border}`, background: p.id === phaseId ? COLORS.primaryLight : COLORS.surface,
                color: p.id === phaseId ? COLORS.primaryDark : COLORS.textSecondary, borderRadius: 999, padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      <section aria-live="polite" style={{ background: COLORS.surface, borderRadius: 20, padding: '28px 24px', marginTop: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, color: COLORS.text }}>{cd.phaseName}</span>
          <span style={{ background: meta.bg, color: meta.fg, borderRadius: 999, padding: '4px 10px', fontSize: 13, fontWeight: 700 }}>{reached && meta === OPEN_STATUS_META.OPEN_CHECK_PENDING ? '오픈 확인 중…' : meta.label}</span>
        </div>

        {stopped ? (
          <p style={{ margin: '24px 0 8px', fontSize: 18, fontWeight: 700, color: COLORS.danger }}>{cd.notice}</p>
        ) : (
          <>
            <div style={{ fontSize: 'clamp(34px, 9vw, 52px)', fontWeight: 800, color: COLORS.text, fontVariantNumeric: 'tabular-nums', margin: '20px 0 6px', opacity: level === 'UNRELIABLE' ? 0.45 : 1, letterSpacing: '-0.5px' }}
              aria-label={remaining === null ? '시간 측정 중' : `남은 시간 ${formatRemaining(remaining)}`}>
              {remaining === null ? '--:--:--' : formatRemaining(remaining)}
            </div>
            <div style={{ color: COLORS.textSecondary, fontSize: 15 }}>
              {formatKst(cd.targetEpochMs).replace(/:00 KST$/, ' KST')} 오픈 예정
              {cd.timezone !== 'Asia/Seoul' && <span style={{ color: COLORS.textMuted }}> · 현지 {formatInZone(cd.targetEpochMs, cd.timezone)}</span>}
            </div>
            {cd.notice && <p style={{ margin: '12px 0 0', fontSize: 14, color: cd.accuracy.level === 'UNRELIABLE' ? COLORS.danger : '#8A5A00' }}>{cd.notice}</p>}
          </>
        )}

        {level !== 'OK' && !stopped && (
          <p role="status" style={{ margin: '12px 0 0', fontSize: 13, color: level === 'UNRELIABLE' ? COLORS.danger : '#8A5A00' }}>⚠️ {ACCURACY_TEXT[level]}</p>
        )}
        <p style={{ margin: '14px 0 0', fontSize: 12, color: COLORS.textMuted }}>
          서버 기준 시각{clock.uncertaintyMs !== null ? ` · 오차 ±${(clock.uncertaintyMs / 1000).toFixed(2)}초` : ''} · 기기 시계와 무관
        </p>
      </section>

      {!stopped && <AlertCard phaseId={cd.phaseId} loggedIn={!!user} />}
      {!stopped && (
        <section style={{ background: COLORS.surface, borderRadius: 20, padding: 20, marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <a href={ticketApi.icsUrl(cd.phaseId)} download={`ticket-${cd.phaseId}.ics`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: `1px solid ${COLORS.border}`, color: COLORS.text, fontWeight: 700, fontSize: 14, textDecoration: 'none', background: COLORS.surface }}>
            📅 캘린더에 추가
          </a>
          <span style={{ fontSize: 12, color: COLORS.textMuted, flex: '1 1 200px' }}>휴대폰·PC 캘린더에 10분 전 알림과 함께 넣어요. 일정이 바뀌면 다시 받아 주세요.</span>
        </section>
      )}
    </Shell>
  );
}

function AlertCard({ phaseId, loggedIn }: { phaseId: number; loggedIn: boolean }) {
  const [offsets, setOffsets] = useState<string[] | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!loggedIn) return;
    setOffsets(null);
    ticketApi.getAlert(phaseId).then((r) => { const v = r.enabled ? r.offsets : []; setOffsets(v); setSaved(v); }).catch(() => setOffsets([]));
  }, [phaseId, loggedIn]);

  if (!loggedIn) {
    return (
      <section style={{ background: COLORS.surface, borderRadius: 20, padding: 20, marginTop: 12 }}>
        <p style={{ margin: '0 0 12px', color: COLORS.textSecondary }}>🔔 예매 시작 전에 알림을 받아 보세요.</p>
        <Link to="/login" style={{ color: COLORS.primary, fontWeight: 700 }}>로그인하고 알림 받기 →</Link>
      </section>
    );
  }

  const toggle = (k: string) => setOffsets((cur) => (cur?.includes(k) ? cur.filter((x) => x !== k) : [...(cur ?? []), k]));
  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      if (offsets!.length) {
        const r = await ticketApi.saveAlert(phaseId, offsets);
        setMsg(r.scheduledReminders < offsets!.length ? `저장했어요. 이미 지난 시점 ${offsets!.length - r.scheduledReminders}개는 보내지 않아요.` : '알림을 저장했어요.');
      } else {
        await ticketApi.removeAlert(phaseId);
        setMsg('알림을 껐어요.');
      }
      setSaved(offsets!);
    } catch (e) {
      setMsg(apiError(e, '알림을 저장하지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };
  const dirty = offsets !== null && [...offsets].sort().join() !== [...saved].sort().join();

  return (
    <section style={{ background: COLORS.surface, borderRadius: 20, padding: 20, marginTop: 12 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 12px', color: COLORS.text }}>🔔 예매 알림</h2>
      {offsets === null ? <div style={{ height: 40, background: COLORS.bg, borderRadius: 12 }} /> : (
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <legend className="sr-only">알림 받을 시점</legend>
          {OFFSET_OPTIONS.map(({ key, label }) => {
            const on = offsets.includes(key);
            return (
              <label key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 12, cursor: 'pointer',
                border: `1px solid ${on ? COLORS.primary : COLORS.border}`, background: on ? COLORS.primaryLight : COLORS.surface, color: on ? COLORS.primaryDark : COLORS.textSecondary, fontSize: 14, fontWeight: 600 }}>
                <input type="checkbox" checked={on} onChange={() => toggle(key)} style={{ accentColor: COLORS.primary }} />{label}
              </label>
            );
          })}
        </fieldset>
      )}
      <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '10px 0 12px' }}>일정이 바뀌면 알림 시각도 함께 바뀌고, 변경 안내를 한 번 보내 드려요.</p>
      <Button size="md" onClick={save} loading={busy} disabled={!dirty || busy}>{busy ? '저장 중' : '저장'}</Button>
      {msg && <p role="status" style={{ margin: '10px 0 0', fontSize: 13, color: COLORS.textSecondary }}>{msg}</p>}
    </section>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return <main style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px 80px' }}>{children}</main>;
}

function Empty({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 16px', color: COLORS.textSecondary }}>
      <div style={{ fontSize: 40 }}>🎫</div>
      <h1 style={{ fontSize: 20, color: COLORS.text }}>{title}</h1>
      <p>{desc}</p>
      <Link to="/explore" style={{ color: COLORS.primary, fontWeight: 700 }}>둘러보기로 →</Link>
    </div>
  );
}

function Skeleton() {
  const bar = (w: string | number, h: number, mt = 0) => <div style={{ width: w, height: h, marginTop: mt, background: COLORS.border, borderRadius: 8, animation: 'pulse 1.4s ease-in-out infinite' }} />;
  return <div aria-busy="true" aria-label="불러오는 중">{bar('60%', 28)}{bar('30%', 16, 10)}{bar('100%', 200, 24)}</div>;
}
