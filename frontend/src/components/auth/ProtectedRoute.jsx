/**
 * ProtectedRoute.jsx — 인증 요구 라우트 가드
 *
 * 사용법:
 * <ProtectedRoute>
 *   <MyPage />
 * </ProtectedRoute>
 *
 * 관리자 전용:
 * <ProtectedRoute requiredRoles={['WM', 'SA']}>
 *   <AdminPage />
 * </ProtectedRoute>
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function ProtectedRoute({ children, requiredRoles }) {
  const { isAuthenticated, user, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <span>인증 확인 중...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = user?.authority || user?.role;
    if (!requiredRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}
