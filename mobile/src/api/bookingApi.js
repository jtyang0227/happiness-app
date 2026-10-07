import apiClient from './apiClient';

export const bookingApi = {
  getMyBookings: (status) =>
    apiClient.get('/booking', { params: status ? { status } : {} }).then(r => r.data),
  confirmBooking: (id) => apiClient.put(`/booking/${id}/confirm`).then(r => r.data),
  rejectBooking: (id, reason) => apiClient.put(`/booking/${id}/reject`, { reason }).then(r => r.data),
  cancelBooking: (id) => apiClient.put(`/booking/${id}/cancel`).then(r => r.data),

  getAvailabilitySettings: () =>
    apiClient.get('/booking/availability-settings').then(r => r.data),
  saveAvailabilitySettings: (data) =>
    apiClient.put('/booking/availability-settings', data).then(r => r.data),

  getBlockedDates: () =>
    apiClient.get('/booking/blocked-dates').then(r => r.data),
  addBlockedDate: (data) =>
    apiClient.post('/booking/blocked-dates', data).then(r => r.data),
  deleteBlockedDate: (id) =>
    apiClient.delete(`/booking/blocked-dates/${id}`).then(r => r.data),

  /** 촬영 준비 체크리스트 + 납품 기한 (둘 다 덮어씀) */
  updateChecklist: (id, data) =>
    apiClient.put(`/booking/${id}/checklist`, data).then(r => r.data),
  /** 계약금/잔금 수금 상태 (null 필드는 변경 없음) */
  updatePayment: (id, data) =>
    apiClient.put(`/booking/${id}/payment`, data).then(r => r.data),
};
