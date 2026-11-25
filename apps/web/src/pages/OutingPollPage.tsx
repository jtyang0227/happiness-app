import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { mq } from '../constants/breakpoints';
import Button from '../components/common/Button';
import { FormField, Input } from '../components/common/Input';
import useAuthStore from '../store/authStore';
import outingApi, { errorMessage, isAdminUser } from '../services/outingApi';

/* SNAPDAY 월간 출사 투표 달력 — 날짜마다 가능/불가, 서버 집계, 추천 날짜, 관리자 도구(평일 추가·마감·리마인드·확정).
   디자인: DESIGN_PROMPTS/design/DESIGN_PROMPT_snapday-outing.md 1절 */

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const STATUS = {
  OPEN:      { label: '투표 중', bg: COLORS.primaryLight, color: COLORS.primary },
  CLOSED:    { label: '마감',    bg: COLORS.surfaceDim,   color: COLORS.textSecondary },
  CONFIRMED: { label: '확정',    bg: COLORS.successTonal, color: COLORS.successText },
};
const pad = (n: number) => String(n).padStart(2, '0');
const dateLabel = (d: string) => {
  const [, m, day] = d.split('-').map(Number);
  return `${m}월 ${day}일(${WD[new Date(`${d}T00:00:00Z`).getUTCDay()]})`;
};
function remaining(endsAt?: string | null) {
  if (!endsAt) return '';
  const ms = new Date(`${endsAt}Z`).getTime() - Date.now();
  if (ms <= 0) return '마감 시각 지남';
  const h = Math.floor(ms / 3600000);
  return h >= 48 ? `마감까지 ${Math.floor(h / 24)}일` : h >= 1 ? `마감까지 ${h}시간` : `마감까지 ${Math.max(1, Math.floor(ms / 60000))}분`;
}

