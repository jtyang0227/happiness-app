import { Platform } from 'react-native';

/**
 * 서버 주소 — 개발(__DEV__)은 로컬, 배포 빌드(App Store·Google Play)는 운영 주소.
 * 예전에는 모든 빌드가 localhost를 불러 심사용 기기에서 앱이 아무것도 불러오지 못했다(PLANNING_app-store-review.md).
 */
const DEV_API_ORIGIN = Platform.OS === 'android'
  ? 'http://10.0.2.2:8080'   // Android 에뮬레이터 → 호스트 머신
  : 'http://localhost:8080';  // iOS 시뮬레이터

export const API_ORIGIN = __DEV__ ? DEV_API_ORIGIN : 'https://api.happiness.io.kr';
export const API_BASE_URL = `${API_ORIGIN}/api`;
export const WEB_ORIGIN = __DEV__ ? 'http://localhost:3000' : 'https://happiness.io.kr';

/** 고객 문의·신고 메일 — 약관·개인정보처리방침·신고 메일에 같은 주소를 쓴다(스토어 등록 정보의 지원 연락처와 일치시킬 것). */
export const SUPPORT_EMAIL = 'support@happiness.io.kr';
