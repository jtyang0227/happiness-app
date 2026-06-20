# 11 — 포트폴리오 페이지 전면 재설계 (lisamicheleburns.com 참조) ✅ 구현됨

## 기획 개요

**참조 사이트**: https://www.lisamicheleburns.com/  
**목표**: 사진 자체가 주인공이 되는 에디토리얼 포트폴리오 페이지  
**현재 문제**: 기존 PortfolioPage는 탭 + 카드 그리드 → 일반 앱처럼 보임  
**개선 방향**: 전문 사진작가 포트폴리오 사이트 수준의 레이아웃과 무드

---

## 레이아웃 구조 (단일 스크롤)

```
┌─────────────────────────────────────────────────────────┐
│  HERO (80vh)                                            │
│  커버 이미지 or 다크 그라디언트                             │
│  ┌───────────────────────────────────────────┐          │
│  │  작가 이름 (36px, white, bold)             │  중앙    │
│  │  전문 분야 태그 (13px, muted)               │         │
│  │  ─────────────────────────────            │         │
│  │  [팔로우] [촬영 문의]                        │         │
│  └───────────────────────────────────────────┘          │
│  하단 통계 바 (작품 수 · 팔로워 · 팔로잉 · 좋아요)          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  BIO SECTION (center, max 640px)                        │
│  작가 철학/소개 문장 (15px, italic)                        │
│  Location · Since 연도                                   │
│  [웹사이트] [인스타그램]                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  CATEGORY FILTER (sticky)                               │
│  [전체] [WARM] [COOL] [DRAMATIC] [NATURAL] ...          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  MASONRY GALLERY (CSS columns: 4 → 3 → 2 → 1)          │
│  ┌──┐  ┌────┐  ┌──┐  ┌────┐                           │
│  │  │  │    │  │  │  │    │  각 사진 hover 시          │
│  └──┘  │    │  └──┘  │    │  제목 + 좋아요 오버레이     │
│         └────┘         └────┘                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  SERIES SECTION (시리즈가 있을 경우)                       │
│  ── 컬렉션 ──────────────────────────────               │
│  ┌────┐ ┌────┐ ┌────┐  가로 스크롤                      │
│  │    │ │    │ │    │                                   │
│  └────┘ └────┘ └────┘                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  FOOTER CTA                                             │
│  "함께 작업하고 싶으신가요?" + [문의하기 버튼]              │
│  ✦ Happiness — 포트폴리오 갤러리                          │
└─────────────────────────────────────────────────────────┘
```

---

## 핵심 UX 원칙

1. **사진 퍼스트**: UI 크롬을 최소화하고 이미지가 화면을 지배
2. **단일 스크롤**: 탭 제거 → 페이지를 아래로 내리면 모든 정보 접근
3. **에디토리얼 타이포**: 작가 이름은 크고 대담하게, 설명은 절제
4. **다크 미니멀**: #0e0e0e 배경, 포토가 색을 가져옴
5. **Sticky 필터**: 스크롤 중에도 무드 필터에 빠르게 접근 가능
6. **시리즈 수평 스크롤**: 세로 스크롤 흐름을 끊지 않고 시리즈 탐색

---

## 컴포넌트 명세

### HeroSection
- 커버 이미지 있으면: objectFit cover, 80vh
- 커버 없으면: 다크 그라디언트 (`linear-gradient(160deg, #12122a, #0a0a18, #0e0e0e)`)
- 오버레이: `linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.85) 100%)`
- 작가명: fontSize 42px, fontWeight 900, letterSpacing '-0.02em'
- 전문 분야: 쉼표 구분 → 인라인 표시

### StatsBar
- Hero 하단에 반투명 바
- `backdrop-filter: blur(12px)`, `background: rgba(0,0,0,0.4)`
- 통계 4종 가로 나열, 팔로워/팔로잉은 클릭 → 모달

### CategoryFilter
- `position: sticky, top: 0 (헤더 높이 보정 없이 독립 동작)`
- 무드별 컬러 도트 + 레이블
- 활성 상태: 무드 고유 색상 배경

### MasonryGallery
- `columns: 4 220px` → `@media(max-width:900px) { columns: 3; }` → `@media(max-width:600px) { columns: 2; }`
- breakInside: avoid, gap: 4px
- 사진 hover: 제목+좋아요 오버레이 (gradient bottom)
- 클릭 → navigate(`/photo/${id}`)

### SeriesScroll
- `display: flex, overflowX: 'auto'`
- 각 카드: 240px 고정폭, 16/9 비율 커버
- 클릭 → navigate(`/photo/${firstPhotoId}`)

### FooterCTA
- 배경: `linear-gradient(135deg, #12122a, #0e0e0e)`
- CTA: "함께 작업하고 싶으신가요?"
- 버튼: [촬영 문의하기] (primary color)

---

[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary:       '#5b6ef5'
  primaryDark:   '#4458e0'
  primaryLight:  '#eef0ff'
  accent:        '#a78bfa'
  bg:            '#f7f7fb'
  surface:       '#ffffff'
  surfaceDim:    '#ededf4'
  border:        '#e5e5ed'
  text:          '#0f0f1a'
  textSecondary: '#5555aa'
  textMuted:     '#8888bb'
  danger:        '#e53e3e'
  success:       '#22c55e'
  darkBg:        '#0a0a18'
  darkSurface:   '#12122a'
  darkBorder:    '#2a2a50'
  darkText:      '#e8e8f0'
  darkTextSub:   '#8080b0'
  galleryBg:     '#0e0e0e'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
