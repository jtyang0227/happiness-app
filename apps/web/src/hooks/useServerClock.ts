import { useCallback, useEffect, useRef, useState } from 'react';
import { ticketApi } from '../services/ticketApi';
import { bestClock, serverNow, ServerClock, TimeSample } from '../utils/serverClock';

/**
 * 서버 기준 시계 — 처음 5번 재서 왕복 시간이 가장 짧은 측정을 쓰고, resync()로 다시 맞춘다.
 * 기기 시계(Date.now)는 판단에 쓰지 않는다. 탭으로 돌아오면 자동으로 다시 맞춘다.
 */
export default function useServerClock(initialSamples = 5) {
  const clockRef = useRef<ServerClock | null>(null);
  const [state, setState] = useState<{ rttMs: number | null; failed: boolean; grade: string | null }>({ rttMs: null, failed: false, grade: null });

  const sample = useCallback(async (): Promise<TimeSample & { grade?: string }> => {
    const sentAt = performance.now();
    const res = await ticketApi.timeNow();
    return { serverEpochMs: res.serverEpochMs, sentAt, receivedAt: performance.now(), serverProcessingMs: res.serverProcessingMs, grade: res.sync?.grade };
  }, []);

  const resync = useCallback(async (count = 3) => {
    const samples: (TimeSample & { grade?: string })[] = [];
    for (let i = 0; i < count; i++) {
      try { samples.push(await sample()); } catch { /* 실패한 측정은 건너뛴다 */ }
    }
    const c = bestClock(samples);
    if (!c) {
      setState((s) => ({ ...s, failed: !clockRef.current }));
      return;
    }
    clockRef.current = c;
    setState({ rttMs: c.rttMs, failed: false, grade: samples[samples.length - 1]?.grade ?? null });
  }, [sample]);

  useEffect(() => {
    resync(initialSamples);
    const onVisible = () => { if (document.visibilityState === 'visible') resync(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [resync, initialSamples]);

  const now = useCallback(() => (clockRef.current ? serverNow(clockRef.current, performance.now()) : null), []);
  return { now, resync, rttMs: state.rttMs, uncertaintyMs: state.rttMs === null ? null : state.rttMs / 2, failed: state.failed, grade: state.grade };
}
