import React, { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'cosmos_user';

function loadUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveUser(user) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadUser());

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    if (!res || res.status !== 'success') {
      throw new Error(res?.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    const userData = res.data;
    saveUser(userData);
    setUser(userData);
    return userData;
  }, []);

  const signup = useCallback(async (data) => {
    const res = await authApi.signup(data);
    if (!res || res.status !== 'success') {
      throw new Error(res?.message || '회원가입에 실패했습니다.');
    }
    const userData = res.data;
    saveUser(userData);
    setUser(userData);
    return userData;
  }, []);

  const updateProfile = useCallback(async (data) => {
    if (!user?.id) throw new Error('로그인이 필요합니다.');
    const res = await authApi.updateProfile(user.id, data);
    if (!res || res.status !== 'success') {
      throw new Error(res?.message || '프로필 수정에 실패했습니다.');
    }
    const updated = res.data;
    saveUser(updated);
    setUser(updated);
    return updated;
  }, [user]);

  const logout = useCallback(() => {
    saveUser(null);
    setUser(null);
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
