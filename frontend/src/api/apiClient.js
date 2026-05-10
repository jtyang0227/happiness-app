/**
 * apiClient.js — 운영 환경 수준 Axios 인스턴스
 *
 * 포함 기능:
 * - Bearer 토큰 자동 첨부
 * - 401 응답 시 자동 토큰 재발급 (refresh queue로 race condition 방지)
 * - X-Trace-Id, X-Device-Id 헤더 자동 첨부
 * - 재발급 실패 시 로그아웃 처리
 */

import axios from 'axios';
import { getAuthStore } from '../store/authStore';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
const DEVICE_ID_KEY = 'deviceId';

// ── 디바이스 ID: 탭 세션 유지 ───────────────────────────────────────
function getDeviceId() {
  let id = sessionStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'web-' + Math.random().toString(36).slice(2, 18);
    sessionStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function generateTraceId() {
  return Math.random().toString(36).slice(2, 18);
}

// ── Axios 인스턴스 ─────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Refresh Token 큐 (race condition 방지) ──────────────────────────
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(accessToken) {
  refreshSubscribers.forEach(cb => cb(null, accessToken));
  refreshSubscribers = [];
}

function onRefreshFailed(error) {
  refreshSubscribers.forEach(cb => cb(error, null));
  refreshSubscribers = [];
}

function subscribeToRefresh() {
  return new Promise((resolve, reject) => {
    refreshSubscribers.push((error, token) => {
      if (error) reject(error);
      else resolve(token);
    });
  });
}

// ── 토큰 재발급 (직접 axios 호출 - apiClient 순환 참조 방지) ──────────
async function doRefreshToken(refreshToken, deviceId) {
  const res = await axios.post(`${BASE_URL}/auth/refresh`, {
    refreshToken,
    deviceId,
  });
  return res.data.data; // { accessToken, refreshToken, ... }
}

// ── Request Interceptor ─────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const store = getAuthStore();
    const accessToken = store.accessToken;
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    config.headers['X-Trace-Id'] = generateTraceId();
    config.headers['X-Device-Id'] = getDeviceId();
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 + 재시도 아닌 경우에만 재발급 시도
    if (error.response?.status === 401 && !originalRequest._retry) {
      const store = getAuthStore();
      const refreshToken = store.refreshToken;

      // RefreshToken 없으면 바로 로그아웃
      if (!refreshToken) {
        store.logout();
        return Promise.reject(error);
      }

      // 현재 재발급 중이면 큐에 추가
      if (isRefreshing) {
        try {
          const newToken = await subscribeToRefresh();
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch (queueError) {
          return Promise.reject(queueError);
        }
      }

      // 재발급 시작
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const deviceId = getDeviceId();
        const tokenData = await doRefreshToken(refreshToken, deviceId);

        store.setTokens(tokenData.accessToken, tokenData.refreshToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokenData.accessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${tokenData.accessToken}`;

        onRefreshed(tokenData.accessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        onRefreshFailed(refreshError);
        store.logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
