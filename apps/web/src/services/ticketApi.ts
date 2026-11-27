import apiClient from '../api/apiClient';

/** 예매 일정·카운트다운·알림 (Nest `apps/api/src/ticket`). 응답은 ApiResponse 래퍼 → data만 돌려준다 */
const d = (r) => r.data?.data;

export const ticketApi = {
  sessions:      ()                 => apiClient.get('/tickets/sessions').then(d),
  session:       (id)               => apiClient.get(`/tickets/sessions/${id}`).then(d),
  countdown:     (id, phaseId?)     => apiClient.get(`/tickets/sessions/${id}/countdown`, { params: phaseId ? { phaseId } : {} }).then(d),
  getAlert:      (phaseId)          => apiClient.get(`/tickets/phases/${phaseId}/notification`).then(d),
  saveAlert:     (phaseId, offsets) => apiClient.put(`/tickets/phases/${phaseId}/notification`, { offsets, enabled: offsets.length > 0 }).then(d),
  removeAlert:   (phaseId)          => apiClient.delete(`/tickets/phases/${phaseId}/notification`),
  myAlerts:      ()                 => apiClient.get('/tickets/me/alerts').then(d),
  notifications: (page = 0)         => apiClient.get('/tickets/notifications', { params: { page, size: 20 } }).then(d),
  unreadCount:   ()                 => apiClient.get('/tickets/notifications/unread-count').then(d),
  markRead:      (id)               => apiClient.put(`/tickets/notifications/${id}/read`),
  readAll:       ()                 => apiClient.post('/tickets/notifications/read-all').then(d),
  /** .ics 파일 주소 — 공개라 토큰 없이 브라우저가 바로 내려받는다 */
  icsUrl:        (phaseId)          => `${String(apiClient.defaults.baseURL ?? '').replace(/\/$/, '')}/tickets/phases/${phaseId}/calendar.ics`,
  timeNow:       ()                 => apiClient.get('/time/now', { params: { client_sent_at: Date.now() } }).then(d),
  timeStatus:    ()                 => apiClient.get('/time/status').then(d),
};

export const adminTicketApi = {
  monitor:        ()              => apiClient.get('/admin/tickets/monitor').then(d),
  createSession:  (body)          => apiClient.post('/admin/tickets/sessions', body).then(d),
  createPhase:    (sid, body)     => apiClient.post(`/admin/tickets/sessions/${sid}/phases`, body).then(d),
  changeSchedule: (pid, body)     => apiClient.put(`/admin/tickets/phases/${pid}/schedule`, body).then(d),
  verifySchedule: (pid)           => apiClient.post(`/admin/tickets/phases/${pid}/verify-schedule`).then(d),
  verification:   (pid, body)     => apiClient.post(`/admin/tickets/phases/${pid}/verifications`, body).then(d),
  history:        (pid)           => apiClient.get(`/admin/tickets/phases/${pid}/history`).then(d),
  testAlert:      (pid)           => apiClient.post(`/admin/tickets/phases/${pid}/test-notification`).then(d),
  diagnostics:    ()              => apiClient.post('/admin/tickets/diagnostics').then(d),
  jobs:           (status = 'DEAD') => apiClient.get('/admin/tickets/jobs', { params: { status } }).then(d),
  retryJob:       (id)            => apiClient.post(`/admin/tickets/jobs/${id}/retry`).then(d),
};

/** 서버 사유가 있으면 그것을, 없으면 기본 문구 */
export const apiError = (e, fallback = '요청을 처리하지 못했습니다.') => e?.response?.data?.message || fallback;

export const OPEN_STATUS_META = {
  SCHEDULED:          { label: '예정',         fg: '#4E5968', bg: '#F2F4F6' },
  UPCOMING:           { label: '임박',         fg: '#1B64DA', bg: '#E8F3FF' },
  OPEN_CHECK_PENDING: { label: '오픈 확인 중', fg: '#8A5A00', bg: '#FFF4D6' },
  OPEN_CONFIRMED:     { label: '예매 진행 중', fg: '#007A45', bg: '#E5F9F0' },
  CLOSED_CONFIRMED:   { label: '종료',         fg: '#4E5968', bg: '#F2F4F6' },
  UNKNOWN:            { label: '확인 불가',    fg: '#4E5968', bg: '#F2F4F6' },
  TIME_SYNC_ERROR:    { label: '시간 점검 중', fg: '#D03040', bg: '#FFEEEF' },
};

export const SCHEDULE_STATUS_LABEL = { TENTATIVE: '미확정', CONFIRMED: '확정', CHANGED: '변경됨', POSTPONED: '연기', CANCELLED: '취소' };
export const TIME_SOURCE_LABEL = { OFFICIAL_NOTICE: '공식 공지', OFFICIAL_API: '공식 API', PARTNER_FEED: '제휴 데이터', ADMIN_MANUAL: '관리자 입력', ESTIMATED: '추정' };
