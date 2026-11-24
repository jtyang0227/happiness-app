/**
 * secureStorage.js — expo-secure-store 기반 보안 토큰 저장소
 *
 * 보안 원칙:
 * - AccessToken: 메모리에만 보관 (앱 종료 시 소멸)
 * - RefreshToken: SecureStore (OS 수준 암호화)
 * - 민감 정보는 절대 AsyncStorage에 저장하지 않는다
 *
 * expo-secure-store 한계:
 * - 최대 2KB 저장 가능 (JWT는 충분)
 * - 기기 보안 설정(PIN/생체인증)이 없으면 encrypted 보장 안 됨
 */

import * as SecureStore from 'expo-secure-store';

const KEYS = {
  REFRESH_TOKEN: 'auth.refreshToken',
  USER_INFO:     'auth.userInfo',
  DEVICE_ID:     'auth.deviceId',
};

// SecureStore 옵션: 기기 잠금 해제 후 접근 가능
const SECURE_OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secureStorage = {
  async saveRefreshToken(token) {
    await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token, SECURE_OPTIONS);
  },

  async getRefreshToken() {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN, SECURE_OPTIONS);
  },

  async deleteRefreshToken() {
    await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN, SECURE_OPTIONS);
  },

  async saveUser(user) {
    await SecureStore.setItemAsync(KEYS.USER_INFO, JSON.stringify(user), SECURE_OPTIONS);
  },

  async getUser() {
    const raw = await SecureStore.getItemAsync(KEYS.USER_INFO, SECURE_OPTIONS);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  async deleteUser() {
    await SecureStore.deleteItemAsync(KEYS.USER_INFO, SECURE_OPTIONS);
  },

  async getOrCreateDeviceId() {
    let id = await SecureStore.getItemAsync(KEYS.DEVICE_ID, SECURE_OPTIONS);
    if (!id) {
      id = 'rn-' + Math.random().toString(36).slice(2, 18) + Date.now().toString(36);
      await SecureStore.setItemAsync(KEYS.DEVICE_ID, id, SECURE_OPTIONS);
    }
    return id;
  },

  async clearAll() {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN, SECURE_OPTIONS),
      SecureStore.deleteItemAsync(KEYS.USER_INFO, SECURE_OPTIONS),
    ]);
  },
};
