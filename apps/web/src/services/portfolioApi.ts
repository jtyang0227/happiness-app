import apiClient from '../api/apiClient';
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

export const testimonialApi = {
  list:   (memberId) => apiClient.get(`/testimonials/member/${memberId}`).then(r => r.data),
  create: (data)     => apiClient.post('/testimonials', data).then(r => r.data),
  update: (id, data) => apiClient.put(`/testimonials/${id}`, data).then(r => r.data),
  remove: (id)       => apiClient.delete(`/testimonials/${id}`).then(r => r.data),
};

export const pressApi = {
  list:              (memberId) => apiClient.get(`/press/member/${memberId}`).then(r => r.data),
  createPress:       (data)     => apiClient.post('/press', data).then(r => r.data),
  deletePress:       (id)       => apiClient.delete(`/press/${id}`).then(r => r.data),
  createAchievement: (data)     => apiClient.post('/press/achievements', data).then(r => r.data),
  deleteAchievement: (id)       => apiClient.delete(`/press/achievements/${id}`).then(r => r.data),
};

export const pricingApi = {
  list:   (memberId) => apiClient.get(`/pricing/member/${memberId}`).then(r => r.data),
  myList: ()         => apiClient.get('/pricing/my').then(r => r.data),
  create: (data)     => apiClient.post('/pricing', data).then(r => r.data),
  update: (id, data) => apiClient.put(`/pricing/${id}`, data).then(r => r.data),
  remove: (id)       => apiClient.delete(`/pricing/${id}`).then(r => r.data),
};

export const brandApi = {
  list:   (memberId) => apiClient.get(`/brands/member/${memberId}`).then(r => r.data),
  create: (data)     => apiClient.post('/brands', data).then(r => r.data),
  update: (id, data) => apiClient.put(`/brands/${id}`, data).then(r => r.data),
  remove: (id)       => apiClient.delete(`/brands/${id}`).then(r => r.data),
};

export const newsletterApi = {
  subscribe: (memberId, email) =>
    axios.post(`${BASE}/newsletter/subscribe/${memberId}`, { email })
      .then(r => r.data),
  unsubscribe: (token) =>
    axios.get(`${BASE}/newsletter/unsubscribe/${token}`).then(r => r.data),
  mySubscribers: () => apiClient.get('/newsletter/subscribers').then(r => r.data),
};
