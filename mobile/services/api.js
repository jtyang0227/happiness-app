/**
 * services/api.js — 기존 코드 호환성 유지
 *
 * 내부적으로 src/api/apiClient (Axios + JWT 자동 첨부 + 토큰 재발급)를 사용.
 * 기존 screens가 photoApi / authApi를 직접 import해서 쓰는 경우를 위해 re-export.
 */

export { photoApi } from '../src/api/photoApi';
export { authMobileApi as authApi } from '../src/api/authMobileApi';
