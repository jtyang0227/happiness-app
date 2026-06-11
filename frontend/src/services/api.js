import apiClient from '../api/apiClient';

export const photoApi = {
  getAll: ({ sortBy = 'createdAt', order = 'desc' } = {}) =>
    apiClient.get('/photos', { params: { sortBy, order } }).then(r => r.data),
  getOne: (id)       => apiClient.get(`/photos/${id}`).then(r => r.data),
  create: (data)     => apiClient.post('/photos', data).then(r => r.data),
  update: (id, data) => apiClient.put(`/photos/${id}`, data).then(r => r.data),
  remove: (id)       => apiClient.delete(`/photos/${id}`).then(r => r.data),

  /** 키워드·무드·멤버·비율 필터 + 정렬. 파라미터 모두 선택적 */
  search: ({ keyword, colorMood, memberId, imageRatio, sortBy = 'createdAt', order = 'desc' } = {}) =>
    apiClient.get('/photos', {
      params: {
        ...(keyword    ? { keyword }    : {}),
        ...(colorMood  ? { colorMood }  : {}),
        ...(memberId   ? { memberId }   : {}),
        ...(imageRatio ? { imageRatio } : {}),
        sortBy,
        order,
      },
    }).then(r => r.data),

  /** 특정 멤버의 사진 목록 */
  getByMember: (memberId, { sortBy = 'createdAt', order = 'desc' } = {}) =>
    apiClient.get('/photos', { params: { memberId, sortBy, order } }).then(r => r.data),

  uploadFile: (formData) =>
    apiClient.post('/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  likePhoto:   (id, memberId) => apiClient.post(`/photos/${id}/likes`, null, { params: { memberId } }).then(r => r.data),
  unlikePhoto: (id, memberId) => apiClient.delete(`/photos/${id}/likes`, { params: { memberId } }).then(r => r.data),
  savePhoto:   (id, memberId) => apiClient.post(`/photos/${id}/saves`, null, { params: { memberId } }).then(r => r.data),
  unsavePhoto: (id, memberId) => apiClient.delete(`/photos/${id}/saves`, { params: { memberId } }).then(r => r.data),
  getSaved:    (memberId)     => apiClient.get(`/photos/saves/${memberId}`).then(r => r.data),

  reorder: (orders) =>
    apiClient.put('/photos/reorder', orders).then(r => r.data),
};

export const inquiryApi = {
  send: (data) =>
    apiClient.post('/inquiry', data).then(r => r.data),

  getInbox: (memberId) =>
    apiClient.get('/inquiry/inbox', { params: { memberId } }).then(r => r.data),

  getUnreadCount: (memberId) =>
    apiClient.get('/inquiry/inbox/unread-count', { params: { memberId } }).then(r => r.data),

  markRead: (id) =>
    apiClient.put(`/inquiry/${id}/read`).then(r => r.data),

  remove: (id) =>
    apiClient.delete(`/inquiry/${id}`).then(r => r.data),
};

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

  addPhoto: (seriesId, photoId, displayOrder) =>
    apiClient.post(`/series/${seriesId}/photos`, { photoId, displayOrder }).then(r => r.data),

  removePhoto: (seriesId, photoId) =>
    apiClient.delete(`/series/${seriesId}/photos/${photoId}`).then(r => r.data),
};

export const authApi = {
  login:            (data)     => apiClient.post('/auth/login',                  data).then(r => r.data),
  signup:           (data)     => apiClient.post('/auth/signup',                 data).then(r => r.data),
  logout:           (data)     => apiClient.post('/auth/logout',                 data).then(r => r.data),
  refresh:          (data)     => apiClient.post('/auth/refresh',                data).then(r => r.data),
  updateProfile:    (id, data) => apiClient.put(`/auth/member/${id}/profile`,    data).then(r => r.data),
  checkEmail:       (email)    => apiClient.get('/auth/check-email',    { params: { email } }).then(r => r.data),
  checkProfileName: (name)     => apiClient.get('/auth/check-profile-name', { params: { name } }).then(r => r.data),
  kakaoLogin:       (code)     => apiClient.post('/auth/oauth/kakao', null, { params: { code } }).then(r => r.data),

  uploadFile: (formData) =>
    apiClient.post('/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
};
