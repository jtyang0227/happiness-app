import apiClient from '../api/apiClient';

/**
 * AI 어시스턴트(Gemini 연동) — 시스템 프롬프트만 사용하는 상담/사용법 안내 챗봇.
 * history는 클라이언트에서만 들고 있고 서버에는 저장하지 않는다.
 */
export const assistantApi = {
  // 공개 — 포트폴리오 방문객용 (인증 불필요)
  chatPublic: (message, history) =>
    apiClient.post('/assistant/chat', { message, history }).then(r => r.data),

  // 인증 — 로그인 회원용 앱 사용법 어시스턴트
  chatWorkspace: (message, history) =>
    apiClient.post('/assistant/chat/workspace', { message, history }).then(r => r.data),
};
