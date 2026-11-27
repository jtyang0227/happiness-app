import React, { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Button from '../../components/common/Button';
import { COLORS } from '../../constants/colors';
import useServerClock from '../../hooks/useServerClock';
import { adminTicketApi, apiError, OPEN_STATUS_META, SCHEDULE_STATUS_LABEL, TIME_SOURCE_LABEL } from '../../services/ticketApi';
import { ago, formatKst, formatRemaining, formatUtc } from '../../utils/serverClock';

/**
 * 예매 일정 모니터링 (/admin/tickets) — PROMPT H. 서버 기준 시계·동기화 상태, 다음 예매 일정(실시간 남은 시간),
 * 일정 변경(사유 필수·revision 충돌 안내), 오픈 확정(근거 필수·이중 확인), 처리기·큐·시간 장애.
 */
const GRADE = { HEALTHY: ['정상', COLORS.successText, COLORS.successTonal], DEGRADED: ['주의', '#8A5A00', '#FFF4D6'], UNHEALTHY: ['비정상', COLORS.dangerDark, COLORS.dangerTonal], UNKNOWN: ['확인 불가', COLORS.textSecondary, COLORS.bg] };
const card: React.CSSProperties = { background: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 12, color: COLORS.textMuted, fontWeight: 600, whiteSpace: 'nowrap', borderBottom: `1px solid ${COLORS.border}` };
const td: React.CSSProperties = { padding: '10px', fontSize: 13, color: COLORS.text, borderBottom: `1px solid ${COLORS.borderLight}`, verticalAlign: 'top' };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '9px 10px', fontSize: 14, background: COLORS.surface, color: COLORS.text };

/** datetime-local 값은 KST로 해석해 시간대를 붙여 보낸다(브라우저 시간대와 무관) */
const kstInputToIso = (v: string) => (v ? `${v.length === 16 ? `${v}:00` : v}+09:00` : '');
const isoToKstInput = (iso: string | null) => {
  if (!iso) return '';
  const k = new Date(Date.parse(iso) + 9 * 3600_000).toISOString();
  return k.slice(0, 16);
};

function Badge({ text, fg, bg }: { text: string; fg: string; bg: string }) {
  return <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: fg, background: bg, whiteSpace: 'nowrap' }}>{text}</span>;
}

