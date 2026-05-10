/**
 * authStore.js — 모바일 Zustand 인증 상태
 *
 * AccessToken: 메모리 (앱 종료 시 소멸)
 * RefreshToken + User: SecureStore (OS 암호화)
 */

import { create } from 'zustand';
import { secureStorage } from '../storage/secureStorage';

const useAuthStore = create((set, get) => ({
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
