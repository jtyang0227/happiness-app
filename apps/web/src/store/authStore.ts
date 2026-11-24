/**
 * authStore.ts — Zustand 기반 인증 상태 관리
 *
 * 토큰 저장:
 * - accessToken: 메모리 (보안상 sessionStorage도 위험이므로 메모리 우선)
 * - refreshToken: sessionStorage (탭 종료 시 자동 삭제)
 * - user: sessionStorage (탭 종료 시 자동 삭제)
 *
 * 운영 환경 주의사항:
 * - accessToken은 절대 localStorage에 저장하지 않는다 (XSS 취약)
 * - refreshToken은 HttpOnly Cookie가 이상적이나, 현재 구조는 sessionStorage 사용
 */

import { create } from 'zustand';

const REFRESH_TOKEN_KEY = 'rt';
const USER_KEY = 'auth_user';

function loadFromSession(key: string) {
  try {
    const val = sessionStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

function saveToSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage 용량 초과 등 무시
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

/** 서버 MemberResponse 중 화면이 쓰는 값 — 나머지 키도 그대로 들고 다닌다 */
export interface AuthUser {
  id: number;
  email?: string | null;
  name?: string | null;
  profileName?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  authority?: string | null;
  provider?: string | null;
  [key: string]: any;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setTokens(accessToken: string, refreshToken: string): void;
  setUser(user: AuthUser): void;
  loginSuccess(accessToken: string, refreshToken: string, user: AuthUser): void;
  logout(): void;
  initialize(): void;
  clearAuth(): void;
}

const useAuthStore = create<AuthState>()((set) => ({
  // ── State ──────────────────────────────────────────────────────
  accessToken: null,
  refreshToken: loadFromSession(REFRESH_TOKEN_KEY),
  user: loadFromSession(USER_KEY),
  isAuthenticated: false,
  isInitialized: false,

  // ── Actions ────────────────────────────────────────────────────
  setTokens(accessToken, refreshToken) {
    saveToSession(REFRESH_TOKEN_KEY, refreshToken);
    set({
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
  },

  setUser(user) {
    saveToSession(USER_KEY, user);
    set({ user });
  },

  loginSuccess(accessToken, refreshToken, user) {
    saveToSession(REFRESH_TOKEN_KEY, refreshToken);
    saveToSession(USER_KEY, user);
    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
      isInitialized: true,
    });
  },

  logout() {
    clearSession();
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
    // 로그인 페이지로 리다이렉트
    window.location.href = '/login';
  },

  initialize() {
    const refreshToken = loadFromSession(REFRESH_TOKEN_KEY);
    const user = loadFromSession(USER_KEY);
    set({
      refreshToken,
      user,
      isAuthenticated: !!refreshToken && !!user,
      isInitialized: true,
    });
  },

  clearAuth() {
    clearSession();
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },
}));

// apiClient에서 Zustand 스토어에 접근하기 위한 헬퍼
// (hooks 외부에서 사용 가능)
export function getAuthStore() {
  return useAuthStore.getState();
}

export default useAuthStore;
