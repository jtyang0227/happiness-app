import apiClient from '../api/apiClient';

export const deliveryApi = {
  create: (data) => apiClient.post('/delivery', data).then(r => r.data),
  getMyList: () => apiClient.get('/delivery').then(r => r.data),
  getDetail: (token, password) => apiClient.post(`/delivery/${token}`, { password }).then(r => r.data),
  markViewed: (token) => apiClient.put(`/delivery/${token}/view`).then(r => r.data),
  approve: (token, data) => apiClient.put(`/delivery/${token}/approve`, data).then(r => r.data),
  reject: (token, data) => apiClient.put(`/delivery/${token}/reject`, data).then(r => r.data),
  delete: (id) => apiClient.delete(`/delivery/${id}`).then(r => r.data),
  getSelections: (id) => apiClient.get(`/delivery/${id}/selections`).then(r => r.data),
};
