/*
 * Firebase Analytics (GA4) — 사용자 행동 분석.
 * 작가용 자체 방문 통계(utils/trackView.js → 우리 서버 analytics_events)와는 별개로, 운영자가 앱 전체 이용 흐름을 보는 용도다.
 *
 * - REACT_APP_FIREBASE_API_KEY / _APP_ID / _MEASUREMENT_ID 가 없으면 아무것도 하지 않는다(로컬·미설정 배포 안전).
 * - SDK는 설정이 있을 때만 별도 청크로 불러온다(첫 화면 번들 크기 영향 없음).
 * - 개인정보: 이메일·이름·회원 id를 보내지 않는다. 주소의 쿼리 문자열은 버리고, 링크 자체가 비밀인 경로
 *   (/proof/:token 납품, /b/:token 보드 공유, /reset-password)는 토큰을 가린 경로만 보낸다.
 *   자동 page_view는 끄고(send_page_view:false) 라우트가 바뀔 때 가린 주소로 직접 보낸다.
 */

const CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const ENABLED = Boolean(CONFIG.apiKey && CONFIG.appId && CONFIG.measurementId);

/** 토큰·쿼리를 가린 경로 — 분석 도구로 비밀 링크가 새지 않게 */
export function sanitizePath(pathname) {
  const path = (pathname || '/').split('?')[0].split('#')[0];
  if (/^\/proof\/[^/]+/.test(path)) return '/proof/:token';
  if (/^\/b\/[^/]+/.test(path)) return '/b/:token';
  if (path.startsWith('/reset-password')) return '/reset-password';
  return path;
}

let ready = null; // Promise<{ analytics, logEvent, setDefaultEventParameters } | null>

function load() {
  if (!ENABLED || typeof window === 'undefined') return Promise.resolve(null);
  if (ready) return ready;
  ready = (async () => {
    try {
      const [{ initializeApp }, mod] = await Promise.all([
        import('firebase/app'),
        import('firebase/analytics'),
      ]);
      if (!(await mod.isSupported())) return null; // 쿠키·IndexedDB 차단 브라우저 등
      const app = initializeApp(CONFIG);
      const analytics = mod.initializeAnalytics(app, { config: { send_page_view: false } });
      return { analytics, logEvent: mod.logEvent, setDefaultEventParameters: mod.setDefaultEventParameters };
    } catch {
      return null; // 분석 실패가 앱 사용을 막으면 안 된다
    }
  })();
  return ready;
}

/** 라우트가 바뀔 때마다 호출 (App.jsx) */
export function trackPageView(pathname) {
  if (!ENABLED) return;
  const path = sanitizePath(pathname);
  const location = window.location.origin + path;
  load().then((fa) => {
    if (!fa) return;
    // 이후 이벤트(자동 수집 포함)도 가린 주소를 쓰도록 기본값을 덮어쓴다
    fa.setDefaultEventParameters({ page_location: location, page_path: path });
    fa.logEvent(fa.analytics, 'page_view', { page_location: location, page_path: path, page_title: document.title });
  });
}

/** 핵심 행동 이벤트 — 이름은 GA4 권장 이벤트(login·sign_up 등)를 우선 쓴다. 개인정보는 넣지 않는다. */
export function trackEvent(name, params = {}) {
  if (!ENABLED) return;
  load().then((fa) => { if (fa) fa.logEvent(fa.analytics, name, params); });
}
