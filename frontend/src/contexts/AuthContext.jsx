import React, { createContext, useContext, useState } from 'react';

/**
 * AuthContext - 로그인 상태 관리
 */
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // 사용자 정보
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * 로그인
   */
  const login = async (email, password) => {
    try {
      setLoading(true);
      // 실제 로그인 API 호출 (임시로 mock 처리)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockUser = {
        id: '1',
        email,
        name: '테스트 사용자',
        profileImage: 'https://i.pravatar.cc/150?img=1',
        bio: '사진을 사랑하는 사용자입니다.',
      };

      setUser(mockUser);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'mock-token-' + Date.now());
      return mockUser;
    } catch (error) {
      console.error('로그인 실패:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 로그아웃
   */
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  /**
   * 토큰으로 로그인 상태 복원
   */
  const restoreAuth = () => {
    try {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (savedUser && token) {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('로그인 복원 실패:', error);
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, restoreAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth 커스텀 훅
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내에서 사용해야 합니다.');
  }
  return context;
};
