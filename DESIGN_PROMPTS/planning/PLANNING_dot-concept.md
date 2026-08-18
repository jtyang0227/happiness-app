# PLAN — 도트(Dot) 컨셉 디자인 도입
> Feature: DOT-CONCEPT | 2026-08-18 | PM: Claude

---

## 개요

"Cosmos × Pinterest 다크 에디토리얼" 디자인 언어를 **해치지 않으면서**, 빈 상태(Empty State)와 로딩 스켈레톤 2가지 컴포넌트에 도트/하프톤 비주얼 언어를 도입해 앱의 시각적 개성을 강화한다.

---

## 사용자 문제

- **현재 상황:** 갤러리·탐색·피드 등 데이터가 없거나 로딩 중인 상태에서 단순 텍스트나 스피너만 표시되어 시각적으로 밋밋하다.
- **Pain Point:** 빈 상태 화면이 개성 없는 회색 텍스트 블록으로만 구성돼 "이 앱만의 감성"을 전달하지 못한다. 로딩 스켈레톤 역시 직사각형 흰 막대로만 구성돼 다크 에디토리얼 톤과 어울리지 않는다.
- **해결 후 기대 효과:** 로딩·빈 상태에서도 브랜드 아이덴티티(도트 비주얼)가 느껴지고, 사용자가 앱 개성을 긍정적으로 인식한다.

---

## 적용 범위 결정 근거 (PM 판단)

### 왜 "빈 상태 + 로딩 스켈레톤"인가?

| 후보 | 임팩트 | 구현 복잡도 | 기존 톤 훼손 위험 | 결정 |
|------|--------|------------|-----------------|------|
| 전체 배경 도트 텍스처 | 낮음(항상 노출 → 금방 무감각) | 낮음 | 높음(이미지 집중 원칙 위반) | ❌ |
| 사진 카드 하프톤 오버레이 | 중간 | 중간 | 높음(사진 자체 품질 가림) | ❌ |
| 좋아요 도트 파티클 애니메이션 | 중간 | 높음(Canvas/requestAnimationFrame) | 낮음 | 다음 버전 |
| **빈 상태 도트 일러스트** | **높음(사용자 감성 터치 포인트)** | **낮음(SVG inline style)** | **없음(이미지 없는 화면)** | **✅ P0** |
| **로딩 스켈레톤 도트 패턴** | **높음(매 진입마다 노출)** | **낮음(CSS animation, inline)** | **없음(로딩 중은 이미지 없음)** | **✅ P0** |
| 프로필 아바타 도트 아트 placeholder | 중간 | 중간 | 낮음 | P1(다음 버전) |

**결론:** 이미지가 없는 순간(로딩 중 / 빈 상태)만 도트가 등장하게 설계하면, 사진이 있을 때의 "이미지 온리" 원칙을 100% 보존하면서 도트 컨셉을 명확히 드러낼 수 있다.

---

## 사용자 페르소나

| 페르소나 | 목표 | 현재 불편함 |
|---------|------|------------|
| 방문 사진작가 | 갤러리 첫 인상에서 앱 감성 파악 | 로딩 중 회색 사각형만 보여 평범한 앱처럼 느낌 |
| 신규 가입 작가 | 사진을 올리기 전에도 앱이 개성 있어 보이길 원함 | 빈 갤러리 화면이 텍스트만 있어 허전함 |
| 모바일 방문자 | 느린 네트워크에서도 앱이 완성도 있어 보이길 원함 | 로딩 시간 동안 아무런 브랜드 경험 없음 |

---

## 유저 스토리

- As a **방문자**, I want to **갤러리 로딩 중에도 앱 특유의 감성을 느끼고 싶다**, so that **처음 진입했을 때 앱에 대한 긍정적 첫인상을 형성할 수 있다**.
- As a **신규 사진작가**, I want to **첫 사진 등록 전 빈 갤러리 화면에서 앱의 개성을 느끼고 싶다**, so that **사진을 올리고 싶은 동기가 생긴다**.
- As a **탐색 탭 방문자**, I want to **검색 결과가 없을 때 단순 텍스트 대신 시각적으로 의미 있는 빈 상태를 보고 싶다**, so that **앱이 완성도 있다고 느끼고 이탈하지 않는다**.

---

## 도트 비주얼 정의

