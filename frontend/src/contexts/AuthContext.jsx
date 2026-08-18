import React, { createContext, useContext, useCallback } from 'react';
import { authApi } from '../services/api';
import useAuthStore from '../store/authStore';

/*
 * AuthContext는 자체 상태를 갖지 않고 authStore(Zustand)를 그대로 비춘다.
 *
 * 이전 버전은 이메일/비밀번호 로그인 결과를 localStorage('cosmos_user')에 따로 저장했는데,
 * 실제 JWT(Authorization 헤더, ProtectedRoute, 토큰 재발급)는 전부 authStore가 담당하고
 * 있어서 두 상태가 어긋났다 — 이메일/비밀번호 로그인은 authStore에 토큰이 채워지지 않아
 * 로그인 직후 인증이 필요한 API 호출이 전부 401로 실패했고, 반대로 카카오 등 소셜 로그인은
 * authStore만 채워서 useAuth().user를 쓰는 화면(FeedPage, SeriesPage 등)이 항상 빈 값을
 * 보게 됐다. 여기서 authStore를 단일 소스로 두면 로그인 경로와 무관하게 항상 일관된다.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const user = useAuthStore(state => state.user);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    if (!res || !res.success) {
      throw new Error(res?.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    const { accessToken, refreshToken, member } = res.data;
    useAuthStore.getState().loginSuccess(accessToken, refreshToken, member);
    return member;
  }, []);

  const signup = useCallback(async (data) => {
    // POST /auth/signup은 토큰 없이 MemberResponse만 반환하므로,
    // 가입 직후 자동 로그인을 위해 동일한 자격증명으로 즉시 로그인을 한 번 더 호출한다.
    const res = await authApi.signup(data);
    if (!res || !res.success) {
      throw new Error(res?.message || '회원가입에 실패했습니다.');
    }
    return login(data.email, data.password);
  }, [login]);

  const updateProfile = useCallback(async (data) => {
    const current = useAuthStore.getState().user;
    if (!current?.id) throw new Error('로그인이 필요합니다.');
    const res = await authApi.updateProfile(current.id, data);
    if (!res || !res.success) {
      throw new Error(res?.message || '프로필 수정에 실패했습니다.');
    }
    const updated = res.data;
    useAuthStore.getState().setUser(updated);
    return updated;
  }, []);

  const logout = useCallback(() => {
    useAuthStore.getState().clearAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
