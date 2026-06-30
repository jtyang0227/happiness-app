import apiClient from '../api/apiClient';

const BASE = '/meets';

export const meetApi = {
  create: (data) => apiClient.post(BASE, data).then(r => r.data),
  list: () => apiClient.get(BASE).then(r => r.data),
  getPendingCount: () => apiClient.get(`${BASE}/pending-count`).then(r => r.data.count),
  getDetail: (id) => apiClient.get(`${BASE}/${id}`).then(r => r.data),
  respond: (id, action) => apiClient.put(`${BASE}/${id}/respond`, { action }),
  submitAvailability: (id, dates, times) => apiClient.post(`${BASE}/${id}/availability`, { dates, times }),
  getAvailability: (id) => apiClient.get(`${BASE}/${id}/availability`).then(r => r.data),
  confirmDate: (id, date, time) => apiClient.put(`${BASE}/${id}/confirm`, { date, time }),
  updateLocation: (id, data) => apiClient.put(`${BASE}/${id}/location`, data),
  cancel: (id) => apiClient.put(`${BASE}/${id}/cancel`),
  complete: (id) => apiClient.put(`${BASE}/${id}/complete`),
  getMessages: (id) => apiClient.get(`${BASE}/${id}/messages`).then(r => r.data),
  sendMessage: (id, content) => apiClient.post(`${BASE}/${id}/messages`, { content }).then(r => r.data),
};

// Re-export for convenience
export default meetApi;