### 디자인 원칙
- **도트 크기:** 2~3px (작게 — 배경에 녹아들되 존재감 유지)
- **도트 색상:** `rgba(91, 110, 245, 0.15)` (primary #5b6ef5, 15% 투명도) — 다크 배경 위에서 은은하게
- **도트 패턴:** 일정 간격 격자(grid dot) 또는 불균등 산포(scatter) — 빈 상태는 중앙 집중 산포, 스켈레톤은 배경 격자
- **애니메이션:** 빈 상태 도트는 `@keyframes` 없이 정적(인쇄물 halftone 감성). 스켈레톤 도트는 shimmer(opacity pulse 1.5s).

### 구현 방법 (inline style + SVG, 외부 라이브러리 없음)
- SVG `<circle>` 반복 또는 CSS `radial-gradient` repeating pattern으로 도트 격자 생성
- React 함수형 컴포넌트, inline style 100%
- `CSS custom property` 없음 (CRA inline style 한계 내)

---

## 적용 컴포넌트 목록 (In Scope)

### 1. `DotEmptyState` 컴포넌트 (신규)
위치: `frontend/src/components/common/DotEmptyState.jsx`

| 속성 | 내용 |
|------|------|
| 용도 | 갤러리·탐색·피드·시리즈의 빈 상태 공통 컴포넌트 |
| 비주얼 | 중앙에 도트 산포 배경(SVG) + 이모지 아이콘 + 한국어 안내 문구 + (선택) CTA 버튼 |
| Props | `icon` (이모지 문자열), `title`, `description`, `actionLabel?`, `onAction?` |
| 적용 화면 | GalleryPage, ExplorePage, FeedPage, SeriesPage (4개 화면) |

**빈 상태 도트 패턴 스펙:**
- 캔버스: 200×160px SVG
- 도트: 지름 2.5px, 간격 14px, 격자 배열
- 중앙에서 외곽으로 갈수록 opacity 감소 (방사형 페이드)
- 색상: primary #5b6ef5 / accent #a78bfa 2색 교대 배열 (체커보드 방식)

### 2. `DotSkeletonCard` 컴포넌트 (신규)
위치: `frontend/src/components/common/DotSkeletonCard.jsx`

| 속성 | 내용 |
|------|------|
| 용도 | 갤러리·탐색의 사진 카드 로딩 상태 대체 |
| 비주얼 | 카드 영역 전체에 도트 격자 배경 + shimmer animation |
| 크기 | 기존 PhotoCard와 동일 비율 유지 (aspect-ratio 프롭) |
| shimmer | opacity: 0.08 → 0.18 → 0.08 순환 (1.8s ease-in-out infinite) |

**스켈레톤 도트 패턴 스펙:**
- 배경: `#0f0f0f` (기존 플레이스홀더 색상 유지)
- 도트: 지름 2px, 간격 10px, 전체 균일 격자
- 색상: `rgba(255, 255, 255, 0.12)` (흰색 도트, 다크 배경 위)
- shimmer: CSS keyframes `dotShimmer` — opacity 사이클

---

## Out of Scope (다음 버전)

- 전체 배경 도트 텍스처 (이미지 온리 원칙 위반 위험)
- 사진 카드 하프톤 오버레이 (사진 품질 가림)
- 좋아요/저장 도트 파티클 애니메이션
- 프로필 아바타 도트 아트 placeholder
- 도트 그리드 커서 트레일 효과

---

## 수용 기준 (Acceptance Criteria)

- [ ] AC1: `DotEmptyState` 컴포넌트가 GalleryPage에 적용되어, 사진이 0개일 때 도트 SVG 배경 + 안내 문구가 표시된다.
- [ ] AC2: `DotEmptyState`가 ExplorePage, FeedPage, SeriesPage에도 동일하게 적용된다 (props만 달리 해 재사용).
- [ ] AC3: `DotSkeletonCard` 컴포넌트가 GalleryPage 로딩 시 기존 사진 카드 자리에 표시되며, shimmer 애니메이션이 동작한다.
- [ ] AC4: 도트 컬러는 `colors.js` 토큰(primary, accent)만 참조하고, 하드코딩된 hex 값은 rgba opacity 조정 용도에만 허용한다.
- [ ] AC5: 외부 SVG 라이브러리 또는 이미지 파일(.png/.svg 에셋) 없이 순수 inline JSX SVG로 구현된다.
- [ ] AC6: 모바일(375px)과 데스크탑(1280px) 양쪽에서 도트 패턴이 레이아웃을 깨지 않고 정상 표시된다.
- [ ] AC7: 기존 `ExplorePage`의 Cosmos 언더라인 탭과 마소닉 그리드 레이아웃에 영향을 주지 않는다.
- [ ] AC8: `npm run build` 성공 (컴파일 에러 없음).

---

## 기술 트레이드오프

| 옵션 | 장점 | 단점 | 결정 |
|-----|------|------|------|
| CSS `radial-gradient` repeating-pattern | 코드 최소화, 퍼포먼스 최고 | 브라우저마다 렌더링 미세 차이, 도트 모양 제어 어려움 | ❌ |
| **Inline SVG `<circle>` 반복 (JSX)** | 도트 크기·색·간격 정밀 제어, 방사형 opacity 마스크 가능 | 코드량 증가 | **✅** |
| Canvas 2D API | 가장 자유로운 표현 | React 외부 DOM 조작, ref 필요, SSR 이슈 | ❌ (로딩 상태에서는 과도함) |

shimmer 구현:
| 옵션 | 장점 | 단점 | 결정 |
|-----|------|------|------|
| CSS `@keyframes` (global.css 추가) | 표준적, 퍼포먼스 최고 | inline style 컴포넌트에서 global CSS 의존성 생김 | ⚠️ 허용 (기존 global.css 활용) |
| `style` 태그를 컴포넌트 내 JSX에 삽입 | 의존성 없음 | 반복 삽입 위험 | ❌ |
| **`<style>` 태그 1회 삽입 + id 중복 체크** | 의존성 없고 inline 유지 | 약간 복잡 | **✅** |

---

## 화면/플로우 목록

1. **GalleryPage (빈 상태):** 사진 0개 → `DotEmptyState` (아이콘: "📷", 제목: "아직 사진이 없어요", CTA: "첫 사진 등록하기")
2. **GalleryPage (로딩):** API 호출 중 → `DotSkeletonCard` 6개 격자 표시
3. **ExplorePage (빈 상태):** 검색 결과 0건 → `DotEmptyState` (아이콘: "🔍", 제목: "검색 결과가 없어요")
4. **FeedPage (빈 상태):** 팔로우 0명 → `DotEmptyState` (아이콘: "✨", 제목: "팔로우한 작가가 없어요", CTA: "탐색하기")
5. **SeriesPage (빈 상태):** 시리즈 0개 → `DotEmptyState` (아이콘: "🗂️", 제목: "시리즈가 없어요")

---

## API 엔드포인트 (예상)

없음 — 순수 프론트엔드 UI 컴포넌트. 백엔드 변경 불필요.

---

## 우선순위

- **P0 (블로커):** `DotEmptyState` + `DotSkeletonCard` 컴포넌트 신규 생성
- **P1 (핵심):** GalleryPage, ExplorePage, FeedPage, SeriesPage 4개 화면에 적용
- **P2 (향상):** 도트 파티클 인터랙션, 아바타 도트 placeholder (다음 버전)

---

## 성공 지표 (KPI)

- 빈 상태 화면에서 CTA 클릭률 (기존 텍스트 대비 +10% 목표)
- 로딩 중 이탈률 감소 (측정: AnalyticsEvent `BOUNCE_LOADING` 신규 트래킹)
- 디자인 리뷰: 팀 내 "앱 개성 점수" 5점 척도 기존 대비 +1점

---

## 운영 DB 마이그레이션

없음 — DB 변경 불필요.

---

## 관련 파일

- 프론트엔드 신규:
  - `frontend/src/components/common/DotEmptyState.jsx`
  - `frontend/src/components/common/DotSkeletonCard.jsx`
- 프론트엔드 수정 (적용):
  - `frontend/src/pages/GalleryPage.jsx`
  - `frontend/src/pages/ExplorePage.jsx`
  - `frontend/src/pages/FeedPage.jsx`
  - `frontend/src/pages/SeriesPage.jsx` (또는 해당 Series 관련 컴포넌트)
- 컬러 참조: `frontend/src/constants/colors.js`
- 관련 기획: `DESIGN_PROMPTS/planning/` (기존 P0_01_EMPTY_STATE.md 맥락 연속)

---

## 다음 단계 — 디자이너 에이전트에게 전달할 요약

**[디자이너 에이전트 전달용]**

`DotEmptyState`와 `DotSkeletonCard` 2개의 React 컴포넌트를 신규 생성한다. `DotEmptyState`는 갤러리·탐색·피드·시리즈 4개 화면의 빈 상태에 공통으로 쓰이며, 중앙 집중 방사형 도트 산포(SVG inline `<circle>`, primary #5b6ef5 + accent #a78bfa 교대, 지름 2.5px, 간격 14px, 외곽 opacity 감소)를 배경으로 이모지 아이콘·안내 문구·CTA 버튼을 포함한다. `DotSkeletonCard`는 사진 카드 로딩 자리를 대체하며, #0f0f0f 배경에 흰색 균일 도트 격자(지름 2px, 간격 10px, rgba(255,255,255,0.12))와 shimmer opacity 사이클(1.8s)을 적용한다. 모든 구현은 inline style + JSX SVG로만 하고 외부 라이브러리는 사용하지 않는다. 기존 #090909 다크 배경, Cosmos 마소닉 그리드, PhotoCard 스타일에는 일절 변경을 가하지 않는다.
