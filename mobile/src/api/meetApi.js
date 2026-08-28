import apiClient from './apiClient';

const BASE = '/meets';

export const meetApi = {
  create:              (data) => apiClient.post(BASE, data).then(r => r.data),
  list:                () => apiClient.get(BASE).then(r => r.data),
  getPendingCount:      () => apiClient.get(`${BASE}/pending-count`).then(r => r.data.count),
  getDetail:           (id) => apiClient.get(`${BASE}/${id}`).then(r => r.data),
  respond:             (id, action) => apiClient.put(`${BASE}/${id}/respond`, { action }).then(r => r.data),
  submitAvailability:  (id, dates, times) => apiClient.post(`${BASE}/${id}/availability`, { dates, times }).then(r => r.data),
  getAvailability:     (id) => apiClient.get(`${BASE}/${id}/availability`).then(r => r.data),
  confirmDate:         (id, date, time) => apiClient.put(`${BASE}/${id}/confirm`, { date, time }).then(r => r.data),
  updateLocation:      (id, data) => apiClient.put(`${BASE}/${id}/location`, data).then(r => r.data),
  cancel:              (id) => apiClient.put(`${BASE}/${id}/cancel`).then(r => r.data),
  complete:            (id) => apiClient.put(`${BASE}/${id}/complete`).then(r => r.data),
  getMessages:         (id) => apiClient.get(`${BASE}/${id}/messages`).then(r => r.data),
  sendMessage:         (id, content) => apiClient.post(`${BASE}/${id}/messages`, { content }).then(r => r.data),
  searchMembers:       (q, size = 10) =>
    apiClient.get('/auth/members/search', { params: { q, size } }).then(r => r.data),
};

export default meetApi;
