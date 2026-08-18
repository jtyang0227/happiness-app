# DESIGN_PROMPT — 도트(Dot) 컨셉 컴포넌트 — 레코드(바이닐) 리비전
> Feature: DOT-CONCEPT | v2 2026-08-18 | Cosmos × Pinterest 다크 에디토리얼

---

## 개정 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v1 | 2026-08-18 | 최초 구현 — 중앙 집중 방사형 도트 산포, primary(#5b6ef5)/accent(#a78bfa) 보라 계열 교대 배색 |
| **v2 (현재)** | 2026-08-18 | **피드백 반영**: "보라색 포인트가 취향이 약하다" → 포인트 컴러를 **검정**으로 전면 교체, **바이닐 레코드(원반+그루브)** 모티프로 재설계해 시각적 존재감 강화 |

---

## Claude.ai 아티팩트 요청 프롬프트

아래를 claude.ai 채팅창에 그대로 붙여넣으면 아티팩트로 시각화됩니다.

---

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

컴러 시스템:
  primary:       '#5b6ef5'   (도트 컨셉에는 더 이상 사용하지 않음)
  accent:        '#a78bfa'   (도트 컨셉에는 더 이상 사용하지 않음)
  bg:            '#090909'   (다크 퍼스트, Cosmos 스타일)
  surface:       '#0f0f0f'
  text:          'rgba(255,255,255,0.92)'
  textSub:       'rgba(255,255,255,0.48)'

도트 컨셉 전용 팔레트 (고대비 흥백, 브랜드 컴러와 분리):
  discFillDark:   '#f5f5f7'  (dark 테마 원반 — 거의 흰색)
  discFillLight:  '#0a0a0a'  (light 테마 원반 — 거의 검정)
  dotFillDark:    '#0a0a0a'  (dark 테마 그루브 도트 — 검정, 포인트 컴러)
  dotFillLight:   '#f5f5f7'  (light 테마 그루브 도트 — 흰색)

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- 보라/파랑 계열(primary, accent)은 도트 컨셉 그래픽 자체에는 절대 사용하지 않는다
  (버튼 hover 등 브랜드 요소가 아닌, 순수 흥백 대비로만 구성)

[작업]
다음 2개의 React 컴포넌트를 아티팩트로 만들어줘.

