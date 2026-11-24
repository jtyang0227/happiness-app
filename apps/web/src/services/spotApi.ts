import apiClient from '../api/apiClient';

/**
 * 출사 스팟 (ANALYSIS_chulsa-app-public-features.md P0). 응답은 래퍼 없는 JSON(무드보드와 같음).
 * list/get/nearbyDuplicate/getPhotoSpot은 공개, 나머지는 인증.
 */
export const spotApi = {
  /** params: { minLat, maxLat, minLng, maxLng, region, q, page, size } → { data, page, size, hasNext } */
  list:            (params)  => apiClient.get('/spots', { params }).then(r => r.data),
  get:             (id)      => apiClient.get(`/spots/${id}`).then(r => r.data),
  nearbyDuplicate: (name, lat, lng) => apiClient.get('/spots/nearby-duplicate', { params: { name, lat, lng } }).then(r => r.data),
  create:          (data)    => apiClient.post('/spots', data).then(r => r.data),
  update:          (id, data) => apiClient.put(`/spots/${id}`, data).then(r => r.data),
  remove:          (id)      => apiClient.delete(`/spots/${id}`),
  /** → { data: spot | null } */
  getPhotoSpot:    (photoId) => apiClient.get(`/photos/${photoId}/spot`).then(r => r.data),
  setPhotoSpot:    (photoId, spotId) => apiClient.put(`/photos/${photoId}/spot`, { spotId }).then(r => r.data),
};

/** 서버 오류 사유(ApiResponse.message)를 사용자 문구로 */
export function spotErrorMessage(err, fallback = '잠시 후 다시 시도해 주세요.') {
  return err?.response?.data?.message || fallback;
}
