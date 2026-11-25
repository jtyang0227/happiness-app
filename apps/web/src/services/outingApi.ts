import apiClient from '../api/apiClient';

/** SNAPDAY 월간 출사 투표·공휴일 (새 API 전용, 래퍼 없는 JSON) */
export const outingApi = {
  listPolls: (year: number) => apiClient.get('/outing/polls', { params: { year } }).then(r => r.data),
  getPoll: (id: number | string) => apiClient.get(`/outing/polls/${id}`).then(r => r.data),
  createPoll: (body: Record<string, unknown>) => apiClient.post('/outing/polls', body).then(r => r.data),
  updatePoll: (id: number | string, body: Record<string, unknown>) => apiClient.put(`/outing/polls/${id}`, body).then(r => r.data),
  deletePoll: (id: number | string) => apiClient.delete(`/outing/polls/${id}`),
  addOption: (id: number | string, date: string) => apiClient.post(`/outing/polls/${id}/options`, { date }).then(r => r.data),
  removeOption: (id: number | string, optionId: number) => apiClient.delete(`/outing/polls/${id}/options/${optionId}`).then(r => r.data),
  vote: (id: number | string, votes: { optionId: number; availability: string | null }[]) =>
    apiClient.put(`/outing/polls/${id}/votes`, { votes }).then(r => r.data),
  close: (id: number | string) => apiClient.post(`/outing/polls/${id}/close`).then(r => r.data),
  reopen: (id: number | string) => apiClient.post(`/outing/polls/${id}/reopen`).then(r => r.data),
  remind: (id: number | string) => apiClient.post(`/outing/polls/${id}/remind`).then(r => r.data),
  confirm: (id: number | string, body: Record<string, unknown>) => apiClient.post(`/outing/polls/${id}/confirm`, body).then(r => r.data),

  listHolidays: (year: number) => apiClient.get('/outing/holidays', { params: { year } }).then(r => r.data),
  importHolidays: (year: number) => apiClient.post('/outing/holidays/import', null, { params: { year } }).then(r => r.data),
  addHoliday: (body: { date: string; name: string; substitute: boolean }) => apiClient.post('/outing/holidays', body).then(r => r.data),
  deleteHoliday: (date: string) => apiClient.delete(`/outing/holidays/${date}`),
};

/** 서버 사유 문구(ApiResponse.message) — 없으면 기본 문구 */
export const errorMessage = (e: any, fallback: string) => e?.response?.data?.message || fallback;

export const isAdminUser = (u: any) => u?.authority === 'WM' || u?.authority === 'SA';

export default outingApi;
