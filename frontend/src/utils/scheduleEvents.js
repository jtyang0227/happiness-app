import { COLORS } from '../constants/colors';
import { bookingApi } from '../services/bookingApi';
import meetApi from '../services/meetApi';
import gatheringApi from '../services/gatheringApi';
import { dateKeyOf } from '../components/calendar/UnifiedCalendar';

/**
 * 통합 일정 — 확정 예약 · 확정 약속 · 예정/진행 중 모임을 한 목록으로 (통합 달력 /calendar 와 업무 "한눈에" /workspace 공유).
 * 3개 API를 Promise.allSettled로 병렬 호출해, 하나가 실패해도 나머지는 그대로 돌려준다.
 */
export const TYPE_META = {
  booking:   { label: '예약',  bg: COLORS.primaryLight, color: COLORS.primary,  dot: COLORS.primary },
  meet:      { label: '약속',  bg: COLORS.successTonal, color: COLORS.success,  dot: COLORS.success },
  gathering: { label: '모임',  bg: '#FFF6E5',           color: '#B45309',       dot: '#B45309' },
};

function formatTime(t) {
  return t || '';
}

/** @returns {Promise<{ events: Array, failedLabels: string[] }>} */
export async function loadScheduleEvents(currentUserId) {
  const [bookingResult, meetResult, gatheringResult] = await Promise.allSettled([
    bookingApi.getMyBookings('CONFIRMED'),
    meetApi.list(),
    gatheringApi.getMy(),
  ]);
  const failedLabels = [];
  const events = [];

  if (bookingResult.status === 'fulfilled') {
    const bookings = Array.isArray(bookingResult.value) ? bookingResult.value : [];
    for (const b of bookings) {
      const key = dateKeyOf(b.shootDate);
      if (!key) continue;
      events.push({
        id: `booking-${b.id}`,
        type: 'booking',
        dateKey: key,
        title: b.clientName ? `${b.clientName} 촬영` : '촬영 예약',
        time: formatTime(b.shootTime),
        subtitle: b.shootType || null,
        path: '/bookings',
      });
    }
  } else {
    failedLabels.push('예약');
  }

  if (meetResult.status === 'fulfilled') {
    const meets = Array.isArray(meetResult.value) ? meetResult.value : [];
    for (const m of meets) {
      if (m.status !== 'CONFIRMED') continue;
      const key = dateKeyOf(m.confirmedDate);
      if (!key) continue;
      const isRequester = m.requesterId === currentUserId;
      const counterpartName = isRequester ? m.receiverName : m.requesterName;
      events.push({
        id: `meet-${m.id}`,
        type: 'meet',
        dateKey: key,
        title: counterpartName ? `${counterpartName}님과 약속` : '약속',
        time: formatTime(m.confirmedTime),
        subtitle: m.locationName || null,
        path: `/meets/${m.id}`,
      });
    }
  } else {
    failedLabels.push('약속');
  }

  if (gatheringResult.status === 'fulfilled') {
    const raw = gatheringResult.value;
    const gatherings = Array.isArray(raw) ? raw : raw?.data || [];
    for (const g of gatherings) {
      if (g.status !== 'SCHEDULED' && g.status !== 'ONGOING') continue;
      const key = dateKeyOf(g.startDateTime);
      if (!key) continue;
      const timeLabel = new Date(g.startDateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      events.push({
        id: `gathering-${g.id}`,
        type: 'gathering',
        dateKey: key,
        title: g.title,
        time: timeLabel,
        subtitle: `참여자 ${g.participantCount}명`,
        path: `/gatherings/${g.id}`,
      });
    }
  } else {
    failedLabels.push('모임');
  }

  return { events, failedLabels };
}
