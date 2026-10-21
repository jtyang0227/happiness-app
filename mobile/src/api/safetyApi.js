import apiClient from './apiClient';

/** 신고·차단 (앱 심사 Apple 1.2 — 사용자 생성 콘텐츠). 응답 래퍼: 신고는 DTO 그대로, 차단은 ApiResponse. */
export const reportApi = {
  reportPhoto:   (photoId, reason, detail)   => apiClient.post(`/photos/${photoId}/report`, { reason, detail }).then(r => r.data),
  reportComment: (commentId, reason, detail) => apiClient.post(`/comments/${commentId}/report`, { reason, detail }).then(r => r.data),
};

export const blockApi = {
  list:    ()         => apiClient.get('/blocks').then(r => r.data?.data || []),
  block:   (memberId) => apiClient.post(`/blocks/${memberId}`).then(r => r.data),
  unblock: (memberId) => apiClient.delete(`/blocks/${memberId}`).then(r => r.data),
};
