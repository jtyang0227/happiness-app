/**
 * secureStorage.web.js — 웹 번들 전용 대체(테스트용).
 *
 * 모바일 앱은 웹으로 배포하지 않는다. `npx expo export --platform web` 번들은 브라우저(Playwright)로
 * 화면을 검증하는 용도인데, expo-secure-store가 웹에 없어 로그인 이후 화면을 열 수 없었다.
 * Metro가 웹 번들에서만 이 파일을 고른다(.web.js — instagramShare.web.js와 같은 패턴). 탭이 닫히면 사라지는
 * sessionStorage를 쓴다. iOS·Android 빌드는 계속 secureStorage.js(SecureStore)를 쓴다.
 */
const KEYS = {
  REFRESH_TOKEN: 'auth.refreshToken',
  USER_INFO:     'auth.userInfo',
  DEVICE_ID:     'auth.deviceId',
};

const store = {
  get(k) { try { return window.sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { window.sessionStorage.setItem(k, v); } catch { /* 저장 불가 환경: 무시 */ } },
  del(k) { try { window.sessionStorage.removeItem(k); } catch { /* 무시 */ } },
};

export const secureStorage = {
  async saveRefreshToken(token) { store.set(KEYS.REFRESH_TOKEN, token); },
  async getRefreshToken() { return store.get(KEYS.REFRESH_TOKEN); },
  async deleteRefreshToken() { store.del(KEYS.REFRESH_TOKEN); },
  async saveUser(user) { store.set(KEYS.USER_INFO, JSON.stringify(user)); },
  async getUser() {
    const raw = store.get(KEYS.USER_INFO);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  async deleteUser() { store.del(KEYS.USER_INFO); },
  async getOrCreateDeviceId() {
    let id = store.get(KEYS.DEVICE_ID);
    if (!id) {
      id = 'web-' + Math.random().toString(36).slice(2, 18) + Date.now().toString(36);
      store.set(KEYS.DEVICE_ID, id);
    }
    return id;
  },
  async clearAll() { store.del(KEYS.REFRESH_TOKEN); store.del(KEYS.USER_INFO); },
};
