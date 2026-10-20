import apiClient from './apiClient';

/** 무드보드 — 웹 services/moodboardApi.js와 같은 엔드포인트(전부 본인 전용 인증) */
export const moodboardApi = {
  list: (photoId) => apiClient.get('/moodboards', { params: photoId ? { photoId } : {} }).then(r => r.data),
  create: (name) => apiClient.post('/moodboards', { name }).then(r => r.data),
  addPhoto: (id, photoId) => apiClient.post(`/moodboards/${id}/photos`, { photoId }).then(r => r.data),
  removePhoto: (id, photoId) => apiClient.delete(`/moodboards/${id}/photos/${photoId}`).then(r => r.data),
};
