import apiClient from './apiClient';

export const photoApi = {
  getAll:    ()          => apiClient.get('/photos').then(r => r.data),
  getOne:    (id)        => apiClient.get(`/photos/${id}`).then(r => r.data),
  create:    (data)      => apiClient.post('/photos', data).then(r => r.data),
  update:    (id, data)  => apiClient.put(`/photos/${id}`, data).then(r => r.data),
  remove:    (id)        => apiClient.delete(`/photos/${id}`).then(r => r.data),

  uploadFile: (formData) =>
    apiClient.post('/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  likePhoto:   (id, memberId) => apiClient.post(`/photos/${id}/likes`, null, { params: { memberId } }).then(r => r.data),
  unlikePhoto: (id, memberId) => apiClient.delete(`/photos/${id}/likes`, { params: { memberId } }).then(r => r.data),
  savePhoto:   (id, memberId) => apiClient.post(`/photos/${id}/saves`, null, { params: { memberId } }).then(r => r.data),
  unsavePhoto: (id, memberId) => apiClient.delete(`/photos/${id}/saves`, { params: { memberId } }).then(r => r.data),
  getSaved:    (memberId)     => apiClient.get(`/photos/saves/${memberId}`).then(r => r.data),
};
