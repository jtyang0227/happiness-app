import { analyticsApi } from '../services/analyticsApi';

/**
 * 공개 페이지 조회 기록 — 분석 대시보드(PORTFOLIO_VIEW / WORK_VIEW)의 원천 데이터.
 * visitorToken은 탭 세션 단위 임의값(개인 식별 정보 아님)이며 서버의 방문자별 rate limit 키로 쓰인다.
 * 작가 본인의 방문은 기록하지 않는다. 실패는 조용히 무시(analyticsApi.track이 이미 catch).
 */
const TOKEN_KEY = 'happiness_visitor_token';

function visitorToken() {
  try {
    let t = sessionStorage.getItem(TOKEN_KEY);
    if (!t) {
      t = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem(TOKEN_KEY, t);
    }
    return t;
  } catch {
    return undefined;
  }
}

export function trackView({ ownerId, viewerId, eventType, targetType, targetId }) {
  if (!ownerId || (viewerId && viewerId === ownerId)) return;
  analyticsApi.track({ eventType, targetType, targetId, memberId: ownerId, visitorToken: visitorToken() });
}
