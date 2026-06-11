import apiClient from '../api/apiClient';

export const photoApi = {
  getAll: ()         => apiClient.get('/photos').then(r => r.data),
  getOne: (id)       => apiClient.get(`/photos/${id}`).then(r => r.data),
  create: (data)     => apiClient.post('/photos', data).then(r => r.data),
  update: (id, data) => apiClient.put(`/photos/${id}`, data).then(r => r.data),
  remove: (id)       => apiClient.delete(`/photos/${id}`).then(r => r.data),

  /** 키워드·무드·멤버 필터 검색. 파라미터 모두 선택적 */
  search: (keyword, colorMood, memberId) =>
    apiClient.get('/photos', {
      params: {
        ...(keyword   ? { keyword }   : {}),
        ...(colorMood ? { colorMood } : {}),
        ...(memberId  ? { memberId }  : {}),
      },
    }).then(r => r.data),

  /** 특정 멤버의 사진 목록 */
  getByMember: (memberId) =>
    apiClient.get('/photos', { params: { memberId } }).then(r => r.data),

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

export const authApi = {
  login:            (data)     => apiClient.post('/auth/login',                  data).then(r => r.data),
  signup:           (data)     => apiClient.post('/auth/signup',                 data).then(r => r.data),
  logout:           (data)     => apiClient.post('/auth/logout',                 data).then(r => r.data),
  refresh:          (data)     => apiClient.post('/auth/refresh',                data).then(r => r.data),
  updateProfile:    (id, data) => apiClient.put(`/auth/member/${id}/profile`,    data).then(r => r.data),
  checkEmail:       (email)    => apiClient.get('/auth/check-email',    { params: { email } }).then(r => r.data),
  checkProfileName: (name)     => apiClient.get('/auth/check-profile-name', { params: { name } }).then(r => r.data),

  uploadFile: (formData) =>
    apiClient.post('/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
};
