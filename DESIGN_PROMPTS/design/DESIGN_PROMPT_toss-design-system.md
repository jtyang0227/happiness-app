# DESIGN SYSTEM — Happiness × Toss (v2)

> 최초 전환: 2026-08-29 | 개정: 2026-10-07 (실제 구현과 대조해 재작성)
> 기준 파일: `frontend/src/constants/colors.js`, `frontend/src/styles/theme.css`,
> `frontend/src/constants/animations.js`, `frontend/src/constants/breakpoints.js`,
> `frontend/src/components/common/{Button,Input}.jsx`, `mobile/constants/{colors,layout}.js`

이 문서는 **코드에 실제로 있는 값**만 적는다. 문서와 코드가 다르면 코드가 기준이며, 차이는
"8. 알려진 불일치"에 기록한다. 과거 방향(AKIRA Neo-Tokyo 레드+시안, Cosmos × Pinterest 다크
에디토리얼, iOS 26 Liquid Glass)은 전부 폐기됐고 문서는 `DESIGN_PROMPTS/deprecated/`에 있다.

---

## 1. 원칙

1. **브랜드 컬러는 하나** — Toss Blue `#3182F6`. CTA, 활성 탭/링크, 선택 상태에만 쓴다.
   넓은 면을 칠하지 않는다(옅은 배경이 필요하면 `primaryLight`).
2. **플랫 서페이스** — 깊이는 배경 단계(`bg` → `surface`)와 1px `border`로 표현한다. 그림자는
   중립 회색 `rgba(0,0,0,0.04~0.12)`만. 브랜드색 glow, `backdrop-filter: blur()`, 글래스모피즘,
   그라디언트 오브 금지(예외는 6절 목록만).
3. **회색조 바탕** — 앱 배경 `#F2F4F6`, 카드 `#FFFFFF`.
4. **의미 컬러는 상태 전달 전용** — success/danger/warning은 브랜드 액센트로 쓰지 않는다.
5. **사진이 주인공인 화면만 어둡게** — 이미지 뷰어·에디터·포트폴리오 감상 템플릿. 남색/보라
   undertone 없는 중립 블랙(`#111417`/`#1A1E22`/`#22262B`).
6. **모션은 실용적으로** — 로딩(`spin`), 스켈레톤(`pulse`/`shimmer`), 진입(`fadeInUp`/`slideUp`/
   `fadeUp`)만. 글리치·오로라·글로우 금지. `prefers-reduced-motion`에서는 이동 없이 페이드만.

---

## 2. 컬러 토큰

### 2-1. 웹 (`COLORS` / CSS 변수)

| 역할 | `COLORS` 키 | CSS 변수 | 값 |
|---|---|---|---|
| 브랜드 | `primary` | `--color-primary` | `#3182F6` |
| 브랜드 hover/pressed | `primaryDark` | `--color-primary-dark` | `#1B64DA` |
| 브랜드 옅은 배경(배지·선택) | `primaryLight` | `--color-primary-light` | `#E8F3FF` |
| 브랜드 톤(선택 영역) | `primaryTonal` | `--color-primary-tonal` | `#C9E2FF` |
| 보조 블루 | `accent` | `--color-accent` | `#4E9FFF` |
| 앱 배경 | `bg` | `--color-bg` | `#F2F4F6` |
| 카드/서페이스 | `surface` | `--color-surface` | `#FFFFFF` |
| 보조 서페이스(입력 배경 등) | `surfaceDim` | `--color-surface-dim` | `#F5F6F8` |
| 오버레이 | — | `--color-overlay` | `rgba(0,0,0,0.45)` |
| 경계선 | `border` / `borderLight` | `--color-border` / `-light` | `#E5E8EB` / `#EEF1F4` |
| 본문 텍스트 | `text` | `--color-text` | `#191F28` |
| 보조 텍스트 | `textSecondary` | `--color-text-secondary` | `#4E5968` |
| 약한 텍스트 | `textMuted` | `--color-text-muted` | `#8B95A1` |
| 힌트/비활성 | `textHint` | `--color-text-hint` | `#B0B8C1` |
| 위험 | `danger` / `dangerTonal` | `--color-danger(-tonal)` | `#F04452` / `#FFEEEF` |
| 성공 | `success` / `successTonal` | `--color-success(-tonal)` | `#00C471` / `#E5F9F0` |
| 경고 | `warning` | `--color-warning` | `#FFB800` |
| 다크 배경 | `darkBg` / `galleryBg` | `--color-dark-bg` | `#111417` |
| 다크 서페이스 | `darkSurface` | `--color-dark-surface` | `#1A1E22` |
| 다크 상위면 | `darkElevated` / `galleryBorder` | `--color-dark-elevated` | `#22262B` |
| 다크 경계 | `darkBorder` | `--color-dark-border` | `#2E3338` |
| 다크 텍스트 | `darkText` / `darkTextSub` / `darkTextHint` | — | `#F2F4F6` / `#8B95A1` / `#5B6472` |

