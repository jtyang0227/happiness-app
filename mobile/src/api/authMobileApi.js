import axios from 'axios';
import apiClient from './apiClient';
import { secureStorage } from '../storage/secureStorage';
import { Platform } from 'react-native';

const BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8080/api'
  : 'http://localhost:8080/api';

export const authMobileApi = {
  async login(email, password) {
    const deviceId = await secureStorage.getOrCreateDeviceId();
    return axios.post(`${BASE_URL}/auth/login`, { email, password, deviceId });
  },

  signup(data) {
    return apiClient.post('/auth/signup', data);
  },

  async logout(allDevices = false) {
    const deviceId = await secureStorage.getOrCreateDeviceId();
    return apiClient.post('/auth/logout', { deviceId, allDevices });
  },

  updateProfile: (id, data) => apiClient.put(`/auth/member/${id}/profile`, data),
  checkEmail:    (email)    => apiClient.get('/auth/check-email', { params: { email } }),
  checkProfileName: (name)  => apiClient.get('/auth/check-profile-name', { params: { name } }),
  // 아이디·비밀번호 찾기 — 재설정 링크는 메일에서 웹(/reset-password)으로 열린다
  findEmail:            (name, tel) => apiClient.post('/auth/find-email', { name, tel }),
  requestPasswordReset: (email)     => apiClient.post('/auth/password-reset/request', { email }),
  getMember:     (id)       => apiClient.get(`/auth/member/${id}`),
  getStats:      (id)       => apiClient.get(`/auth/member/${id}/stats`),
};
