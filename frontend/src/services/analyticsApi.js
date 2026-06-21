import apiClient from '../api/apiClient';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

export const analyticsApi = {
  // Public endpoint — no JWT, silent fail
  track: (data) => {
    return fetch(`${BASE_URL}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  },

  getSummary: (memberId, period = 30) =>
    apiClient.get('/analytics/summary', { params: { memberId, period } }).then(r => r.data),

  getDaily: (memberId, period = 30) =>
    apiClient.get('/analytics/daily', { params: { memberId, period } }).then(r => r.data),

  getTopPhotos: (memberId, metric = 'likes', limit = 5) =>
    apiClient.get('/analytics/top-photos', { params: { memberId, metric, limit } }).then(r => r.data),

  getGenreDistribution: (memberId) =>
    apiClient.get('/analytics/genre-distribution', { params: { memberId } }).then(r => r.data),
};
