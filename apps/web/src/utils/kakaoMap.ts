/**
 * 카카오 지도 JS SDK 로더 — 약속 장소 선택(MeetLocationPicker)과 출사 스팟이 함께 쓴다.
 * REACT_APP_KAKAO_MAP_KEY가 없으면 화면은 지도 없이(텍스트·목록) 동작해야 한다.
 */
export const KAKAO_MAP_KEY = process.env.REACT_APP_KAKAO_MAP_KEY || '';

export function loadKakaoMaps() {
  if (!KAKAO_MAP_KEY) return Promise.reject(new Error('no kakao key'));
  if (window.kakao && window.kakao.maps && window.kakao.maps.Map) return Promise.resolve();
  if (window.__kakaoMapsLoading) return window.__kakaoMapsLoading;
  window.__kakaoMapsLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => { window.kakao.maps.load(resolve); };
    script.onerror = (e) => { window.__kakaoMapsLoading = null; reject(e); };
    document.head.appendChild(script);
  });
  return window.__kakaoMapsLoading;
}

/** 카카오맵 앱/웹 길찾기 링크 (키 없이도 동작) */
export function kakaoDirectionsUrl(name, lat, lng) {
  return `https://map.kakao.com/link/to/${encodeURIComponent(name || '스팟')},${lat},${lng}`;
}
