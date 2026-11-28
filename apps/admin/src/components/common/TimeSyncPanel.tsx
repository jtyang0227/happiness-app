import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getApi, postApi } from '../../utils/api';
import { accuracyLevel, ago, bestClock, formatKst, formatUtc, serverNow, ServerClock, TimeSample } from '../../utils/serverTime';

const GRADE_LABEL: Record<string, { text: string; cls: string }> = {
  HEALTHY: { text: '정상', cls: 'ok' },
  DEGRADED: { text: '주의', cls: 'warn' },
  UNHEALTHY: { text: '비정상', cls: 'bad' },
  UNKNOWN: { text: '확인 불가', cls: 'warn' },
};

const ACCURACY_TEXT = {
  OK: '',
  WARN: '네트워크 지연 또는 서버 시간 오차로 표시 시각이 조금 다를 수 있습니다.',
  UNRELIABLE: '현재 시각의 정확도를 보장할 수 없습니다.',
};

const REFRESH_MS = 30_000;

/** 관리자 화면 — 서버 시간 동기화 상태 (PLANNING_server-time.md H) */
const TimeSyncPanel = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [, setTick] = useState(0);
  const clockRef = useRef<ServerClock | null>(null);

  /** 요청 한 번 = 시각 샘플 하나. 상태 조회 응답의 serverEpochMs로 서버 기준 시계를 맞춘다 */
  const measure = useCallback(async (call: () => Promise<any>) => {
    const sentAt = performance.now();
    const res = await call();
    const sample: TimeSample = { serverEpochMs: res.serverEpochMs, sentAt, receivedAt: performance.now(), serverProcessingMs: res.serverProcessingMs };
    const candidate = bestClock([sample]);
    // 새 샘플의 RTT가 더 작거나, 이전 값이 1분 넘게 지났으면 교체
    const prev = clockRef.current;
    if (candidate && (!prev || candidate.rttMs <= prev.rttMs || performance.now() - prev.receivedAt > 60_000)) clockRef.current = candidate;
    setData(res);
    setError('');
  }, []);

  const load = useCallback(() => measure(() => getApi('/admin/time/status')).catch(() => setError('서버 시간 상태를 불러오지 못했습니다.')), [measure]);

  useEffect(() => {
    load();
    const poll = setInterval(load, REFRESH_MS);
    const tick = setInterval(() => setTick((t) => t + 1), 500);
    // 탭으로 돌아오면 바로 다시 맞춘다
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(poll); clearInterval(tick); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  const runDiagnostics = async () => {
    setRunning(true);
    try {
      await measure(() => postApi('/admin/time/diagnostics', {}));
      toast.success('서버 시간을 다시 측정했습니다.');
    } catch {
      toast.error('진단에 실패했습니다.');
    } finally {
      setRunning(false);
    }
  };

  if (!data && !error) return <div className="system-card"><h2 className="system-card-title">서버 시간</h2><div className="loading-cell">로딩 중...</div></div>;

  const clock = clockRef.current;
  const now = clock ? serverNow(clock, performance.now()) : null;
  const s = data?.status;
  const grade = GRADE_LABEL[s?.grade] ?? GRADE_LABEL.UNKNOWN;
  const level = accuracyLevel(clock?.rttMs ?? null, s?.grade ?? null);
  const items = [
    { label: '현재 UTC', value: now !== null ? formatUtc(now) : '—', status: '' },
    { label: '현재 KST', value: now !== null ? formatKst(now) : '—', status: '' },
    { label: 'NTP 동기화', value: grade.text, status: grade.cls },
    { label: '서버 시간 오차', value: s?.offsetMs === null || s?.offsetMs === undefined ? '—' : `${s.offsetMs > 0 ? '+' : ''}${s.offsetMs}ms`, status: grade.cls },
    { label: '마지막 동기화', value: s?.lastSyncAt ? `${formatKst(Date.parse(s.lastSyncAt))} (${ago(s.lastSyncAt, now ?? Date.parse(s.lastSyncAt))})` : '없음', status: s?.lastSyncAt ? '' : 'warn' },
    { label: '기준 서버', value: s?.referenceServer ? `${s.referenceServer} (stratum ${s.stratum})` : '—', status: '' },
    { label: '이 화면 왕복 지연', value: clock ? `${Math.round(clock.rttMs)}ms (±${Math.round(clock.uncertaintyMs)}ms)` : '—', status: level === 'OK' ? 'ok' : 'warn' },
  ];

  return (
    <div className="system-card" style={{ marginTop: 20 }}>
      <h2 className="system-card-title">서버 시간 동기화</h2>
      {error && <p className="system-value bad" role="alert" style={{ margin: '0 0 12px' }}>{error}</p>}
      {level !== 'OK' && <p className="system-value warn" role="status" style={{ margin: '0 0 12px', fontSize: 13 }}>⚠️ {ACCURACY_TEXT[level]}</p>}
      <div className="system-items">
        {items.map(({ label, value, status }) => (
          <div key={label} className="system-item">
            <span className="system-label">{label}</span>
            <span className={`system-value ${status}`} style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </div>
      {s?.lastErrors?.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          실패한 서버: {s.lastErrors.map((e: any) => `${e.server} — ${e.error}`).join(' · ')}
        </div>
      )}
      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '12px 0' }}>
        시각은 이 PC 시계가 아니라 서버 응답 기준입니다. 오차 기준: 정상 ≤ {s?.thresholds?.healthyMs ?? 50}ms, 비정상 &gt; {s?.thresholds?.unhealthyMs ?? 500}ms.
      </p>
      <button className="btn-sm btn-outline" onClick={runDiagnostics} disabled={running}>
        {running ? '측정 중...' : '지금 다시 측정'}
      </button>
    </div>
  );
};

export default TimeSyncPanel;