**도메인 컬러(브랜드와 무관, 데이터 표현 전용)**: `GENRE_META`(장르 12종 각각 고유색),
`MOOD_COLORS`(무드 11종 dot/bg). 통합 캘린더의 일정 유형 구분은 예약=`primary`,
약속=`success`, 모임=`#B45309`(토큰 없음 — 8절).

### 2-2. 모바일 (`mobile/constants/colors.js`)

값은 웹과 같지만 **키 이름이 다르다**. 화면 작성 시 아래 대응표를 따른다.

| 웹 키 | 모바일 키 |
|---|---|
| `text` | `textPrimary` |
| `surface` | `white` / `card` |
| `surfaceDim` | `inputBg` / `statsBg` |
| `primaryLight` | `tagBg` (텍스트는 `tagText`) |
| `darkSurface` / `darkBg` / `darkElevated` | `dark` / `darkDeep` / `darkAlt` |

모바일 전용: `liked`(`#ec4899`)/`fav`(`#f59e0b`)/`share`(`#10b981`) 액션 아이콘색,
`cancel`, `textLight`, `borderDark`.

---

## 3. 타이포그래피

- 폰트: 시스템 스택(`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, …`, `theme.css`
  `--font-family`). 웹폰트 없음.
- 웹 스케일(현행 화면들에서 쓰이는 값): 페이지 제목 22~28 / 700, 섹션 제목 16~18 / 700,
  본문 14~15 / 400~500, 보조 13, 캡션·배지 11~12.
- 모바일 `FONT`: `sm 13 · md 14 · base 15 · lg 16 · xl 18 · xxl 22 · hero 24`.
- 숫자 정렬이 필요한 금액·통계에는 `font-variant-numeric: tabular-nums`.

## 4. 간격 · 모서리 · 그림자

- 간격: 4의 배수. 모바일 `SPACING`: `xs 4 · sm 8 · md 12 · lg 16 · xl 24`. 웹 카드 패딩 16~20,
  섹션 간 24~32.
- 모서리: 웹 버튼/입력 8(lg 버튼 10), 카드 12~16, 모달·시트 16~20, 아바타 50%.
  모바일 `RADIUS`: `sm 10 · md 12 · lg 14 · card 16 · xl 18 · xxl 20`.
- 그림자(규칙 — 신규 작업 기준): 카드 `0 2px 8px rgba(0,0,0,0.04)`, hover 리프트
  `0 4px 24px rgba(0,0,0,0.08)`, 모달/시트 `0 8px 32px rgba(0,0,0,0.10)`~`0.12` 상한.
  현재 코드에는 모달에 `0.14~0.25`를 쓰는 곳이 여러 개 있다(8절).

## 5. 브레이크포인트 (`constants/breakpoints.js`)

`BP = { sm: 480, md: 768, lg: 1024, xl: 1280 }`

| 헬퍼 | 범위 | 용도 |
|---|---|---|
| `mq.mobile` | < 768 | 모바일 레이아웃 |
| `mq.tablet` | 768 ~ 1023 | 3컬럼 그리드, 2컬럼 폼 |
| `mq.desktop` | ≥ 1024 | 4컬럼 그리드, 좌우 분할 패널 |
| `mq.upToTablet` | < 1024 | |
| `mq.tabletUp` | ≥ 768 | "모바일이냐 아니냐" 2단 분기(PC 헤더 vs BottomNav) |

`mq.desktop`과 `mq.tabletUp`을 혼용하지 않는다. 화면 유형 6종별 태블릿 전략표는
`breakpoints.js` 주석에 있다. 새 화면에 600/640/900 같은 임의 숫자를 추가하지 않는다.

## 6. 모션 (`constants/animations.js`, `styles/global.css`)

- 전역 keyframes: `spin`, `pulse`, `shimmer`, `fadeInUp`, `slideUp`, `fadeUp`.
- 이징: `EASE_OUT = cubic-bezier(0.16, 1, 0.3, 1)`(진입), `EASE = cubic-bezier(0.4, 0, 0.2, 1)`
  (상태 변화). `SPRING`(오버슈트)은 정의만 있고 신규 사용 금지.
- 지속시간: hover/press 150ms, 진입 200~300ms, 리스트 스태거 30~40ms.
- 진입은 `scale(0)`이 아니라 `0.97 → 1` + opacity.
- hover에 `transform`을 쓰는 카드는 진입 애니메이션을 바깥 wrapper에 둔다(fill-mode가 hover
  transform을 덮어쓰는 버그 회피 — `GatheringCard` 패턴).

### 플랫 규칙의 허용 예외 (이 목록에 없는 blur는 위반)

| 위치 | 이유 |
|---|---|
| `PortfolioSlideshowPage` 상·하단 바, 이전/다음/재생 버튼 | 풀블리드 사진 위에 뜨는 컨트롤 |
| `components/portfolio/PrintButton.jsx` | 슬라이드쇼 컨트롤 일부 |
| `components/photo/PhotoViewer.jsx` 닫기/이전/다음 | 풀블리드 사진 위 컨트롤 |
| 모바일 `PortfolioSlideshowScreen` 컨트롤바(`expo-blur`) | 위와 동일 |

