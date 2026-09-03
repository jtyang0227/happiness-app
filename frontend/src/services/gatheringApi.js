import apiClient from '../api/apiClient';

const BASE = '/gatherings';

export const gatheringApi = {
  // Public — list with pagination (Spring Page object)
  list: (params = {}) =>
    apiClient.get(BASE, { params }).then(r => r.data),

  // Public — single gathering detail
  getDetail: (id) =>
    apiClient.get(`${BASE}/${id}`).then(r => r.data),

  // Auth — gatherings I created or participate in
  getMy: () =>
    apiClient.get(`${BASE}/my`).then(r => r.data),

  // Auth — create new gathering
  create: (data) =>
    apiClient.post(BASE, data).then(r => r.data),

  // Auth — update gathering (creator only)
  update: (id, data) =>
    apiClient.put(`${BASE}/${id}`, data).then(r => r.data),

  // Auth — delete gathering (creator only)
  remove: (id) =>
    apiClient.delete(`${BASE}/${id}`),

  // Auth — respond to gathering (PARTICIPATING or NOT_PARTICIPATING)
  respond: (id, status, reason) =>
    apiClient.post(`${BASE}/${id}/participation`, { status, reason }).then(r => r.data),

  // Auth — cancel my participation
  cancelParticipation: (id) =>
    apiClient.delete(`${BASE}/${id}/participation`),

  // Auth — creator only — get participant lists
  getParticipants: (id) =>
    apiClient.get(`${BASE}/${id}/participants`).then(r => r.data),

  // Auth — creator only — manually close recruitment
  closeRecruitment: (id) =>
    apiClient.post(`${BASE}/${id}/close-recruitment`).then(r => r.data),
};

export default gatheringApi;
