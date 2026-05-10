/**
 * AuthContext.js — 모바일 인증 컨텍스트
 *
 * useAuth() 인터페이스를 유지하면서 내부를 보안 강화:
 * - AccessToken: 메모리 (Zustand authStore)
 * - RefreshToken + User: expo-secure-store (OS 암호화)
 * - AsyncStorage에 토큰/사용자 정보 저장 금지
 */

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import useAuthStore, { getAuthStore } from '../src/store/authStore';
import { authMobileApi } from '../src/api/authMobileApi';
import { secureStorage } from '../src/storage/secureStorage';
import apiClient from '../src/api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const store = useAuthStore();

  // 앱 시작 시 SecureStore에서 토큰·사용자 복구
  useEffect(() => {
    store.initialize();
  }, []);

  // ── 로그인: JWT 응답 처리 + SecureStore 저장 ─────────────────────
  const login = useCallback(async (email, password) => {
    const res = await authMobileApi.login(email, password);
    const payload = res.data;

    if (!payload.success) {
      throw new Error(payload.message || '로그인에 실패했습니다.');
    }

    const { accessToken, refreshToken, member } = payload.data;
    await store.loginSuccess(accessToken, refreshToken, member);
    return member;
  }, [store]);

  // ── 회원가입 ─────────────────────────────────────────────────────
  const signup = useCallback(async (data) => {
    const res = await authMobileApi.signup(data);
    const payload = res.data;

    if (!payload.success) {
      throw new Error(payload.message || '회원가입에 실패했습니다.');
    }
    return payload.data;
  }, []);

  // ── 프로필 수정 ───────────────────────────────────────────────────
  const updateProfile = useCallback(async (data) => {
    const currentUser = getAuthStore().user;
    if (!currentUser?.id) throw new Error('로그인이 필요합니다.');

    const res = await apiClient.put(`/auth/member/${currentUser.id}/profile`, data);
    const payload = res.data;

    if (!payload.success) {
      throw new Error(payload.message || '프로필 수정에 실패했습니다.');
    }
    const updated = payload.data;
    await secureStorage.saveUser(updated);
    // authStore user 갱신
    useAuthStore.setState({ user: updated });
    return updated;
  }, []);

  // ── 로그아웃: 서버 토큰 무효화 + SecureStore 삭제 ────────────────
  const logout = useCallback(async (allDevices = false) => {
    try {
      const deviceId = await secureStorage.getOrCreateDeviceId();
      await apiClient.post('/auth/logout', { deviceId, allDevices });
    } catch {
      // 서버 오류와 무관하게 로컬 로그아웃 진행
    } finally {
      await store.logout();
    }
  }, [store]);

  return (
    <AuthContext.Provider value={{
      user:            store.user,
      isAuthenticated: store.isAuthenticated,
      loading:         !store.isInitialized,
      login,
      signup,
      updateProfile,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서 사용해야 합니다.');
  return ctx;
};
