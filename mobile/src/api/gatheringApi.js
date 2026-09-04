import apiClient from './apiClient';

const BASE = '/gatherings';

export const gatheringApi = {
  /** 공개 모임 목록 (상태 필터 가능) */
  list: (status, page = 0, size = 20) =>
    apiClient.get(BASE, { params: { status, page, size } }).then(r => r.data),

  /** 내가 생성하거나 참여 중인 모임 */
  getMy: () =>
    apiClient.get(`${BASE}/my`).then(r => r.data),

  /** 모임 상세 */
  getDetail: (id) =>
    apiClient.get(`${BASE}/${id}`).then(r => r.data),

  /** 참여/미참여 응답
   *  status: "PARTICIPATING" | "NOT_PARTICIPATING"
   *  서버가 정원 초과 시 status를 "WAITING"으로 반환할 수 있음 — 호출부에서 확인 필요
   */
  respond: (id, status, reason) =>
    apiClient.post(`${BASE}/${id}/participation`, { status, reason }).then(r => r.data),

  /** 참여 취소 */
  cancelParticipation: (id) =>
    apiClient.delete(`${BASE}/${id}/participation`).then(r => r.data),

  /** 모임 진행 피드 (ONGOING|ENDED 상태에서만 동작) */
  getFeed: (id, page = 0, size = 20) =>
    apiClient.get(`${BASE}/${id}/posts`, { params: { page, size } }).then(r => r.data),

  /** 모임 종료 앨범 (ENDED 상태에서만 동작) */
  getAlbum: (id) =>
    apiClient.get(`${BASE}/${id}/album`).then(r => r.data),

  /** Instagram Story 공유 대상 참여자 목록 (인증 + PARTICIPATING 전용)
   *  자신은 제외, instagramId 없는 참여자는 제외
   */
  getInstagramCandidates: (id) =>
    apiClient.get(`${BASE}/${id}/instagram-candidates`).then(r => r.data),

  /** Instagram 공유 이력 서버 로그 (fire-and-forget)
   *  data: { gatheringPostId?, template, captionText?, taggedMemberIds? }
   *  template: "PHOTO_ONLY" | "PHOTO_PARTICIPANTS" | "PHOTO_TEXT"
   */
  shareToInstagram: (id, data) =>
    apiClient.post(`${BASE}/${id}/instagram-share`, data).then(r => r.data),
};

export default gatheringApi;
