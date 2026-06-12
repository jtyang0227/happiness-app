import apiClient from './apiClient';

export const seriesApi = {
  getByMember: (memberId) =>
    apiClient.get('/series', { params: { memberId } }).then(r => r.data),

  getOne: (id) =>
    apiClient.get(`/series/${id}`).then(r => r.data),

  create: (data) =>
    apiClient.post('/series', data).then(r => r.data),

  update: (id, data) =>
    apiClient.put(`/series/${id}`, data).then(r => r.data),

  remove: (id) =>
    apiClient.delete(`/series/${id}`).then(r => r.data),

  addPhoto: (seriesId, photoId) =>
    apiClient.post(`/series/${seriesId}/photos`, null, { params: { photoId } }).then(r => r.data),

  removePhoto: (seriesId, photoId) =>
    apiClient.delete(`/series/${seriesId}/photos/${photoId}`).then(r => r.data),
};
