/** 브라우저에 스크립트로 붙는 외부 SDK — 타입 패키지 없이 쓰는 곳만 선언 */
interface Window {
  /** 카카오맵 JS SDK (utils/kakaoMap.ts가 동적으로 불러온다) */
  kakao: any;
  /** 카카오맵 SDK를 한 번만 불러오기 위한 진행 중 Promise */
  __kakaoMapsLoading?: Promise<any>;
}
