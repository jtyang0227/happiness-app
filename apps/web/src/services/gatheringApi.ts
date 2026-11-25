import apiClient from '../api/apiClient';

const BASE = '/gatherings';

export const gatheringApi = {
  // Public — list with pagination (Spring Page object)
  list: (params = {}) =>
    apiClient.get(BASE, { params }).then(r => r.data),

  // 장소 투표 (ANALYSIS_chulsa P1) — 조회 공개, 후보 설정(만든 사람)·투표(참여 신청자)는 인증. 래퍼 없는 JSON
  getPlacePoll: (id) =>
    apiClient.get(`${BASE}/${id}/place-poll`).then(r => r.data),
  setPlacePoll: (id, options) =>
    apiClient.put(`${BASE}/${id}/place-poll`, { options }).then(r => r.data),
  votePlace: (id, optionId) =>
    apiClient.post(`${BASE}/${id}/place-poll/vote`, { optionId }).then(r => r.data),

  // Public — single gathering detail
  getDetail: (id) =>
    apiClient.get(`${BASE}/${id}`).then(r => r.data),

  // Auth — gatherings I created or participate in
  getMy: () =>
    apiClient.get(`${BASE}/my`).then(r => r.data),

  // Auth — create new gathering
  create: (data) =>
    apiClient.post(BASE, data).then(r => r.data),

  // Auth — update gathering (creator only)
  update: (id, data) =>
    apiClient.put(`${BASE}/${id}`, data).then(r => r.data),

  // Auth — delete gathering (creator only)
  remove: (id) =>
    apiClient.delete(`${BASE}/${id}`),

  // Auth — respond to gathering (PARTICIPATING or NOT_PARTICIPATING)
  respond: (id, status, reason?) =>
    apiClient.post(`${BASE}/${id}/participation`, { status, reason }).then(r => r.data),

  // Auth — cancel my participation
  cancelParticipation: (id) =>
    apiClient.delete(`${BASE}/${id}/participation`),

  // Auth — creator only — get participant lists
  getParticipants: (id) =>
    apiClient.get(`${BASE}/${id}/participants`).then(r => r.data),

  // Auth — creator only — manually close recruitment
  closeRecruitment: (id) =>
    apiClient.post(`${BASE}/${id}/close-recruitment`).then(r => r.data),

  // ── Posts ────────────────────────────────────────────────
  // Auth, participant-only, ONGOING only
  // Body: { content?, hashtags?, photos?: [{imageUrl, caption?, sortOrder?}] }
  createPost: (id, data) =>
    apiClient.post(`${BASE}/${id}/posts`, data).then(r => r.data),

  // Public, Spring Page of posts — only works when ONGOING or ENDED (else 400)
  getPosts: (id, params = {}) =>
    apiClient.get(`${BASE}/${id}/posts`, { params }).then(r => r.data),

  // Auth, author only
  deletePost: (postId) =>
    apiClient.delete(`${BASE}/posts/${postId}`),

  // Auth, participant-only — adds like
  likePost: (postId) =>
    apiClient.post(`${BASE}/posts/${postId}/like`).then(r => r.data),

  // Auth, participant-only — removes like
  unlikePost: (postId) =>
    apiClient.delete(`${BASE}/posts/${postId}/like`),

  // Auth, participant-only — adds comment
  addComment: (postId, content) =>
    apiClient.post(`${BASE}/posts/${postId}/comments`, { content }).then(r => r.data),

  // Public, only when ENDED — flattened photo album
  getAlbum: (id) =>
    apiClient.get(`${BASE}/${id}/album`).then(r => r.data),

  // ── Notifications ────────────────────────────────────────
  // Auth — paginated list of notifications for current user (newest first)
  getNotifications: (params = {}) =>
    apiClient.get(`${BASE}/notifications`, { params }).then(r => r.data),

  // Auth — unread notification count { count: N }
  getUnreadCount: () =>
    apiClient.get(`${BASE}/notifications/unread-count`).then(r => r.data),

  // Auth — mark single notification as read
  markNotificationRead: (id) =>
    apiClient.put(`${BASE}/notifications/${id}/read`).then(r => r.data),

  // Auth — mark all notifications read for current user
  markAllNotificationsRead: () =>
    apiClient.post(`${BASE}/notifications/read-all`).then(r => r.data),

  // ── SNAPDAY (새 API 전용) ── 출사 시작·종료, AI 추천, 베스트 포토, 스토리, 내 기록
  startOuting: (id) => apiClient.post(`${BASE}/${id}/start`).then(r => r.data),
  endOuting: (id) => apiClient.post(`${BASE}/${id}/end`).then(r => r.data),
  getAiRecommendations: (id) => apiClient.get(`${BASE}/${id}/ai-recommendations`).then(r => r.data),
  requestAiRecommendation: (id, question?: string) =>
    apiClient.post(`${BASE}/${id}/ai-recommendations`, { question: question || undefined }, { timeout: 45000 }).then(r => r.data),
  getBest: (id) => apiClient.get(`${BASE}/${id}/best`).then(r => r.data),
  voteBest: (id, photoId) => apiClient.post(`${BASE}/${id}/best/${photoId}`).then(r => r.data),
  unvoteBest: (id, photoId) => apiClient.delete(`${BASE}/${id}/best/${photoId}`).then(r => r.data),
  getStories: (id) => apiClient.get(`${BASE}/${id}/stories`).then(r => r.data),
  createStory: (id, body: { imageUrl: string; caption?: string; taggedMemberIds?: number[] }) =>
    apiClient.post(`${BASE}/${id}/stories`, body).then(r => r.data),
  deleteStory: (storyId) => apiClient.delete(`${BASE}/stories/${storyId}`),
  getMyStories: () => apiClient.get(`${BASE}/stories/mine`).then(r => r.data),
  getMyHistory: () => apiClient.get(`${BASE}/my/history`).then(r => r.data),
  getInstagramCandidates: (id) => apiClient.get(`${BASE}/${id}/instagram-candidates`).then(r => r.data),
};

export default gatheringApi;
