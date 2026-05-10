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
  getMember:     (id)       => apiClient.get(`/auth/member/${id}`),
};
