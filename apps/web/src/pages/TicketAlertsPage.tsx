import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { COLORS } from '../constants/colors';
import { apiError, SCHEDULE_STATUS_LABEL, ticketApi } from '../services/ticketApi';
import { notifyTicketUnreadChanged } from '../hooks/useTicketUnread';
import { ago, formatKst } from '../utils/serverClock';

const OFFSET_LABEL = { '24h': '24시간 전', '1h': '1시간 전', '10m': '10분 전', '1m': '1분 전' };
const KIND_ICON = { REMINDER: '🔔', CHANGE: '🔁', CANCEL: '⚠️', ADMIN_ALERT: '🛠', TEST: '🧪' };

/** 내 예매 알림 (/tickets/alerts, 로그인) — v2. 탭: 받은 알림 | 켠 알림(+ v3 구독 캘린더·메일로도 받기) */
export default function TicketAlertsPage() {
  const [tab, setTab] = useState<'inbox' | 'subs'>('inbox');
  const [inbox, setInbox] = useState<any>(null);
  const [subs, setSubs] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadInbox = useCallback(async (page = 0) => {
    try {
      const r = await ticketApi.notifications(page);
      setInbox((cur) => (page === 0 || !cur ? r : { ...r, data: [...cur.data, ...r.data.filter((n) => !cur.data.some((c) => c.id === n.id))] }));
    } catch (e) {
      setError(apiError(e, '알림을 불러오지 못했어요.'));
    }
  }, []);

  useEffect(() => {
    loadInbox(0);
    ticketApi.myAlerts().then(setSubs).catch((e) => setError(apiError(e, '켠 알림을 불러오지 못했어요.')));
  }, [loadInbox]);

  const read = async (n) => {
    if (n.read) return;
    setInbox((cur) => ({ ...cur, unreadCount: Math.max(0, cur.unreadCount - 1), data: cur.data.map((x) => (x.id === n.id ? { ...x, read: true } : x)) }));
    try { await ticketApi.markRead(n.id); notifyTicketUnreadChanged(); } catch { loadInbox(0); }
  };
  const readAll = async () => {
    try {
      await ticketApi.readAll();
      setInbox((cur) => ({ ...cur, unreadCount: 0, data: cur.data.map((x) => ({ ...x, read: true })) }));
      notifyTicketUnreadChanged();
    } catch (e) { setMsg(apiError(e)); }
  };
  const turnOff = async (s) => {
    if (!window.confirm(`"${s.sessionTitle} · ${s.phaseName}" 알림을 끌까요? 예약된 알림이 모두 취소됩니다.`)) return;
    try {
      await ticketApi.removeAlert(s.phaseId);
      setSubs((cur) => cur!.filter((x) => x.phaseId !== s.phaseId));
      setMsg('알림을 껐어요.');
    } catch (e) { setMsg(apiError(e, '알림을 끄지 못했어요.')); }
  };

  const toggleEmail = async (s, email: boolean) => {
    setSubs((cur) => cur!.map((x) => (x.phaseId === s.phaseId ? { ...x, email } : x)));
    try {
      await ticketApi.setEmail(s.phaseId, s.offsets, email);
      setMsg(email ? '이 일정 알림을 메일로도 보내 드려요.' : '메일 알림을 껐어요.');
    } catch (e) {
      setSubs((cur) => cur!.map((x) => (x.phaseId === s.phaseId ? { ...x, email: !email } : x)));
      setMsg(apiError(e, '메일 설정을 바꾸지 못했어요.'));
    }
  };

  const tabBtn = (key: 'inbox' | 'subs', label: string, count: number | null) => (
    <button role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
      style={{ flex: 1, border: 0, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        background: tab === key ? COLORS.surface : 'transparent', color: tab === key ? COLORS.text : COLORS.textSecondary, boxShadow: tab === key ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
      {label}{count ? ` ${count}` : ''}
    </button>
  );

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px 80px' }}>
      <Link to="/tickets" style={{ color: COLORS.textSecondary, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>← 전체 일정</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: '12px 0 16px' }}>내 예매 알림</h1>
      <div role="tablist" aria-label="알림 보기" style={{ display: 'flex', gap: 4, background: COLORS.border, borderRadius: 12, padding: 4, marginBottom: 16 }}>
        {tabBtn('inbox', '받은 알림', inbox?.unreadCount ?? null)}
        {tabBtn('subs', '켠 알림', subs?.length ?? null)}
      </div>
      {error && <p role="alert" style={{ color: COLORS.danger, fontSize: 14 }}>{error}</p>}
      {msg && <p role="status" style={{ color: COLORS.textSecondary, fontSize: 13 }}>{msg}</p>}

      {tab === 'inbox' ? (
        inbox === null ? <Skeleton /> : inbox.data.length === 0 ? (
          <Empty icon="🔔" title="아직 받은 알림이 없어요" desc="예매 일정에서 알림을 켜면 시작 전에 알려 드려요." />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <Button size="sm" variant="ghost" disabled={!inbox.unreadCount} onClick={readAll}>모두 읽음</Button>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, background: COLORS.surface, borderRadius: 16, overflow: 'hidden' }}>
              {inbox.data.map((n) => (
                <li key={n.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <button onClick={() => read(n)} aria-label={`${n.read ? '' : '안 읽음, '}${n.message}`}
                    style={{ display: 'flex', gap: 12, width: '100%', textAlign: 'left', border: 0, cursor: n.read ? 'default' : 'pointer', padding: '14px 16px',
                      background: COLORS.surface, borderLeft: `3px solid ${n.read ? 'transparent' : COLORS.primary}` }}>
                    <span aria-hidden style={{ fontSize: 18 }}>{KIND_ICON[n.kind] ?? '🔔'}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, color: COLORS.text, fontWeight: n.read ? 400 : 700, overflowWrap: 'anywhere' }}>{n.message}</span>
                      <span style={{ display: 'block', fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{ago(n.createdAt, Date.now())}</span>
                    </span>
                    {!n.read && <span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: COLORS.primary, marginTop: 6, flexShrink: 0 }} />}
                  </button>
                </li>
              ))}
            </ul>
            {inbox.hasNext && <div style={{ textAlign: 'center', marginTop: 12 }}><Button variant="secondary" onClick={() => loadInbox(inbox.page + 1)}>더 보기</Button></div>}
          </>
        )
      ) : subs === null ? <Skeleton /> : <>
      <CalendarFeedCard />
      {subs.length === 0 ? (
        <Empty icon="🎫" title="켜 둔 알림이 없어요" desc="보고 싶은 예매 일정에서 알림을 켜 보세요." link />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
          {subs.map((s) => (
            <li key={s.phaseId} style={{ background: COLORS.surface, borderRadius: 16, padding: 18 }}>
              <div style={{ fontWeight: 700, color: COLORS.text, overflowWrap: 'anywhere' }}>{s.sessionTitle}</div>
              <div style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 2 }}>
                {s.phaseName} · {formatKst(Date.parse(s.scheduledAt)).replace(/:00 KST$/, ' KST')}
                {s.scheduleStatus !== 'CONFIRMED' && <span style={{ color: '#8A5A00' }}> · {SCHEDULE_STATUS_LABEL[s.scheduleStatus] ?? s.scheduleStatus}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0 12px' }}>
                {s.offsets.map((o) => <span key={o} style={{ background: COLORS.primaryLight, color: COLORS.primaryDark, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>{OFFSET_LABEL[o] ?? o}</span>)}
              </div>
              <EmailSwitch checked={!!s.email} available={s.mailAvailable !== false} onChange={(v) => toggleEmail(s, v)} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link to={`/tickets/${s.sessionId}`} style={{ color: COLORS.primary, fontWeight: 700, fontSize: 14, textDecoration: 'none', padding: '6px 0' }}>설정 바꾸기 →</Link>
                <Button size="sm" variant="ghost" onClick={() => turnOff(s)} style={{ color: COLORS.danger, marginLeft: 'auto' }}>끄기</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      </>}
    </main>
  );
}

function Skeleton() {
  return <div aria-busy="true" aria-label="불러오는 중" style={{ display: 'grid', gap: 8 }}>{[0, 1, 2].map((i) => <div key={i} style={{ height: 64, borderRadius: 12, background: COLORS.border, animation: 'pulse 1.4s ease-in-out infinite' }} />)}</div>;
}

function Empty({ icon, title, desc, link }: { icon: string; title: string; desc: string; link?: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 16px', background: COLORS.surface, borderRadius: 16, color: COLORS.textSecondary }}>
      <div aria-hidden style={{ fontSize: 36 }}>{icon}</div>
      <p style={{ fontWeight: 700, color: COLORS.text, margin: '8px 0 4px' }}>{title}</p>
      <p style={{ margin: 0, fontSize: 14 }}>{desc}</p>
      {link && <Link to="/tickets" style={{ display: 'inline-block', marginTop: 12, color: COLORS.primary, fontWeight: 700, textDecoration: 'none' }}>예매 일정 보러 가기 →</Link>}
    </div>
  );
}

/** 메일로도 받기 스위치 — 서버에 메일 설정이 없으면 비활성 */
function EmailSwitch({ checked, available, onChange }: { checked: boolean; available: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 10, rowGap: 4, marginBottom: 12 }}>
      <button type="button" role="switch" aria-checked={checked} aria-label="메일로도 받기" disabled={!available} onClick={() => onChange(!checked)}
        className="tk-switch"
        style={{ position: 'relative', width: 44, height: 24, borderRadius: 999, border: 0, flexShrink: 0, padding: 0, cursor: available ? 'pointer' : 'not-allowed',
          background: checked && available ? COLORS.primary : COLORS.border, opacity: available ? 1 : 0.6, transition: 'background 0.15s ease' }}>
        <span aria-hidden style={{ position: 'absolute', top: 2, left: checked && available ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)', transition: 'left 0.15s ease' }} />
      </button>
      <span style={{ fontSize: 14, color: COLORS.text, whiteSpace: 'nowrap' }}>✉️ 메일로도 받기</span>
      {!available && <span style={{ fontSize: 12, color: COLORS.textMuted }}>지금은 메일을 보낼 수 없어요</span>}
      <style>{`.tk-switch:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }`}</style>
    </div>
  );
}

/** 구독 캘린더(webcal) — 켠 알림 전부를 기기 캘린더가 알아서 갱신. 링크는 발급 직후에만 보인다 */
function CalendarFeedCard() {
  const [feed, setFeed] = useState<any>(null);
  const [issued, setIssued] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [failed, setFailed] = useState('');

  useEffect(() => { ticketApi.feed().then(setFeed).catch((e) => setFailed(apiError(e, '구독 상태를 불러오지 못했어요.'))); }, []);

  const issue = async () => {
    if (feed?.active && !window.confirm('새 링크를 만들면 지금 쓰는 링크는 바로 끊겨요. 캘린더 앱에 새 링크를 다시 넣어야 해요. 계속할까요?')) return;
    setBusy(true); setNote('');
    try {
      const r = await ticketApi.issueFeed();
      setIssued(r);
      setFeed({ active: true, createdAt: r.createdAt, lastAccessedAt: null });
    } catch (e) { setNote(apiError(e, '링크를 만들지 못했어요.')); }
    setBusy(false);
  };
  const off = async () => {
    if (!window.confirm('구독을 끌까요? 캘린더 앱에 넣어 둔 링크가 더 이상 갱신되지 않아요.')) return;
    setBusy(true); setNote('');
    try {
      await ticketApi.deleteFeed();
      setIssued(null);
      setFeed({ active: false, createdAt: null, lastAccessedAt: null });
      setNote('구독을 껐어요.');
    } catch (e) { setNote(apiError(e, '구독을 끄지 못했어요.')); }
    setBusy(false);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(issued.url); setNote('링크를 복사했어요.'); }
    catch { setNote('복사하지 못했어요. 입력란을 길게 눌러 직접 복사해 주세요.'); }
  };

  const card: React.CSSProperties = { background: COLORS.surface, borderRadius: 16, padding: 18, marginBottom: 12 };
  if (failed) return <div style={card}><p role="alert" style={{ margin: 0, color: COLORS.danger, fontSize: 14 }}>{failed}</p></div>;
  if (!feed) return <div aria-busy="true" aria-label="구독 상태 불러오는 중" style={{ ...card, height: 72, background: COLORS.border, animation: 'pulse 1.4s ease-in-out infinite' }} />;
  return (
    <section aria-labelledby="feed-title" style={card}>
      <h2 id="feed-title" style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, margin: '0 0 4px' }}>📅 캘린더 구독</h2>
      {issued ? (
        <>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: COLORS.textSecondary }}>캘린더 앱의 "URL로 구독"에 이 링크를 넣으세요.</p>
          <input readOnly value={issued.url} aria-label="구독 링크" onFocus={(e) => e.currentTarget.select()}
            style={{ width: '100%', boxSizing: 'border-box', height: 40, padding: '0 12px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.text, fontSize: 13, textOverflow: 'ellipsis' }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <Button size="sm" onClick={copy}>복사</Button>
            <a href={issued.webcalUrl} style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 12px', borderRadius: 10, border: `1px solid ${COLORS.border}`, color: COLORS.text, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>캘린더 앱에서 열기</a>
          </div>
          <p style={{ margin: '10px 0 0', padding: '8px 10px', borderRadius: 8, background: '#FFF4D6', color: '#8A5A00', fontSize: 12 }}>이 링크는 지금만 보여요. 잃어버리면 새로 만드세요. 링크를 아는 사람은 켠 일정을 볼 수 있으니 공유하지 마세요.</p>
        </>
      ) : feed.active ? (
        <p style={{ margin: '0 0 10px', fontSize: 13, color: COLORS.textSecondary }}>
          <b style={{ color: '#007A45' }}>구독 중</b> · {formatKst(Date.parse(feed.createdAt)).replace(/:\d\d KST$/, '')} 만듦
          {' · '}{feed.lastAccessedAt ? `마지막으로 가져감 ${ago(feed.lastAccessedAt, Date.now())}` : '아직 캘린더 앱이 가져가지 않았어요'}
        </p>
      ) : (
        <p style={{ margin: '0 0 10px', fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.6 }}>
          켠 알림이 기기 캘린더에 자동으로 들어가요.<br />반영은 캘린더 앱에 따라 몇 시간 늦을 수 있어요.
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: issued ? 10 : 0 }}>
        {!feed.active ? <Button size="sm" loading={busy} onClick={issue}>구독 링크 만들기</Button> : (
          <>
            <Button size="sm" variant="secondary" disabled={busy} onClick={issue}>새 링크 만들기</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={off} style={{ color: COLORS.danger, marginLeft: 'auto' }}>구독 끄기</Button>
          </>
        )}
      </div>
      {note && <p role="status" style={{ margin: '8px 0 0', fontSize: 13, color: COLORS.textSecondary }}>{note}</p>}
    </section>
  );
}
