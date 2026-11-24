/**
 * authStore.ts — 모바일 Zustand 인증 상태
 *
 * AccessToken: 메모리 (앱 종료 시 소멸)
 * RefreshToken + User: SecureStore (OS 암호화)
 */

import { create } from 'zustand';
import { secureStorage } from '../storage/secureStorage';

/** 서버 MemberResponse 중 화면이 쓰는 값 — 나머지 키도 그대로 */
export interface AuthUser {
  id: number;
  email?: string | null;
  name?: string | null;
  profileName?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  [key: string]: any;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  initialize(): Promise<void>;
  loginSuccess(accessToken: string, refreshToken: string, user: AuthUser): Promise<void>;
  setAccessToken(accessToken: string): void;
  setUser(user: AuthUser): void;
  setTokens(accessToken: string, refreshToken: string): Promise<void>;
  logout(): Promise<void>;
}

const useAuthStore = create<AuthState>()((set) => ({
  // ── State ──────────────────────────────────────────────────────
  accessToken:     null,
  refreshToken:    null,
  user:            null,
  isAuthenticated: false,
  isInitialized:   false,
  isLoading:       false,

  // ── Actions ────────────────────────────────────────────────────
  async initialize() {
    set({ isLoading: true });
    try {
      const [refreshToken, user] = await Promise.all([
        secureStorage.getRefreshToken(),
        secureStorage.getUser(),
      ]);
      set({
        refreshToken,
        user,
        isAuthenticated: !!refreshToken && !!user,
        isInitialized: true,
      });
    } catch (error) {
      console.warn('[AuthStore] 초기화 실패:', error);
      set({ isInitialized: true, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  async loginSuccess(accessToken, refreshToken, user) {
    await Promise.all([
      secureStorage.saveRefreshToken(refreshToken),
      secureStorage.saveUser(user),
    ]);
    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
    });
  },

  setAccessToken(accessToken) {
    set({ accessToken });
  },

  setUser(user) {
    set({ user });
  },

  async setTokens(accessToken, refreshToken) {
    await secureStorage.saveRefreshToken(refreshToken);
    set({ accessToken, refreshToken, isAuthenticated: true });
  },

  async logout() {
    await secureStorage.clearAll();
    set({
      accessToken:     null,
      refreshToken:    null,
      user:            null,
      isAuthenticated: false,
    });
  },
}));

// hooks 외부에서 접근하기 위한 헬퍼 (apiClient에서 사용)
export function getAuthStore() {
  return useAuthStore.getState();
}

export default useAuthStore;