## 7. 공통 컴포넌트

**웹 `components/common/`**

| 컴포넌트 | 계약 |
|---|---|
| `Button` | `variant`: primary(블루 채움)/secondary(흰 바탕+블루 테두리)/ghost/danger. `size`: sm 32px · md 40px · lg 48px. 상태: hover/focus-visible(블루 25% 링, danger는 레드 링)/active/disabled/loading(라벨 유지 + 점 3개 펄스, 클릭 차단). `fullWidth` 지원 |
| `Input` / `Textarea` / `FormField` | 높이 40(Textarea min 80), radius 8, 테두리 기본 `#E5E8EB` → focus `#3182F6` → error `#F04452`. `FormField`가 label-htmlFor 연결, `aria-invalid`/`aria-describedby`, 에러 `role="alert"` |
| `Skeleton` / `DotSkeletonCard` | 비동기 화면 로딩 필수 |
| `EmptyState` / `DotEmptyState`(theme light/dark) | 빈 데이터 필수 |
| `Toast` / `ToastStack` | `useToast`와 함께, 타입별 컬러 바 |
| `Logo` | 정적 로고(구 `AkiraLogo` 대체) |
| `GenreTabBar` / `GenreSelector` / `ImageUploader` / `GridSpanPicker` | 도메인 공용 |

**모바일 `components/`**: `SkeletonCard`(Photo/Feed/Gathering 3종), `EmptyState`,
`ImageUploadButton`.

**규칙**: 새 화면·수정하는 화면의 버튼과 입력은 `Button`/`Input`을 쓴다. 인라인으로 새 버튼
스타일을 만들지 않는다.

## 8. 알려진 불일치 (코드 기준, 정리 대상)

| 항목 | 현황 | 조치 |
|---|---|---|
| `Button.jsx`/`Input.jsx`가 hex를 직접 하드코딩 | 값은 토큰과 같음 | `COLORS` 참조로 교체(MASTER_PLAN P1-5) |
| `Button` 사용 2곳, `Input` 사용 0곳 | 채택률 낮음 | 화면 수정 시 점진 적용 |
| ~~예외 목록에 없는 `backdropFilter` 9개 파일~~ | **해결(2026-10-07)** — blur 제거 + 배경 불투명도 상향, `Toast`는 흰 서페이스·의미색 바·중립 그림자로 재작성. 남은 blur는 6절 허용 예외 3개 파일뿐 | — |
| 모달 그림자 불투명도 0.14~0.25 (`0 16px 60px rgba(0,0,0,0.2)` 등 10곳 이상) | 규칙 상한 0.12 초과 | 화면 수정 시 4절 값으로 교체, 또는 "모달은 0.2까지" 규칙 완화 결정 |
| `EditorShell` 배경 `#080810`/`#0c0c18` 하드코딩 | 남색 undertone, 1-5원칙 위반 | `darkBg`/`darkSurface`로 교체 |
| 통합 캘린더 모임색 `#B45309` | 토큰 없음 | `GENRE`처럼 도메인 상수로 분리 검토 |
| 웹/모바일 키 이름 불일치 | 2-2 대응표로 관리 | 신규 키는 웹 이름을 따른다 |
| `GenreTabBar` dark 테마의 "Cosmos 언더라인" 명칭 | 이름만 남음, 색은 Toss | 문서·주석 명칭 정리 |

---

## 9. [시스템 컨텍스트] — Claude.ai 아티팩트 프롬프트용

```
[시스템 컨텍스트]
앱 이름: Happiness — 사진작가 포트폴리오·업무 관리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 아이콘 라이브러리 없음)

컬러 (Toss 디자인 시스템):
  primary '#3182F6'  primaryDark '#1B64DA'  primaryLight '#E8F3FF'  accent '#4E9FFF'
  bg '#F2F4F6'  surface '#ffffff'  surfaceDim '#F5F6F8'  border '#E5E8EB'
  text '#191F28'  textSecondary '#4E5968'  textMuted '#8B95A1'  textHint '#B0B8C1'
  danger '#F04452'  success '#00C471'  warning '#FFB800'
  darkBg '#111417'  darkSurface '#1A1E22'  darkElevated '#22262B'  (이미지 뷰어/에디터 전용)

컴포넌트 규격:
  버튼 높이 sm 32 / md 40 / lg 48, radius 8(lg 10), primary=블루 채움, secondary=흰 바탕+블루 테두리
  입력 높이 40, radius 8, focus 테두리 #3182F6, error #F04452
  카드 radius 12~16, 그림자 0 2px 8px rgba(0,0,0,0.06)
  브레이크포인트 768 / 1024

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- backdrop-filter/blur, 브랜드 컬러 tint 그림자, 그라디언트 오브 금지 — 플랫 서페이스만
- 그림자는 중립 회색(rgba(0,0,0,0.04~0.12))만
- 모든 클릭 요소에 hover/focus-visible/active 상태, 비동기 화면엔 스켈레톤·빈 상태
```
