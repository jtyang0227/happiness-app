import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { COLORS } from '../constants/colors';
import { apiError, SCHEDULE_STATUS_LABEL, ticketApi } from '../services/ticketApi';
import { ago, formatKst } from '../utils/serverClock';

const OFFSET_LABEL = { '24h': '24시간 전', '1h': '1시간 전', '10m': '10분 전', '1m': '1분 전' };
const KIND_ICON = { REMINDER: '🔔', CHANGE: '🔁', CANCEL: '⚠️', ADMIN_ALERT: '🛠', TEST: '🧪' };

/** 내 예매 알림 (/tickets/alerts, 로그인) — v2. 탭: 받은 알림 | 켠 알림 */
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
    try { await ticketApi.markRead(n.id); } catch { loadInbox(0); }
  };
  const readAll = async () => {
    try {
      await ticketApi.readAll();
      setInbox((cur) => ({ ...cur, unreadCount: 0, data: cur.data.map((x) => ({ ...x, read: true })) }));
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
      ) : subs === null ? <Skeleton /> : subs.length === 0 ? (
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
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link to={`/tickets/${s.sessionId}`} style={{ color: COLORS.primary, fontWeight: 700, fontSize: 14, textDecoration: 'none', padding: '6px 0' }}>설정 바꾸기 →</Link>
                <Button size="sm" variant="ghost" onClick={() => turnOff(s)} style={{ color: COLORS.danger, marginLeft: 'auto' }}>끄기</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
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
