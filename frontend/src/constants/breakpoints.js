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

/*
 * 화면 유형별 태블릿(768~1023px) 레이아웃 전략 (Feature 38-C5)
 * 새 페이지를 만들 때 아래 표를 기준으로 태블릿 레이아웃을 결정한다.
 * 이 표에 없는 새 화면 유형을 만들 때도 표의 6가지 패턴 중 가장 가까운
 * 것을 참고해 판단하고, PR에 "태블릿 레이아웃 전략 준수 여부"를 남긴다.
 *
 * ┌──────────────────┬────────────────────────┬───────────────┬────────────────────────┬──────────────────────────┐
 * │ 화면 유형          │ 대표 화면                 │ 모바일(<768)    │ 태블릿(768~1023)          │ 데스크탑(≥1024)             │
 * ├──────────────────┼────────────────────────┼───────────────┼────────────────────────┼──────────────────────────┤
 * │ 콘텐츠 목록         │ FeedPage, GatheringsPage │ 단일 컬럼        │ 2컬럼 그리드 (gap 16px)     │ 2~3컬럼 또는 maxWidth 중앙정렬  │
 * │ 사진 갤러리         │ GalleryPage, ExplorePage │ 2컬럼 그리드      │ 3컬럼 그리드 (적용 완료)      │ 4컬럼 또는 masonry          │
 * │ 상세 뷰            │ PhotoDetailPage 등        │ 단일 세로 스크롤   │ 이미지 좌50% + 정보 우50%    │ 이미지 좌58% + 정보 우42%     │
 * │ 폼 입력            │ PhotoFormPage 등          │ 단일 컬럼        │ 미리보기 좌50% + 입력 우50%   │ 미리보기 좌50% + 입력 우50%    │
 * │ 대시보드/목록+상세   │ BookingDashboard, MeetsPage │ 단일 컬럼 탭+목록 │ 단일 컬럼 (목록 넓게)        │ 목록 좌(320~360px)+상세 패널 우 │
 * │ 프로필             │ ProfilePage              │ 단일 세로 컬럼    │ 사이드 카드(260px)+탭 콘텐츠  │ 사이드 카드(300px)+탭 콘텐츠   │
 * └──────────────────┴────────────────────────┴───────────────┴────────────────────────┴──────────────────────────┘
 *
 * 구현 규칙:
 * 1. mq.tablet/mq.tabletUp/mq.desktop 토큰 필수 사용 — window.innerWidth 직접 비교
 *    (BP.md/BP.lg 숫자 비교)는 레거시 방식(PhotoDetailPage)이며 신규 화면에서 금지.
 * 2. `<style>` 태그 주입 + className 패턴 사용 (GalleryPage.jsx `.gallery-grid` 참조,
 *    또는 ProfilePage.jsx `.profile-layout`/`.profile-sidebar` 참조 — 인라인 스타일과
 *    섞을 때는 media query에 !important로 오버라이드).
 * 3. 모바일 회귀 방지 — 태블릿/데스크탑 레이아웃 추가 시 <768px 기존 동작 불변.
 *
 * 상세: DESIGN_PROMPTS/design/DESIGN_PROMPT_tablet-layouts.md
 */
