/**
 * apiClient.js — 모바일 Axios 인스턴스
 *
 * 포함:
 * - Bearer 토큰 자동 첨부
 * - 401 자동 재발급 + 큐 기반 race condition 방지
 * - X-Trace-Id, X-Device-Id 헤더
 * - 재발급 실패 시 로그아웃
 * - AbortController (타임아웃 연동)
 */

import axios from 'axios';
import { getAuthStore } from '../store/authStore';
import { secureStorage } from '../storage/secureStorage';
import { Platform } from 'react-native';

// Android 에뮬레이터: localhost → 10.0.2.2
const BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8080/api'
  : 'http://localhost:8080/api';

function generateTraceId() {
  return Math.random().toString(36).slice(2, 18);
}

// ── Axios 인스턴스 ─────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Refresh Token 큐 ────────────────────────────────────────────────
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

async function doRefreshToken(refreshToken, deviceId) {
  const res = await axios.post(`${BASE_URL}/auth/refresh`, {
    refreshToken,
    deviceId,
  });
  return res.data.data;
}

// ── Request Interceptor ─────────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    const store = getAuthStore();
    if (store.accessToken) {
      config.headers['Authorization'] = `Bearer ${store.accessToken}`;
    }
    config.headers['X-Trace-Id']  = generateTraceId();
    config.headers['X-Device-Id'] = await secureStorage.getOrCreateDeviceId();
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const store = getAuthStore();
      const refreshToken = store.refreshToken;

      if (!refreshToken) {
        await store.logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        try {
          const newToken = await subscribeToRefresh();
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch (queueError) {
          return Promise.reject(queueError);
        }
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const deviceId  = await secureStorage.getOrCreateDeviceId();
        const tokenData = await doRefreshToken(refreshToken, deviceId);

        await store.setTokens(tokenData.accessToken, tokenData.refreshToken);
        originalRequest.headers['Authorization'] = `Bearer ${tokenData.accessToken}`;
        onRefreshed(tokenData.accessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        onRefreshFailed(refreshError);
        await store.logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
