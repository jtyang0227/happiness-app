/**
 * authApi.js — 인증 관련 API 호출
 */

import apiClient from './apiClient';

const DEVICE_ID_KEY = 'deviceId';

function getDeviceId() {
  let id = sessionStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'web-' + Math.random().toString(36).slice(2, 18);
    sessionStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export const authApi = {
  login(email, password) {
    return apiClient.post('/auth/login', {
      email,
      password,
      deviceId: getDeviceId(),
    });
  },

  signup(data) {
    return apiClient.post('/auth/signup', data);
  },

  logout(allDevices = false) {
    return apiClient.post('/auth/logout', {
      deviceId: getDeviceId(),
      allDevices,
    });
  },

  refresh(refreshToken) {
    return apiClient.post('/auth/refresh', {
      refreshToken,
      deviceId: getDeviceId(),
    });
  },

  checkEmail(email) {
    return apiClient.get('/auth/check-email', { params: { email } });
  },

  checkProfileName(name) {
    return apiClient.get('/auth/check-profile-name', { params: { name } });
  },

  getMember(id) {
    return apiClient.get(`/auth/member/${id}`);
  },

  updateProfile(id, data) {
    return apiClient.put(`/auth/member/${id}/profile`, data);
  },
};
