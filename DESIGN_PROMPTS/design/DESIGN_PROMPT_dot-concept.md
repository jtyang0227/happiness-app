# DESIGN_PROMPT — 도트(Dot) 컨셉 컴포넌트
> Feature: DOT-CONCEPT | 2026-08-18 | Cosmos × Pinterest 다크 에디토리얼

---

## Claude.ai 아티팩트 요청 프롬프트

아래를 claude.ai 채팅창에 그대로 붙여넣으면 아티팩트로 시각화됩니다.

---

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

컬러 시스템:
  primary:       '#5b6ef5'
  primaryDark:   '#4458e0'
  accent:        '#a78bfa'
  bg:            '#090909'   (다크 퍼스트, Cosmos 스타일)
  surface:       '#0f0f0f'
  text:          'rgba(255,255,255,0.88)'
  textSub:       'rgba(255,255,255,0.45)'
  danger:        '#e53e3e'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트

[작업]
다음 2개의 React 컴포넌트를 아티팩트로 만들어줘.

1. DotEmptyState — 갤러리/탐색/피드/시리즈 빈 상태 공용 컴포넌트
   - Props: icon(이모지), title, description?, actionLabel?, onAction?, theme('dark'|'light')
   - 배경: 방사형 SVG 도트 패턴 (primary #5b6ef5 + accent #a78bfa 2색 교대, 지름 2.5px, 간격 14px, 중앙→외곽 opacity 감소)
   - 다크 테마: SVG opacity 1, 텍스트 rgba(255,255,255,...)
   - 라이트 테마: SVG opacity 0.35, 텍스트 #1a1a2e / #9090b0
   - 버튼: hover 시 translateY(-1px) + boxShadow 강화

2. DotSkeletonCard — 사진 카드 로딩 스켈레톤
   - Props: height(선택, 기본 random 160~280px)
   - 배경: #0f0f0f + SVG <pattern>으로 균일 도트 격자(지름 2px, 간격 10px, fill rgba(255,255,255,0.12))
   - 애니메이션: @keyframes dotSkeletonPulse (opacity 0.65→1→0.65, 1.8s ease-in-out infinite)
   - borderRadius: 0 (갤러리 마소닉과 동일)
   - 모듈 로드 시 <style> 1회만 DOM에 주입 (중복 방지)
```

---

## 시스템 컨텍스트

앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
배경: #090909 (Cosmos 다크 에디토리얼)
Primary: #5b6ef5, Accent: #a78bfa

---

## 화면 와이어프레임

### DotEmptyState (다크 테마, 갤러리 빈 상태)

```
┌─────────────────────────────────────────────┐  bg: #090909
│                                             │
│          . . · . · . . · . . · .           │  SVG 도트 (primary/accent 교대)
│       . · . · . · . · . · . · . ·          │  중앙→외곽 opacity 페이드
│      · . ·   . · . · . · . ·   · .         │
│       . · .   · . ┌───────┐ . ·             │
│        . · .   .  │  📷   │  . · .          │  icon: fontSize 48
│         · . ·     │       │  · . ·          │
│          . ·      └───────┘   . ·           │
│           · .   아직 사진이 없어요   . ·       │  title: 16px 700 rgba(255,255,255,0.88)
│            . · 첫 사진을 등록하고   · .       │  desc: 13px rgba(255,255,255,0.45)
│             · . 갤러리를 채워보세요 . ·        │
│              . · ┌──────────────────┐ · .   │
│               ·  │  ＋ 첫 사진 등록  │  ·    │  button: primary #5b6ef5
│                . └──────────────────┘ .     │
│                  . . · . · . . · . . ·      │
│                                             │
└─────────────────────────────────────────────┘
```

### DotSkeletonCard (갤러리 마소닉 1칸)

```
┌─────────────────────┐  width: 100%, height: 160~280px random
│ · · · · · · · · · · │  bg: #0f0f0f
│ · · · · · · · · · · │  dots: 2px, 10px 간격, rgba(255,255,255,0.12)
│ · · · · · · · · · · │
│ · · · · · · · · · · │  ◀── shimmer: opacity 0.65 → 1 → 0.65 (1.8s)
│ · · · · · · · · · · │
│ · · · · · · · · · · │
└─────────────────────┘
```

---

## 컴포넌트 스펙

### DotEmptyState

| 속성 | 값 |
|------|-----|
| 컨테이너 | position: relative, padding: 64px 24px, minHeight: 280px |
| SVG 크기 | 196×140px (15열×11행, 14px 간격) |
| SVG 위치 | position: absolute, 수평수직 중앙 |
| 도트 크기 | r=1.25 (지름 2.5px) |
| 도트 색 | primary(#5b6ef5) / accent(#a78bfa) 체커보드 교대 |
| 도트 opacity | 0.04 (외곽) ~ 1.0 (중앙) 방사형 |
| 다크 SVG opacity | 1.0 |
| 라이트 SVG opacity | 0.35 |
| 아이콘 | fontSize 48, lineHeight 1 |
| 제목 | 16px, 700, 다크: rgba(255,255,255,0.88) / 라이트: #1a1a2e |
| 설명 | 13px, 다크: rgba(255,255,255,0.45) / 라이트: #9090b0, maxWidth 280px |
| 버튼 | primary bg, 10px 24px, borderRadius 10, hover: translateY(-1px) + shadow 강화 |
| transition | all 0.15s ease |

### DotSkeletonCard

| 속성 | 값 |
|------|-----|
| 배경 | #0f0f0f |
| borderRadius | 0 (마소닉 갤러리와 동일) |
| 높이 | height prop 또는 useRef(Math.random() * 120 + 160) — 마운트 시 1회만 계산 |
| 도트 패턴 | SVG `<pattern>` id="dotSkeletonPattern", 10×10, circle cx=5 cy=5 r=1 |
| 도트 색 | fill="rgba(255,255,255,0.12)" |
| shimmer | @keyframes dotSkeletonPulse: 0%,100%{opacity:0.65} 50%{opacity:1} |
| animation | dotSkeletonPulse 1.8s ease-in-out infinite |
| 스타일 주입 | 모듈 로드 시 document.getElementById 체크 후 1회만 `<style>` DOM 삽입 |

---

## 적용 화면 및 파라미터

| 화면 | 컴포넌트 | Props |
|------|---------|-------|
| GalleryPage (빈 상태) | DotEmptyState | icon="📷" title="아직 사진이 없어요" actionLabel="첫 사진 등록하기" theme="dark" |
| GalleryPage (로딩) | DotSkeletonCard × 12 | — |
| ExplorePage (빈 상태) | DotEmptyState | icon="🔍"/"📷" 조건분기 theme="dark" |
| ExplorePage (로딩) | DotSkeletonCard × 12 | — |
| FeedPage (빈 상태) | DotEmptyState | icon="✨" title="팔로우한 작가가 없어요" actionLabel="작가 탐색하기" theme="light" |
| SeriesPage (빈 상태) | DotEmptyState | icon="🗂️" title="시리즈가 없어요" actionLabel="첫 번째 시리즈 만들기" theme="dark" |

---

## 상태 정의

| 상태 | DotEmptyState 표시 | DotSkeletonCard 표시 |
|------|------------------|---------------------|
| 로딩 중 | — | 12개 격자 |
| 데이터 없음 | ✅ 도트 SVG + 안내 + CTA | — |
| 에러 | 기존 오류 UI 유지 | — |
| 데이터 있음 | — | — |

---

## 반응형

- 모바일 (< 768px): SVG 도트 패턴은 고정 크기(196×140px) — 컨테이너보다 작으므로 레이아웃 안전
- DotSkeletonCard: width 100%, 마소닉 columns CSS가 크기 제어
- SVG preserveAspectRatio 필요 없음 (고정 크기 SVG)

---

## 제약 조건

- 외부 SVG 파일/이미지 에셋 없음 — 순수 JSX 인라인 SVG
- 외부 라이브러리 import 없음 (react만)
- CSS @keyframes는 document.head에 1회만 주입 (id 체크)
- 기존 PhotoCard, ExplorePage 마소닉 그리드, Cosmos 언더라인 탭 변경 없음

---

## 수용 기준 (Acceptance Criteria)

- [x] AC1: GalleryPage 빈 상태 → DotEmptyState (도트 SVG + 안내 문구 표시)
- [x] AC2: Explore/Feed/Series 빈 상태 → DotEmptyState 적용
- [x] AC3: GalleryPage 로딩 → DotSkeletonCard 12개, shimmer 동작
- [x] AC4: 컬러는 COLORS 토큰 참조, 하드코딩 hex 없음
- [x] AC5: 순수 JSX SVG, 외부 에셋/라이브러리 없음
- [x] AC6: 모바일/데스크탑 레이아웃 정상
- [x] AC7: 기존 Cosmos 마소닉·탭 레이아웃 변경 없음
- [x] AC8: npm run build 성공
