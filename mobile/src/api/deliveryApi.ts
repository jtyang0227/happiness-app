import apiClient from './apiClient';

export const deliveryApi = {
  getMyList: () => apiClient.get('/delivery').then(r => r.data),
};