1. DotEmptyState — 갤러리/탐색/피드/시리즈 빈 상태 공용 컴포넌트
   - **바이닐 레코드 그래픽**: 원반(disc, 반지름 66px) + 그루브 도트 6개 링(바깥 링일수록 도트
     초밀하고 큼, 링마다 각도 엇갈림) + 중앙 라벨 원(반지름 22px) + 이모지 아이콘을 라벨 위에 오버레이
   - Props: icon(이모지), title, description?, actionLabel?, onAction?, theme('dark'|'light')
   - **dark 테마**: 흰색(#f5f5f7) 원반 + 검정(#0a0a0a) 그루브 도트/라벨 — 어두운 페이지 배경과 강한 대비
   - **light 테마**: 검정(#0a0a0a) 원반 + 흰색(#f5f5f7) 그루브 도트/라벨로 반전 — 밝은 페이지
     배경과 강한 대비. 양쪽 테마 모두 "포인트 컴러 = 검정" 원칙을 유지한다(반전은 배경 대비를 위한 것)
   - 레코드 그래픽에 drop-shadow로 입체감 부여
   - CTA 버튼도 검정/흰색 반전 스타일(보라색 사용 안 함), hover 시 배경 톤 변화 + translateY(-1px)

2. DotSkeletonCard — 사진 카드 로딩 스켈레톤
   - Props: height(선택, 기본 random 160~280px)
   - 배경: #0f0f0f + SVG `<pattern>`으로 균일 도트 격자(지름 2.8px, 간격 11px,
     fill rgba(255,255,255,0.18) — v1보다 크기·불투명도 상향해 존재감 강화)
   - 애니메이션: @keyframes dotSkeletonPulse (opacity 0.55→1→0.55, 1.8s ease-in-out infinite)
   - borderRadius: 0 (갤러리 마소닉과 동일)
   - 모듈 로드 시 <style> 1회만 DOM에 주입 (중복 방지), pattern id는 인스턴스마다 useId()로 고유화
```

---

## 왜 바꿔나 — 디자인 판단 근거

| 항목 | v1 (보라 산포) | v2 (레코드) |
|------|---------------|------------|
| 형태 | 15×11 격자에 흘릿은 점 | 하나의 응집된 원형 오브젝트(레코드판) |
| 색상 | primary/accent 보라·파랑 교대 | 검정×흰색 고대비 (테마 반전) |
| 임팩트 | 배경에 녹아들어 존재감 약함 | 중심축이 명확해 시선을 즉시 붙잡음 |
| 브랜드 컴러 의존 | 있음(기존 UI 톤과 중복돼 밀물함) | 없음(도트 컨셉만의 고유 아이덴티티) |
| "레코드" 컨셉 부합 | 없음(추상적 산포) | 원반+그루브+라벨 구조로 직접 표현 |

**결론**: 브랜드 컴러(보라/파랑)는 버튼·탭 등 기존 UI 전역에서 이미 충분히 쓰이고 있어, 도트 컨셉까지 같은 팔레트를 쓰면 차별점이 사라진다. 도트 컨셉만큼은 흥백 고대비로 완전히 분리해 "이 앱에만 있는 특별한 순간(로딩·빈 상태)"이라는 인상을 준다.

---

## 화면 와이어프레임

### DotEmptyState — dark 테마 (갤러리 빈 상태)

```
┌────────────────────────────────────────────────┐  bg: #090909
│                                             │
│                 ⚪ ⚫ ⚪ ⚫ ⚪               │  흰 원반 + 검정 그루브 도트
│              ⚫ ⚪ ⚫ ⚪ ⚫ ⚪ ⚫            │  6개 링, 바깥→안쪽 도트 작아짐
│            ⚪  ┌───────────┐  ⚫          │
│           ⚫   │             │   ⚪         │
│           ⚪   │    📷       │   ⚫         │  중앙 라벨(검정) 위 이모지
│           ⚫   │             │   ⚪         │
│            ⚪  └───────────┘  ⚫          │
│              ⚫ ⚪ ⚫ ⚪ ⚫ ⚪ ⚫            │
│                 ⚪ ⚫ ⚪ ⚫ ⚪               │
│                                             │
│              아직 사진이 없어요               │  17px 800 rgba(255,255,255,0.92)
│         첫 번째 사진을 등록하고 갤러리를        │  13px rgba(255,255,255,0.48)
│              채워보세요.                     │
│                                             │
│           ┌────────────────────┐            │  버튼: 흰 배경 + 검정 텍스트
│           │   첫 사진 등록하기    │            │  (hover: 살짝 밝게 + 그림자 강화)
│           └────────────────────┘            │
│                                             │
└──────────────────────────────────────────┘
```

### DotEmptyState — light 테마 (피드 빈 상태) — 색상 반전

```
┌────────────────────────────────────────────────┐  bg: 라이트 그라디언트
│                 ⚫ ⚪ ⚫ ⚪ ⚫               │  검정 원반 + 흰 그루브 도트
│              ⚪ ⚫ ⚪ ⚫ ⚪ ⚫ ⚪            │
│            ⚫  ┌───────────┐  ⚪          │
│           ⚪   │     ✨      │   ⚫         │  중앙 라벨(흰색) 위 이모지
│            ⚫  └───────────┘  ⚪          │
│              ⚪ ⚫ ⚪ ⚫ ⚪ ⚫ ⚪            │
│                 ⚫ ⚪ ⚫ ⚪ ⚫               │
│            팔로우한 작가가 없어요               │  17px 800 (라이트 text 컴러)
│                                             │
│           ┌────────────────────┐            │  버튼: 검정 배경 + 흰 텍스트
│           │    작가 탐색하기      │            │
│           └────────────────────┘            │
└──────────────────────────────────────────┘
```

### DotSkeletonCard (갤러리 마소닉 1칸)

```
┌─────────────────────┐  width: 100%, height: 160~280px random
│ · · · · · · · · · · │  bg: #0f0f0f
│ · · · · · · · · · · │  dots: 2.8px, 11px 간격, rgba(255,255,255,0.18)
│ · · · · · · · · · · │
│ · · · · · · · · · · │  ◀── shimmer: opacity 0.55 → 1 → 0.55 (1.8s)
│ · · · · · · · · · · │
└─────────────────────┘
```

---

## 컴포넌트 스펙

### DotEmptyState — 레코드 그래픽

| 속성 | 값 |
|------|-----|
| 컨테이너 | flex column center, padding 56px 24px, minHeight 280px |
| SVG 크기 | 144×144px ((DISC_R + 6) × 2, DISC_R=66) |
| 원반(disc) 반지름 | 66px |
| 중앙 라벨 반지름 | 22px |
| 그루브 링 수 | 6개 |
| 링당 도트 수 | 바깥 28개 → 안쪽 14개로 점감, 홀수/짝수 링마다 각도 엇갈림(staggered) |
| 도트 반지름 | 바깥 2.4px → 안쪽 1.5px로 점감 |
| dark 테마 색상 | 원반 `#f5f5f7`, 도트/라벨 `#0a0a0a` |
| light 테마 색상 | 원반 `#0a0a0a`, 도트/라벨 `#f5f5f7` |
| 아이콘 | fontSize 22, 라벨 원 중앙에 절대 위치 오버레이 |
| drop-shadow | dark: `0 10px 28px rgba(0,0,0,0.55)` / light: `0 10px 24px rgba(10,10,10,0.18)` |
| 제목 | 17px, 800, dark `rgba(255,255,255,0.92)` / light `COLORS.text` |
| 설명 | 13px, dark `rgba(255,255,255,0.48)` / light `COLORS.textMuted`, maxWidth 280px |
| 버튼 | dark: 흰 배경(`#ffffff`)+검정 텍스트 / light: 검정 배경(`#0a0a0a`)+흰 텍스트, hover 시 톤 변화 + `translateY(-1px)` |

### DotSkeletonCard

| 속성 | 값 |
|------|-----|
| 배경 | `#0f0f0f` |
| borderRadius | 0 (마소닉 갤러리와 동일) |
| 높이 | height prop 또는 마운트 시 160~280px 랜덤 고정 |
| 도트 패턴 | SVG `<pattern>`, 11×11 격자, circle cx=5.5 cy=5.5 r=1.4 |
| 도트 색 | `rgba(255,255,255,0.18)` |
| pattern id | 인스턴스마다 `useId()`로 고유화 (다중 렌더 시 SVG id 충돌 방지) |
| shimmer | `dotSkeletonPulse` — opacity 0.55 → 1 → 0.55, 1.8s ease-in-out infinite |

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

## 제약 조건

- 외부 SVG 파일/이미지 에셋 없음 — 순수 JSX 인라인 SVG
- 외부 라이브러리 import 없음 (react만)
- CSS `@keyframes`는 `document.head`에 1회만 주입 (id 체크)
- 도트 컨셉 그래픽 자체에는 `COLORS.primary`/`COLORS.accent`(보라·파랑) 사용 금지 — 순수 흥백만
- 기존 PhotoCard, ExplorePage 마소닉 그리드, Cosmos 언더라인 탭 변경 없음

---

## 수용 기준 (Acceptance Criteria)

- [x] AC1: GalleryPage 빈 상태 → DotEmptyState(레코드 그래픽) 표시
- [x] AC2: Explore/Feed/Series 빈 상태 → DotEmptyState 동일 적용, 테마별 색 반전 정상 동작
- [x] AC3: GalleryPage 로딩 → DotSkeletonCard 12개, shimmer 동작
- [x] AC4: 도트 컨셉 그래픽에 보라/파랑(primary/accent) 미사용, 순수 흥백 고대비만 사용
- [x] AC5: 순수 JSX SVG, 외부 에셋/라이브러리 없음
- [x] AC6: 모바일/데스크톱 레이아웃 정상(고정 크기 SVG라 컴테이너보다 항상 작음)
- [x] AC7: 기존 Cosmos 마소닉·탭 레이아웃 변경 없음
- [x] AC8: `npm run build` 성공
- [x] AC9(신규): 다크(흰 원반+검정 도트)·라이트(검정 원반+흰 도트) 양쪽 테마 실제 브라우저 렌더링 확인 완료
