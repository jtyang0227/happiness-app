import apiClient from './apiClient';

export const bookingApi = {
  getMyBookings: (status) =>
    apiClient.get('/booking', { params: status ? { status } : {} }).then(r => r.data),
  confirmBooking: (id) => apiClient.put(`/booking/${id}/confirm`).then(r => r.data),
  rejectBooking: (id, reason) => apiClient.put(`/booking/${id}/reject`, { reason }).then(r => r.data),
};
