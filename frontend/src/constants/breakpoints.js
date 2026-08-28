export const BP = {
  sm: 480,   // 소형 모바일
  md: 768,   // 모바일/태블릿 경계
  lg: 1024,  // 태블릿/데스크탑 경계
  xl: 1280,  // 데스크탑 콘텐츠 maxWidth
};

// <style> 태그 내 CSS 문자열 주입 시 사용할 미디어쿼리 헬퍼
export const mq = {
  mobile: `@media (max-width: ${BP.md - 1}px)`,
  tablet: `@media (min-width: ${BP.md}px) and (max-width: ${BP.lg - 1}px)`,
  desktop: `@media (min-width: ${BP.lg}px)`,
  upToTablet: `@media (max-width: ${BP.lg - 1}px)`,
  // 모바일이 아닌 전부(태블릿+데스크탑) — PC 헤더/사이드바처럼 2단(모바일 vs 그 외)만
  // 구분하는 곳에서 mobile의 반대값으로 사용. mq.desktop(BP.lg 이상)과 혼동 금지.
  tabletUp: `@media (min-width: ${BP.md}px)`,
};
