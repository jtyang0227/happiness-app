import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { restoreAuth(); }, []);

  const login = async (email, password) => {
    const json = await authApi.login({ email, password });
    if (json.status !== 'success') {
      throw new Error(json.message || '로그인에 실패했습니다.');
    }
    const userData = json.data;
    setUser(userData);
    setIsAuthenticated(true);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const signup = async (data) => {
    const json = await authApi.signup(data);
    if (json.status !== 'success') {
      throw new Error(json.message || '회원가입에 실패했습니다.');
    }
    const userData = json.data;
    setUser(userData);
    setIsAuthenticated(true);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const updateProfile = async (data) => {
    if (!user?.id) throw new Error('로그인이 필요합니다.');
    const json = await authApi.updateProfile(user.id, data);
    if (json.status !== 'success') {
      throw new Error(json.message || '프로필 수정에 실패했습니다.');
    }
    const updated = json.data;
    setUser(updated);
    await AsyncStorage.setItem('user', JSON.stringify(updated));
    return updated;
  };

  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    await AsyncStorage.multiRemove(['user']);
  };

  const restoreAuth = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, signup, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
