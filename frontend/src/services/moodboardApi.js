import apiClient from '../api/apiClient';

/** 무드보드 (WORK_QUEUE 5) — getShared(공유 링크 보기)만 공개, 나머지는 본인 전용 인증 API */
export const moodboardApi = {
  /** photoId를 주면 각 보드에 containsPhoto가 붙는다(담기 선택창용) */
  list:        (photoId) => apiClient.get('/moodboards', { params: photoId ? { photoId } : {} }).then(r => r.data),
  create:      (name)    => apiClient.post('/moodboards', { name }).then(r => r.data),
  get:         (id)      => apiClient.get(`/moodboards/${id}`).then(r => r.data),
  rename:      (id, name) => apiClient.put(`/moodboards/${id}`, { name }).then(r => r.data),
  remove:      (id)      => apiClient.delete(`/moodboards/${id}`),
  addPhoto:    (id, photoId) => apiClient.post(`/moodboards/${id}/photos`, { photoId }).then(r => r.data),
  removePhoto: (id, photoId) => apiClient.delete(`/moodboards/${id}/photos/${photoId}`).then(r => r.data),
  /** enabled=true면 공유 토큰 발급(있으면 유지), false면 삭제 → { id, shareToken } */
  setShare:    (id, enabled) => apiClient.put(`/moodboards/${id}/share`, { enabled }).then(r => r.data),
  getShared:   (token)   => apiClient.get(`/moodboards/shared/${token}`).then(r => r.data),
};
