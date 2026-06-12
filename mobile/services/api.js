/**
 * services/api.js — 기존 코드 호환성 유지 + 새 API 재export
 */

export { photoApi } from '../src/api/photoApi';
export { authMobileApi as authApi } from '../src/api/authMobileApi';
export { followApi } from '../src/api/followApi';
export { commentApi } from '../src/api/commentApi';
export { seriesApi } from '../src/api/seriesApi';
