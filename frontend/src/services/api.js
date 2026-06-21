import apiClient from '../api/apiClient';

export const photoApi = {
  getAll: ({ sortBy = 'createdAt', order = 'desc' } = {}) =>
    apiClient.get('/photos', { params: { sortBy, order } }).then(r => r.data),
  getOne: (id)       => apiClient.get(`/photos/${id}`).then(r => r.data),
  create: (data)     => apiClient.post('/photos', data).then(r => r.data),
  update: (id, data) => apiClient.put(`/photos/${id}`, data).then(r => r.data),
  remove: (id)       => apiClient.delete(`/photos/${id}`).then(r => r.data),

  /** 키워드·무드·멤버·비율·장르 필터 + 정렬. 파라미터 모두 선택적 */
  search: ({ keyword, colorMood, memberId, imageRatio, genre, sortBy = 'createdAt', order = 'desc' } = {}) =>
    apiClient.get('/photos', {
      params: {
        ...(keyword    ? { keyword }    : {}),
        ...(colorMood  ? { colorMood }  : {}),
        ...(memberId   ? { memberId }   : {}),
        ...(imageRatio ? { imageRatio } : {}),
        ...(genre      ? { genre }      : {}),
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

  getSuggestions: (q) =>
    apiClient.get('/photos/suggestions', { params: { q } }).then(r => r.data),

  /** tags: 콤마 구분 태그 이름 문자열 */
  searchByTags: (tags, { sortBy = 'createdAt', order = 'desc' } = {}) =>
    apiClient.get('/photos', { params: { tags, sortBy, order } }).then(r => r.data),

  /** 팔로우한 유저들의 피드 */
  getFeed: (memberId, { page = 0, size = 20 } = {}) =>
    apiClient.get('/feed', { params: { memberId, page, size } }).then(r => r.data),

  /** AI 자동 태그 추천 */
  autoTag: (photoId) =>
    apiClient.post(`/photos/${photoId}/auto-tags`).then(r => r.data),

  /** 장르별 사진 수 통계 */
  getGenreStats: (memberId) =>
    apiClient.get('/photos/genres/stats', { params: memberId ? { memberId } : {} }).then(r => r.data),
};

export const followApi = {
  follow:      (followerId, followingId) => apiClient.post('/follows', null, { params: { followerId, followingId } }).then(r => r.data),
  unfollow:    (followerId, followingId) => apiClient.delete('/follows', { params: { followerId, followingId } }).then(r => r.data),
  isFollowing: (followerId, followingId) => apiClient.get('/follows/check', { params: { followerId, followingId } }).then(r => r.data),
  getCount:    (memberId)               => apiClient.get('/follows/count', { params: { memberId } }).then(r => r.data),
  getFollowers:(memberId)               => apiClient.get('/follows/followers', { params: { memberId } }).then(r => r.data),
  getFollowing:(memberId)               => apiClient.get('/follows/following', { params: { memberId } }).then(r => r.data),
};

export const commentApi = {
  getComments: (photoId)           => apiClient.get(`/photos/${photoId}/comments`).then(r => r.data),
  addComment:  (photoId, data)     => apiClient.post(`/photos/${photoId}/comments`, data).then(r => r.data),
  deleteComment:(commentId, memberId) => apiClient.delete(`/comments/${commentId}`, { params: { memberId } }).then(r => r.data),
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
  kakaoLogin:       (code)           => apiClient.post('/auth/oauth/kakao',  { code }).then(r => r.data),
  googleLogin:      (code)           => apiClient.post('/auth/oauth/google', { code }).then(r => r.data),
  naverLogin:       (code, state)    => apiClient.post('/auth/oauth/naver',  { code, state }).then(r => r.data),
  getMember:        (id)             => apiClient.get(`/auth/member/${id}`).then(r => r.data),
  getStats:         (id)             => apiClient.get(`/auth/member/${id}/stats`).then(r => r.data),
  changePassword:   (id, data)       => apiClient.put(`/auth/member/${id}/password`, data).then(r => r.data),
  deleteAccount:    (id)             => apiClient.delete(`/auth/member/${id}`).then(r => r.data),

  uploadFile: (formData) =>
    apiClient.post('/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
};
