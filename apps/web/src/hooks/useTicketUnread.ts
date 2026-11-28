import { useEffect, useState } from 'react';
import { ticketApi } from '../services/ticketApi';

/** 알림함에서 읽음 처리 직후 다른 곳(헤더·프로필)의 숫자를 바로 다시 세게 하는 신호 */
export const TICKET_UNREAD_EVENT = 'ticket-unread-changed';
export const notifyTicketUnreadChanged = () => window.dispatchEvent(new Event(TICKET_UNREAD_EVENT));

/**
 * 읽지 않은 예매 알림 수 (v3) — 로그인 회원만, 60초마다(탭이 숨겨져 있으면 건너뜀) + 알림함 신호.
 * 실패하면 마지막 값을 유지한다(잠깐의 네트워크 오류로 배지가 사라지지 않게).
 */
export function useTicketUnread(memberId?: number | string | null): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!memberId) { setCount(0); return undefined; }
    let alive = true;
    const load = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      ticketApi.unreadCount().then((r) => { if (alive) setCount(Number(r?.count) || 0); }).catch(() => {});
    };
    load();
    const t = setInterval(load, 60_000);
    window.addEventListener(TICKET_UNREAD_EVENT, load);
    document.addEventListener('visibilitychange', load);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener(TICKET_UNREAD_EVENT, load);
      document.removeEventListener('visibilitychange', load);
    };
  }, [memberId]);
  return count;
}
