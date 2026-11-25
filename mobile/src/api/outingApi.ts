import apiClient from './apiClient';

/** SNAPDAY 월간 출사 투표 — 웹 outingApi와 같은 엔드포인트(새 API 전용, 래퍼 없는 JSON) */
export const outingApi = {
  listPolls: (year: number) => apiClient.get('/outing/polls', { params: { year } }).then(r => r.data),
  getPoll: (id: number | string) => apiClient.get(`/outing/polls/${id}`).then(r => r.data),
  vote: (id: number | string, votes: { optionId: number; availability: string | null }[]) =>
    apiClient.put(`/outing/polls/${id}/votes`, { votes }).then(r => r.data),
};

export default outingApi;