export default function AdminTicketsPage() {
  const clock = useServerClock();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [, setTick] = useState(0);
  const [modal, setModal] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [diag, setDiag] = useState<any>(null);

  const load = useCallback(() => adminTicketApi.monitor().then((d) => { setData(d); setError(''); }).catch((e) => setError(apiError(e, '모니터링 정보를 불러오지 못했습니다.'))), []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 15_000);
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => { clearInterval(poll); clearInterval(t); };
  }, [load]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };
  const now = clock.now();
  const s = data?.status;
  const [gText, gFg, gBg] = GRADE[s?.grade] ?? GRADE.UNKNOWN;

  return (
    <AdminLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: 22, margin: '0 0 16px', color: COLORS.text }}>🎫 예매 일정 모니터링</h1>
        {toast && <div role="status" style={{ ...card, padding: 12, background: COLORS.primaryLight, color: COLORS.primaryDark }}>{toast}</div>}
        {error && <div role="alert" style={{ ...card, padding: 12, background: COLORS.dangerTonal, color: COLORS.dangerDark }}>{error}</div>}

        {/* 1. 시계 바 */}
        <section style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }} aria-label="서버 시각">
          <div><div style={{ fontSize: 12, color: COLORS.textMuted }}>현재 UTC</div><div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{now !== null ? formatUtc(now) : '—'}</div></div>
          <div><div style={{ fontSize: 12, color: COLORS.textMuted }}>현재 KST</div><div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{now !== null ? formatKst(now) : '—'}</div></div>
          <div><div style={{ fontSize: 12, color: COLORS.textMuted }}>NTP 동기화</div><Badge text={gText} fg={gFg} bg={gBg} /></div>
          <div><div style={{ fontSize: 12, color: COLORS.textMuted }}>서버 시간 오차</div><div style={{ fontWeight: 700 }}>{s?.offsetMs == null ? '—' : `${s.offsetMs > 0 ? '+' : ''}${s.offsetMs}ms`}</div></div>
          <div><div style={{ fontSize: 12, color: COLORS.textMuted }}>마지막 동기화</div><div>{s?.lastSyncAt ? `${formatKst(Date.parse(s.lastSyncAt))} (${ago(s.lastSyncAt, now ?? Date.now())})` : '없음'}</div></div>
          <div style={{ marginLeft: 'auto' }}>
            <Button size="sm" variant="secondary" onClick={async () => { try { setDiag(await adminTicketApi.diagnostics()); await clock.resync(5); load(); } catch (e) { flash(apiError(e, '진단에 실패했습니다.')); } }}>진단 실행</Button>
          </div>
          {data?.guard && !data.guard.healthy && <p role="alert" style={{ width: '100%', margin: 0, color: COLORS.dangerDark, fontSize: 13 }}>⚠️ 시간 민감 작업(알림·오픈 판정)이 멈춰 있습니다: {data.guard.reason}</p>}
          {s?.grade === 'UNKNOWN' && <p style={{ width: '100%', margin: 0, color: '#8A5A00', fontSize: 13 }}>외부 NTP 서버에 닿지 못해 오차를 모릅니다. 처리기는 계속 돌지만 서버 시계를 확인해 주세요.</p>}
        </section>

        {diag && (
          <section style={card} aria-label="진단 결과">
            <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>진단 결과</h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.8 }}>
              <li>NTP: {diag.status.grade} · 오차 {diag.status.offsetMs ?? '—'}ms · 기준 {diag.status.referenceServer ?? '없음'}{diag.status.lastErrors?.length ? ` · 실패 ${diag.status.lastErrors.map((x) => x.server).join(', ')}` : ''}</li>
              <li>DB 시계 차이 {diag.db.skewMs}ms (왕복 {diag.db.roundTripMs}ms, 세션 시간대 {diag.db.sessionTimeZone})</li>
              <li>프로세스 시간대 {diag.process.resolvedTimeZone} (TZ={diag.process.tz ?? '미설정'}, tzdata {diag.process.icuTzData ?? '—'})</li>
              <li>이 화면 왕복 {clock.rttMs === null ? '—' : `${Math.round(clock.rttMs)}ms`}</li>
              <li>큐: 대기 {diag.queue.pending} · 밀린 시간 {Math.round(diag.queue.dueLagMs / 1000)}초 · 임대 만료 {diag.queue.expiredLeases} · DEAD {diag.queue.dead}</li>
            </ul>
          </section>
        )}

        {/* 3. 다음 예매 일정 */}
        <section style={card} aria-label="다음 예매 일정">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>다음 예매 일정</h2>
            <Button size="sm" onClick={() => setModal({ type: 'create' })}>＋ 새 일정</Button>
          </div>
          {!data ? <div style={{ height: 120, background: COLORS.bg, borderRadius: 12 }} /> : data.upcoming.length === 0 ? (
            <p style={{ color: COLORS.textMuted, fontSize: 14, padding: '24px 0', textAlign: 'center' }}>🎫 다가오는 예매 일정이 없습니다.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead><tr>{['공연 · 단계', 'KST 시각', '남은 시간', '일정', '오픈 상태', '출처 · 확인', '알림', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.upcoming.map((p) => {
                    const target = Date.parse(p.scheduledAt);
                    const left = now !== null ? target - now : p.remainingMs;
                    const om = OPEN_STATUS_META[p.openStatus] ?? OPEN_STATUS_META.UNKNOWN;
                    return (
                      <tr key={p.id}>
                        <td style={td}><div style={{ fontWeight: 700 }}>{p.sessionTitle}</div><div style={{ color: COLORS.textSecondary }}>{p.name} · r{p.scheduleRevision}</div></td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>{formatKst(target)}{p.announcedDiffMs ? <div><Badge text={`공지와 ${Math.round(p.announcedDiffMs / 60000)}분 차이`} fg="#8A5A00" bg="#FFF4D6" /></div> : null}{p.timezone !== 'Asia/Seoul' && <div style={{ color: COLORS.textMuted }}>원문 {p.timezone}</div>}</td>
                        <td style={{ ...td, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{p.scheduleStatus === 'CANCELLED' || p.scheduleStatus === 'POSTPONED' ? '—' : left > 0 ? formatRemaining(left) : '도달'}</td>
                        <td style={td}><Badge text={SCHEDULE_STATUS_LABEL[p.scheduleStatus] ?? p.scheduleStatus} fg={p.scheduleStatus === 'CONFIRMED' ? COLORS.successText : p.scheduleStatus === 'CANCELLED' ? COLORS.dangerDark : '#8A5A00'} bg={p.scheduleStatus === 'CONFIRMED' ? COLORS.successTonal : p.scheduleStatus === 'CANCELLED' ? COLORS.dangerTonal : '#FFF4D6'} /></td>
                        <td style={td}><Badge text={om.label} fg={om.fg} bg={om.bg} /></td>
                        <td style={td}>{TIME_SOURCE_LABEL[p.timeSource] ?? p.timeSource}{p.sourceUrl && <> · <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.primary }}>근거</a></>}
                          <div style={{ color: p.verifyStale ? '#8A5A00' : COLORS.textMuted }}>{p.verifiedAt ? `확인 ${ago(p.verifiedAt, now ?? Date.now())}` : '확인 기록 없음'}{p.verifyStale ? ' ⚠️' : ''}</div></td>
                        <td style={td}>{p.pendingReminders}건</td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <Button size="sm" variant="secondary" onClick={() => setModal({ type: 'change', phase: p })}>변경</Button>
                            <Button size="sm" variant="ghost" onClick={async () => { try { await adminTicketApi.verifySchedule(p.id); flash('공식 일정 재확인 시각을 기록했습니다.'); load(); } catch (e) { flash(apiError(e)); } }}>재확인</Button>
                            <Button size="sm" variant="ghost" onClick={() => setModal({ type: 'verify', phase: p })}>오픈 확정</Button>
                            <Button size="sm" variant="ghost" onClick={async () => { try { setHistory(await adminTicketApi.history(p.id)); } catch (e) { flash(apiError(e)); } }}>이력</Button>
                            <Button size="sm" variant="ghost" onClick={async () => { try { await adminTicketApi.testAlert(p.id); flash('내 알림함으로 테스트 알림 4개를 보냈습니다.'); } catch (e) { flash(apiError(e)); } }}>테스트 알림</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {history && <HistoryPanel history={history} onClose={() => setHistory(null)} />}

        {/* 4. 최근 일정 변경 */}
        <section style={card} aria-label="일정 변경 이력">
          <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>최근 일정 변경</h2>
          {!data?.recentChanges?.length ? <p style={{ color: COLORS.textMuted, fontSize: 14 }}>변경 이력이 없습니다.</p> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {data.recentChanges.map((c) => (
                <li key={`${c.phaseId}-${c.revision}`} style={{ padding: '10px 0', borderBottom: `1px solid ${COLORS.borderLight}`, fontSize: 13 }}>
                  <b>{c.sessionTitle} · {c.phaseName}</b> r{c.revision} — {c.prevScheduledAt ? formatKst(Date.parse(c.prevScheduledAt)) : '—'} → {c.newScheduledAt ? formatKst(Date.parse(c.newScheduledAt)) : '—'}
                  {c.prevScheduleStatus !== c.newScheduleStatus && ` · ${SCHEDULE_STATUS_LABEL[c.prevScheduleStatus]} → ${SCHEDULE_STATUS_LABEL[c.newScheduleStatus]}`}
                  <div style={{ color: COLORS.textSecondary }}>사유: {c.reason} · {c.changedBy} · {ago(c.changedAt, now ?? Date.now())}{c.sourceUrl && <> · <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.primary }}>근거</a></>}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 5. 처리기·큐 */}
        <section style={card} aria-label="처리기 상태">
          <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>처리기(Worker) 상태</h2>
          {data?.queue && (
            <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: '0 0 10px' }}>
              큐 — 대기 {data.queue.pending} · 처리 중 {data.queue.claimed} · 완료 {data.queue.succeeded} · 건너뜀 {data.queue.skipped} · 취소 {data.queue.cancelled} ·
              <span style={{ color: data.queue.dead ? COLORS.dangerDark : undefined }}> DEAD {data.queue.dead}</span> · 밀린 시간 {Math.round(data.queue.dueLagMs / 1000)}초 · 임대 만료 {data.queue.expiredLeases}
              {data.unknownDeliveries ? ` · 발송 여부 불명 ${data.unknownDeliveries}` : ''}
            </p>
          )}
          {!data?.workers?.length ? <p style={{ color: COLORS.textMuted, fontSize: 14 }}>하트비트가 없습니다. 처리기가 꺼져 있을 수 있습니다(TICKET_WORKER_ENABLED).</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead><tr>{['처리기', '등급', 'NTP 오차', 'DB 시계 차이', '큐 지연', '상태', '복구·건너뜀', '마지막 신호'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.workers.map((w) => (
                    <tr key={w.workerId} style={{ opacity: w.stale ? 0.5 : 1 }}>
                      <td style={td}>{w.workerId}{w.leader && ' 👑'}</td>
                      <td style={td}><Badge text={(GRADE[w.grade] ?? GRADE.UNKNOWN)[0]} fg={(GRADE[w.grade] ?? GRADE.UNKNOWN)[1]} bg={(GRADE[w.grade] ?? GRADE.UNKNOWN)[2]} /></td>
                      <td style={td}>{w.offsetMs == null ? '—' : `${w.offsetMs}ms`}</td>
                      <td style={td}>{w.dbSkewMs == null ? '—' : `${w.dbSkewMs}ms`}</td>
                      <td style={td}>{Math.round(w.queueLagMs / 1000)}초</td>
                      <td style={td}>{w.stale ? '응답 없음' : w.paused ? <span style={{ color: COLORS.dangerDark }}>시간 민감 작업 중단</span> : '정상'}</td>
                      <td style={td}>{w.recoveredCount} · {w.skippedCount}</td>
                      <td style={td}>{ago(w.checkedAt, now ?? Date.now())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data?.incidents?.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, margin: '16px 0 6px' }}>시간 동기화 장애</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: COLORS.textSecondary }}>
                {data.incidents.map((i) => <li key={i.id}>{formatKst(Date.parse(i.startedAt))} ~ {i.endedAt ? formatKst(Date.parse(i.endedAt)) : <b style={{ color: COLORS.dangerDark }}>진행 중</b>} · {i.reason}</li>)}
              </ul>
            </>
          )}
        </section>
      </div>

      {modal?.type === 'create' && <CreateModal onClose={() => setModal(null)} onDone={(m) => { setModal(null); flash(m); load(); }} />}
      {modal?.type === 'change' && <ChangeModal phase={modal.phase} onClose={() => setModal(null)} onDone={(m) => { setModal(null); flash(m); load(); }} />}
      {modal?.type === 'verify' && <VerifyModal phase={modal.phase} onClose={() => setModal(null)} onDone={(m) => { setModal(null); flash(m); load(); }} />}
    </AdminLayout>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children?: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div role="presentation" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} style={{ background: COLORS.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 18, margin: '0 0 16px' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children?: React.ReactNode; hint?: string }) {
  return (
    <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: COLORS.textSecondary, fontWeight: 600 }}>
      {label}<div style={{ marginTop: 4 }}>{children}</div>{hint && <span style={{ fontWeight: 400, fontSize: 12, color: COLORS.textMuted }}>{hint}</span>}
    </label>
  );
}

function CreateModal({ onClose, onDone }) {
  const [f, setF] = useState({ title: '', venue: '', name: '일반예매', when: '', timeSource: 'OFFICIAL_NOTICE', sourceUrl: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const s = await adminTicketApi.createSession({ title: f.title, venue: f.venue });
      const iso = kstInputToIso(f.when);
      const r = await adminTicketApi.createPhase(s.id, { name: f.name, announcedAt: iso, scheduledAt: iso, timeSource: f.timeSource, sourceUrl: f.sourceUrl || undefined, timezone: 'Asia/Seoul' });
      onDone(`일정을 등록했습니다.${r.warnings?.length ? ` (주의: ${r.warnings.join(' / ')})` : ''}`);
    } catch (e2) {
      setErr(apiError(e2, '등록하지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="새 예매 일정" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="공연·행사 이름"><input style={input} required maxLength={200} value={f.title} onChange={set('title')} /></Field>
        <Field label="장소"><input style={input} maxLength={200} value={f.venue} onChange={set('venue')} /></Field>
        <Field label="예매 단계"><input style={input} required maxLength={50} value={f.name} onChange={set('name')} /></Field>
        <Field label="예매 시작 (KST)" hint="공지에 적힌 시각. KST로 입력하면 UTC로 저장합니다."><input type="datetime-local" step={1} style={input} required value={f.when} onChange={set('when')} /></Field>
        <Field label="출처"><select style={input} value={f.timeSource} onChange={set('timeSource')}>{Object.entries(TIME_SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="근거 링크" hint="공식 공지·API면 필수"><input type="url" style={input} value={f.sourceUrl} onChange={set('sourceUrl')} placeholder="https://" /></Field>
        {err && <p role="alert" style={{ color: COLORS.dangerDark, fontSize: 13 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button type="button" variant="ghost" onClick={onClose}>취소</Button><Button type="submit" loading={busy}>{busy ? '등록 중' : '등록'}</Button></div>
      </form>
    </Modal>
  );
}

function ChangeModal({ phase, onClose, onDone }) {
  const [f, setF] = useState({ when: isoToKstInput(phase.scheduledAt), scheduleStatus: phase.scheduleStatus === 'CHANGED' ? 'CONFIRMED' : phase.scheduleStatus, timeSource: phase.timeSource, sourceUrl: phase.sourceUrl ?? '', reason: '' });
  const [revision, setRevision] = useState(phase.scheduleRevision);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const iso = kstInputToIso(f.when);
      const timeChanged = Date.parse(iso) !== Date.parse(phase.scheduledAt);
      await adminTicketApi.changeSchedule(phase.id, {
        ...(timeChanged ? { scheduledAt: iso, announcedAt: iso } : {}), scheduleStatus: f.scheduleStatus, timeSource: f.timeSource, sourceUrl: f.sourceUrl || null, reason: f.reason, expectedRevision: revision,
      });
      onDone('일정을 변경했습니다. 구독자 알림을 다시 계산합니다.');
    } catch (e2) {
      if (e2?.response?.status === 409) {
        // 최신 revision을 받아 다시 시도할 수 있게
        try { const h = await adminTicketApi.history(phase.id); setRevision(h.phase.scheduleRevision); setErr(`다른 관리자가 먼저 바꿨습니다(최신: ${formatKst(Date.parse(h.phase.scheduledAt))}, r${h.phase.scheduleRevision}). 확인 후 다시 저장하세요.`); } catch { setErr(apiError(e2)); }
      } else setErr(apiError(e2, '변경하지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`일정 변경 — ${phase.sessionTitle} · ${phase.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="예매 시작 (KST)"><input type="datetime-local" step={1} style={input} required value={f.when} onChange={set('when')} /></Field>
        <Field label="일정 상태"><select style={input} value={f.scheduleStatus} onChange={set('scheduleStatus')}>{Object.entries(SCHEDULE_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="출처"><select style={input} value={f.timeSource} onChange={set('timeSource')}>{Object.entries(TIME_SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="근거 링크"><input type="url" style={input} value={f.sourceUrl} onChange={set('sourceUrl')} placeholder="https://" /></Field>
        <Field label="변경 사유 (필수)"><textarea style={{ ...input, minHeight: 72 }} required maxLength={1000} value={f.reason} onChange={set('reason')} placeholder="예: 주최 측 공지 정정 (11/27 14:00)" /></Field>
        {(f.scheduleStatus === 'CANCELLED' || f.scheduleStatus === 'POSTPONED') && <p style={{ color: COLORS.dangerDark, fontSize: 13 }}>구독자 전원에게 {SCHEDULE_STATUS_LABEL[f.scheduleStatus]} 안내가 한 번 가고, 남은 알림은 모두 취소됩니다.</p>}
        {err && <p role="alert" style={{ color: COLORS.dangerDark, fontSize: 13 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button type="button" variant="ghost" onClick={onClose}>취소</Button><Button type="submit" loading={busy} variant={f.scheduleStatus === 'CANCELLED' ? 'danger' : 'primary'}>{busy ? '저장 중' : '저장'}</Button></div>
      </form>
    </Modal>
  );
}

function VerifyModal({ phase, onClose, onDone }) {
  const [result, setResult] = useState('OPEN');
  const [evidence, setEvidence] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await adminTicketApi.verification(phase.id, { result, evidence, method: 'ADMIN_CONFIRM' });
      onDone(r.changed ? `오픈 상태를 ${OPEN_STATUS_META[r.phase.openStatus].label}(으)로 바꿨습니다.` : r.notice);
    } catch (e) {
      setErr(apiError(e, '기록하지 못했습니다.'));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`오픈 확인 기록 — ${phase.name}`} onClose={onClose}>
      <p style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 0 }}>예정 시각이 지났다는 이유만으로는 "예매 진행 중"이 되지 않습니다. 직접 확인한 결과와 근거를 남겨 주세요. 현재 상태: <b>{OPEN_STATUS_META[phase.openStatus]?.label}</b></p>
      <Field label="확인 결과">
        <select style={input} value={result} onChange={(e) => { setResult(e.target.value); setConfirming(false); }}>
          <option value="OPEN">오픈됨 (OPEN)</option><option value="CLOSED">종료·매진 (CLOSED)</option><option value="NOT_OPEN">아직 안 열림 (기록만)</option><option value="ERROR">확인 실패 (기록만)</option>
        </select>
      </Field>
      <Field label="근거 메모 (필수)"><textarea style={{ ...input, minHeight: 72 }} maxLength={500} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="예: 예매처 페이지에서 예매 버튼 활성 확인 20:00:03" /></Field>
      {err && <p role="alert" style={{ color: COLORS.dangerDark, fontSize: 13 }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="ghost" onClick={onClose}>취소</Button>
        {!confirming
          ? <Button disabled={!evidence.trim()} onClick={() => setConfirming(true)}>기록하기</Button>
          : <><span style={{ fontSize: 13, color: COLORS.dangerDark }}>정말 기록할까요? 사용자 화면에 바로 반영됩니다.</span><Button variant="danger" loading={busy} onClick={submit}>{busy ? '기록 중' : '확정'}</Button></>}
      </div>
    </Modal>
  );
}

function HistoryPanel({ history, onClose }) {
  const h = history;
  return (
    <section style={card} aria-label="단계 이력">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2 style={{ fontSize: 16, margin: '0 0 8px' }}>이력 — {h.phase.name} (r{h.phase.scheduleRevision})</h2><Button size="sm" variant="ghost" onClick={onClose}>닫기</Button></div>
      <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>일정 변경</h3>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.7 }}>
        {h.revisions.map((r) => <li key={r.revision}>r{r.revision} · {r.prevScheduledAt ? `${formatKst(Date.parse(r.prevScheduledAt))} → ` : ''}{r.newScheduledAt ? formatKst(Date.parse(r.newScheduledAt)) : '—'} · {SCHEDULE_STATUS_LABEL[r.newScheduleStatus]} · {r.reason} · {r.changedBy}</li>)}
      </ul>
      <h3 style={{ fontSize: 14, margin: '12px 0 4px' }}>오픈 상태 전이</h3>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.7 }}>
        {h.statusLogs.map((l, i) => <li key={i}>{formatKst(Date.parse(l.at))} · {l.from ? `${OPEN_STATUS_META[l.from]?.label} → ` : ''}{OPEN_STATUS_META[l.to]?.label} · {l.reason} · {l.actor}</li>)}
      </ul>
      <h3 style={{ fontSize: 14, margin: '12px 0 4px' }}>오픈 확인 기록</h3>
      {h.verifications.length === 0 ? <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>없음</p> : (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.7 }}>
          {h.verifications.map((v, i) => <li key={i}>{formatKst(Date.parse(v.checkedAt))} · {v.result} ({v.method}) · {v.evidence}{v.diffFromScheduledMs != null && Math.abs(v.diffFromScheduledMs) >= 60_000 ? ` · 공지와 실제 ${Math.round(v.diffFromScheduledMs / 60000)}분 차이` : ''}</li>)}
        </ul>
      )}
    </section>
  );
}
