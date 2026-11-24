/**
 * useAuthBootstrap.js — 앱 시작 시 인증 상태 복구
 *
 * SecureStore에서 RefreshToken 로드 → 유효하면 자동 재발급
 * → 실패 시 로그인 화면으로 이동
 */

import { useEffect } from 'react';
import useAuthStore from '../store/authStore';

export function useAuthBootstrap() {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return { isInitialized };
}
