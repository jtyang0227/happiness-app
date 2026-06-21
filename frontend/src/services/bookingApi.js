import apiClient from '../api/apiClient';

export const bookingApi = {
  getAvailability: (profileName, year, month) =>
    apiClient.get(`/booking/${profileName}/availability`, { params: { year, month } }).then(r => r.data),

  createBooking: (profileName, data) =>
    apiClient.post(`/booking/${profileName}`, data).then(r => r.data),

  getMyBookings: (status) =>
    apiClient.get('/booking/my', { params: status ? { status } : {} }).then(r => r.data),

  confirmBooking: (id) =>
    apiClient.put(`/booking/${id}/confirm`).then(r => r.data),

  rejectBooking: (id, reason) =>
    apiClient.put(`/booking/${id}/reject`, { reason }).then(r => r.data),

  cancelBooking: (id) =>
    apiClient.put(`/booking/${id}/cancel`).then(r => r.data),

  getAvailabilitySettings: () =>
    apiClient.get('/booking/settings/availability').then(r => r.data),

  saveAvailabilitySettings: (data) =>
    apiClient.put('/booking/settings/availability', data).then(r => r.data),

  addBlockedDate: (data) =>
    apiClient.post('/booking/settings/blocked-dates', data).then(r => r.data),

  deleteBlockedDate: (id) =>
    apiClient.delete(`/booking/settings/blocked-dates/${id}`).then(r => r.data),
};