export default function OutingPollPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s: any) => s.user);
  const admin = isAdminUser(user);
  const [poll, setPoll] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoadError('');
    outingApi.getPoll(id!).then(setPoll).catch((e) => setLoadError(errorMessage(e, '투표를 불러오지 못했어요.')));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const byDate = useMemo(() => new Map((poll?.options ?? []).map((o: any) => [o.date, o])), [poll]);
  const maxAvail = useMemo(() => Math.max(1, ...(poll?.options ?? []).map((o: any) => o.available)), [poll]);
  const recommended = useMemo(() => new Set(poll?.recommended ?? []), [poll]);
  const confirmedId = poll?.confirmedOptionId;

  const run = async (fn: () => Promise<any>, fallback: string) => {
    setError('');
    setSaving(true);
    try {
      const r = await fn();
      if (r && r.options) setPoll(r);
      return r;
    } catch (e) {
      setError(errorMessage(e, fallback));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const vote = (optionId: number, availability: string | null) =>
    run(() => outingApi.vote(id!, [{ optionId, availability }]), '응답을 저장하지 못했어요.');

  if (loadError) {
    return <Center><p style={{ color: COLORS.textSecondary }}>{loadError}</p><Button variant="secondary" onClick={() => navigate('/gatherings/polls')}>투표 목록으로</Button></Center>;
  }
  if (!poll) return <PollSkeleton />;

  const st = STATUS[poll.status] || STATUS.CLOSED;
  const first = new Date(Date.UTC(poll.year, poll.month - 1, 1));
  const days = new Date(Date.UTC(poll.year, poll.month, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(first.getUTCDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const sel: any = selected ? byDate.get(selected) : null;
  const canVote = !!user && poll.votingOpen;

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 96 }}>
      <style>{`
        .poll-layout { display:grid; grid-template-columns: minmax(0,1.3fr) minmax(0,1fr); gap:16px; align-items:start; }
        ${mq.upToTablet} { .poll-layout { grid-template-columns: minmax(0,1fr); } }
        .poll-cell:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
      `}</style>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px' }}>
        <button onClick={() => navigate(`/gatherings/polls?year=${poll.year}`)} style={{ background: 'none', border: 'none', color: COLORS.textSecondary, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>
          ← {poll.year}년 투표 목록
        </button>

        {/* 머리말 */}
        <div style={{ ...panel, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: st.bg, color: st.color }}>{st.label}</span>
            {poll.status === 'OPEN' && <span style={{ fontSize: 13, color: COLORS.textMuted }}>{poll.votingOpen ? remaining(poll.endsAt) : '지금은 응답할 수 없어요'}</span>}
            <span style={{ fontSize: 13, color: COLORS.textMuted }}>· 응답 {poll.voterCount}명</span>
          </div>
          <h1 style={{ margin: '10px 0 4px', fontSize: 22, fontWeight: 700, color: COLORS.text }}>{poll.title}</h1>
          {(poll.region || poll.description) && (
            <p style={{ margin: 0, fontSize: 14, color: COLORS.textSecondary, whiteSpace: 'pre-line' }}>
              {poll.region ? `📍 ${poll.region}` : ''}{poll.region && poll.description ? ' · ' : ''}{poll.description}
            </p>
          )}
          <p style={{ margin: '8px 0 0', fontSize: 13, color: COLORS.textMuted }}>
            실제로 참여할 수 있는 날짜에 "가능"을 눌러 주세요. 여러 날짜를 고를 수 있고, 마감 전까지 바꿀 수 있어요.
            {poll.minParticipants ? ` 최소 ${poll.minParticipants}명이 가능한 날짜만 추천해요.` : ''}
          </p>
          {poll.status === 'CONFIRMED' && poll.gatheringId && (
            <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: COLORS.successTonal, color: COLORS.successText, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span>📅 {confirmedId ? dateLabel(poll.options.find((o: any) => o.id === confirmedId)?.date ?? '') : ''} 출사로 확정됐어요</span>
              <Link to={`/gatherings/${poll.gatheringId}`} style={{ color: COLORS.successText }}>출사 보러 가기 →</Link>
            </div>
          )}
          {!user && poll.votingOpen && (
            <div style={{ marginTop: 12 }}><Button size="sm" onClick={() => navigate('/login', { state: { from: { pathname: `/gatherings/polls/${id}` } } })}>로그인하고 응답하기</Button></div>
          )}
        </div>

        {error && <div role="alert" style={{ padding: '12px 16px', borderRadius: 10, background: COLORS.dangerTonal, color: COLORS.danger, fontSize: 14, marginBottom: 16 }}>{error}</div>}

        <div className="poll-layout">
          {/* 달력 */}
          <div style={panel}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 4, marginBottom: 6 }}>
              {WD.map((w, i) => (
                <div key={w} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: i === 0 ? COLORS.danger : i === 6 ? COLORS.primary : COLORS.textMuted }}>{w}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 4 }}>
              {cells.map((d, i) => {
                if (d == null) return <div key={i} />;
                const key = `${poll.year}-${pad(poll.month)}-${pad(d)}`;
                const o: any = byDate.get(key);
                const wd = i % 7;
                const red = wd === 0 || o?.dayKind === 'HOLIDAY';
                const numColor = red ? COLORS.danger : wd === 6 ? COLORS.primary : COLORS.text;
                if (!o) {
                  return <div key={i} style={{ minHeight: 56, padding: 6, fontSize: 13, color: COLORS.textHint }}>{d}</div>;
                }
                const isConfirmed = o.id === confirmedId;
                const isSel = selected === key;
                const bg = isConfirmed ? COLORS.primary : o.mine === 'AVAILABLE' ? COLORS.successTonal : o.mine === 'UNAVAILABLE' ? COLORS.surfaceDim : COLORS.surface;
                return (
                  <button
                    key={i}
                    className="poll-cell"
                    onClick={() => setSelected(isSel ? null : key)}
                    aria-pressed={isSel}
                    aria-label={`${dateLabel(key)}${o.label ? ` ${o.label}` : ''}, 가능 ${o.available}명${o.mine === 'AVAILABLE' ? ', 내 응답 가능' : o.mine === 'UNAVAILABLE' ? ', 내 응답 불가' : ''}${recommended.has(o.id) ? ', 추천 날짜' : ''}`}
                    style={{
                      position: 'relative', minHeight: 56, padding: '6px 4px', borderRadius: 10, cursor: 'pointer', font: 'inherit',
                      background: bg, textAlign: 'center',
                      border: isSel ? `2px solid ${COLORS.primary}` : o.mine ? `1px solid ${COLORS.border}` : `1px dashed ${COLORS.border}`,
                      color: isConfirmed ? '#fff' : numColor, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}
                  >
                    {recommended.has(o.id) && !isConfirmed && <span aria-hidden style={{ position: 'absolute', top: 2, right: 4, fontSize: 10, color: COLORS.warning }}>★</span>}
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{d}</span>
                    {o.label && <span style={{ fontSize: 9, lineHeight: 1.1, color: isConfirmed ? '#fff' : COLORS.danger, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>}
                    <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: isConfirmed ? '#fff' : o.available ? COLORS.successText : COLORS.textMuted }}>
                      {o.mine === 'AVAILABLE' ? '✓ ' : o.mine === 'UNAVAILABLE' ? '✕ ' : ''}{o.available}명
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12, fontSize: 12, color: COLORS.textMuted }}>
              <Legend bg={COLORS.successTonal} label="내가 가능" />
              <Legend bg={COLORS.surfaceDim} label="내가 불가" />
              <Legend bg={COLORS.surface} dashed label="미응답" />
              <span>★ 추천</span>
            </div>

            {/* 선택한 날짜 */}
            {sel && (
              <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: COLORS.bg }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{dateLabel(sel.date)}{sel.label ? ` · ${sel.label}` : ''}</div>
                <div style={{ fontSize: 13, color: COLORS.textSecondary, margin: '4px 0 10px' }}>가능 {sel.available}명 · 불가 {sel.unavailable}명</div>
                {canVote ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button size="sm" variant={sel.mine === 'AVAILABLE' ? 'primary' : 'secondary'} loading={saving} onClick={() => vote(sel.id, 'AVAILABLE')}>✓ 가능</Button>
                    <Button size="sm" variant={sel.mine === 'UNAVAILABLE' ? 'primary' : 'secondary'} loading={saving} onClick={() => vote(sel.id, 'UNAVAILABLE')}>✕ 불가</Button>
                    {sel.mine && <Button size="sm" variant="ghost" loading={saving} onClick={() => vote(sel.id, null)}>응답 지우기</Button>}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted }}>{user ? '지금은 응답할 수 없어요.' : '로그인하면 응답할 수 있어요.'}</p>
                )}
                {admin && poll.status !== 'CONFIRMED' && sel.dayKind === 'WEEKDAY' && (
                  <Button size="sm" variant="danger" style={{ marginTop: 10 }} loading={saving}
                    onClick={() => window.confirm(`${dateLabel(sel.date)} 후보를 지울까요? 이 날짜의 응답도 함께 지워집니다.`) && run(() => outingApi.removeOption(id!, sel.id), '후보를 지우지 못했어요.').then(() => setSelected(null))}>
                    이 평일 후보 지우기
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 집계 + 관리자 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={panel}>
              <h2 style={h2}>날짜별 가능 인원</h2>
              {poll.options.length === 0 ? (
                <p style={{ margin: 0, fontSize: 14, color: COLORS.textMuted }}>아직 후보 날짜가 없어요.</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {poll.options.map((o: any) => (
                    <li key={o.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, gap: 8 }}>
                        <span style={{ color: COLORS.text, fontWeight: recommended.has(o.id) ? 700 : 500 }}>
                          {recommended.has(o.id) && '★ '}{dateLabel(o.date)}{o.label ? ` · ${o.label}` : ''}
                        </span>
                        <span style={{ color: COLORS.textSecondary, whiteSpace: 'nowrap' }}>{o.available}명</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: COLORS.surfaceDim, overflow: 'hidden' }}>
                        <div style={{ width: `${(o.available / maxAvail) * 100}%`, height: '100%', borderRadius: 999, background: recommended.has(o.id) || o.id === confirmedId ? COLORS.primary : COLORS.primaryTonal, transition: 'width 0.3s ease' }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {admin && <AdminTools poll={poll} saving={saving} run={run} onDeleted={() => navigate(`/gatherings/polls?year=${poll.year}`)} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminTools({ poll, saving, run, onDeleted }: { poll: any; saving: boolean; run: (fn: () => Promise<any>, fallback: string) => Promise<any>; onDeleted: () => void }) {
  const navigate = useNavigate();
  const [weekday, setWeekday] = useState('');
  const [notice, setNotice] = useState('');
  const best = poll.recommended?.[0] ?? poll.options[0]?.id ?? '';
  const [form, setForm] = useState({ optionId: String(best), title: poll.title, location: poll.region ?? '', startTime: '10:00', endTime: '17:00', maxParticipants: poll.maxParticipants ? String(poll.maxParticipants) : '' });
  useEffect(() => { setForm((f) => ({ ...f, optionId: f.optionId || String(best) })); }, [best]);
  const monthMin = `${poll.year}-${pad(poll.month)}-01`;
  const monthMax = `${poll.year}-${pad(poll.month)}-${pad(new Date(Date.UTC(poll.year, poll.month, 0)).getUTCDate())}`;
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  if (poll.status === 'CONFIRMED') return null;
  const opt = poll.options.find((o: any) => String(o.id) === form.optionId);

  const confirm = async () => {
    if (!opt) return;
    if (!form.location.trim()) { setNotice('집합 장소를 입력해 주세요.'); return; }
    if (!window.confirm(`${dateLabel(opt.date)} ${form.startTime}~${form.endTime}, "${form.location}"(으)로 확정할까요?\n모임이 만들어지고 가능 응답자 ${opt.available}명에게 알림이 갑니다. 확정 후에는 되돌릴 수 없어요.`)) return;
    const r = await run(() => outingApi.confirm(poll.id, {
      optionId: Number(form.optionId), title: form.title, location: form.location, startTime: form.startTime, endTime: form.endTime,
      maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
    }), '확정하지 못했어요.');
    if (r?.gatheringId) navigate(`/gatherings/${r.gatheringId}`);
  };

  return (
    <div style={panel}>
      <h2 style={h2}>🛠 운영 도구</h2>
      {notice && <p role="status" style={{ margin: '0 0 10px', fontSize: 13, color: COLORS.textSecondary }}>{notice}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {poll.status === 'OPEN'
          ? <Button size="sm" variant="secondary" loading={saving} onClick={() => window.confirm('투표를 마감할까요?') && run(() => outingApi.close(poll.id), '마감하지 못했어요.')}>투표 마감</Button>
          : <Button size="sm" variant="secondary" loading={saving} onClick={() => run(() => outingApi.reopen(poll.id), '다시 열지 못했어요.')}>다시 열기</Button>}
        {poll.votingOpen && (
          <Button size="sm" variant="secondary" loading={saving}
            onClick={async () => { const r = await run(() => outingApi.remind(poll.id), '리마인드를 보내지 못했어요.'); if (r) setNotice(`미응답 ${r.sent}명에게 알림을 보냈어요.`); }}>
            미응답 리마인드
          </Button>
        )}
        <Button size="sm" variant="danger" loading={saving}
          onClick={async () => { if (!window.confirm('이 투표를 삭제할까요? 응답이 모두 지워집니다.')) return; if (!window.confirm('정말 삭제할까요? 되돌릴 수 없어요.')) return; try { await outingApi.deletePoll(poll.id); onDeleted(); } catch (e) { setNotice(errorMessage(e, '삭제하지 못했어요.')); } }}>
          투표 삭제
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <FormField label="평일 후보 추가" id="poll-weekday">
            <Input id="poll-weekday" type="date" min={monthMin} max={monthMax} value={weekday} onChange={(e: any) => setWeekday(e.target.value)} />
          </FormField>
        </div>
        <Button size="md" variant="secondary" disabled={!weekday} loading={saving} style={{ marginBottom: 16 }}
          onClick={() => run(() => outingApi.addOption(poll.id, weekday), '날짜를 추가하지 못했어요.').then((r) => r && setWeekday(''))}>
          추가
        </Button>
      </div>

      <h3 style={{ ...h2, fontSize: 15 }}>출사 날짜 확정</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <FormField label="날짜" id="confirm-option">
          <select id="confirm-option" value={form.optionId} onChange={set('optionId')} style={selectStyle}>
            {poll.options.map((o: any) => <option key={o.id} value={o.id}>{(poll.recommended ?? []).includes(o.id) ? '★ ' : ''}{dateLabel(o.date)} — 가능 {o.available}명</option>)}
          </select>
        </FormField>
        <FormField label="출사 제목" id="confirm-title"><Input id="confirm-title" value={form.title} maxLength={100} onChange={set('title')} /></FormField>
        <FormField label="집합 장소" id="confirm-location"><Input id="confirm-location" value={form.location} maxLength={300} placeholder="예: 대릉원 정문" onChange={set('location')} /></FormField>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><FormField label="집합 시각" id="confirm-start"><Input id="confirm-start" type="time" value={form.startTime} onChange={set('startTime')} /></FormField></div>
          <div style={{ flex: 1 }}><FormField label="종료 시각" id="confirm-end"><Input id="confirm-end" type="time" value={form.endTime} onChange={set('endTime')} /></FormField></div>
        </div>
        <FormField label="정원(비우면 가능 인원 기준)" id="confirm-max"><Input id="confirm-max" type="number" min={1} value={form.maxParticipants} onChange={set('maxParticipants')} /></FormField>
        <Button fullWidth disabled={!opt} loading={saving} onClick={confirm}>이 날짜로 확정하고 모임 만들기</Button>
      </div>
    </div>
  );
}

function Legend({ bg, label, dashed }: { bg: string; label: string; dashed?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span aria-hidden style={{ width: 12, height: 12, borderRadius: 4, background: bg, border: `1px ${dashed ? 'dashed' : 'solid'} ${COLORS.border}` }} />{label}
    </span>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>{children}</div>;
}

function PollSkeleton() {
  const blk = (h: number, w: string | number = '100%') => <div style={{ height: h, width: w, borderRadius: 10, background: COLORS.surfaceDim, animation: 'poll-sk 1.4s ease-in-out infinite' }} />;
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px' }} aria-busy="true" aria-label="불러오는 중">
      <style>{'@keyframes poll-sk { 0%{opacity:.55} 50%{opacity:1} 100%{opacity:.55} }'}</style>
      <div style={{ ...panel, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>{blk(20, 80)}{blk(26, '60%')}{blk(14, '80%')}</div>
      <div style={{ ...panel, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>{Array.from({ length: 35 }, (_, i) => <div key={i}>{blk(56)}</div>)}</div>
    </div>
  );
}

const panel: React.CSSProperties = { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };
const h2: React.CSSProperties = { margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: COLORS.text };
const selectStyle: React.CSSProperties = { width: '100%', height: 44, borderRadius: 10, border: `1px solid ${COLORS.border}`, padding: '0 12px', fontSize: 14, background: COLORS.surface, color: COLORS.text };
