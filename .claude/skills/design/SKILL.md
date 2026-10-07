---
name: design
description: >
  Google Stitch 기반 디자이너 스킬. 자연어 설명 → JSX + CSS 코드 생성 → 브라우저 프리뷰까지
  자동으로 처리한다. 새 컴포넌트·페이지 디자인, 기존 UI 개선, 디자인 리뷰 등에 사용.
  예: /design "이번 주 인기 작가 TOP5 카드 컴포넌트 만들어줘"
---

# Happiness — Stitch 디자이너 스킬

Google Stitch처럼 동작하는 디자인 스킬이다.
사용자의 자연어 요청을 받아 **프로젝트 디자인 시스템에 맞는 JSX + inline style**을 생성하고,
빌드 검증 후 **브라우저 스크린샷으로 결과물을 직접 확인해 자가 수정**한 뒤 전달한다.

`.claude/agents/designer.md`(자율 서브에이전트)와 역할이 겹치지만, 이 스킬은 **현재 세션에서
바로 실행**되고 5단계 워크플로우 중 **PREVIEW(자가 스크린샷 검수) 단계가 필수**라는 점이 다르다.
디자인 작업 시 CLAUDE.md의 "디자인 작업 규칙"(DESIGN_PROMPT 문서 우선 작성)은 그대로 따른다.

---

## 워크플로우 (항상 이 순서, 생략 금지)

### 1. UNDERSTAND — 요청 파악
- 요청 문장에서 만들 대상(컴포넌트/페이지/개선)과 배치될 위치를 파악한다.
- 관련 파일을 읽는다: `CLAUDE.md`, `frontend/src/constants/colors.js`,
  `frontend/src/constants/breakpoints.js`, 배치될 페이지 또는 인접 컴포넌트 1~3개.
- 기존에 비슷한 컴포넌트가 있는지 아래 "공통 컴포넌트 재사용 체크리스트"를 먼저 확인한다 —
  있으면 새로 만들지 않고 재사용/확장한다.

### 2. PLAN — 설계 설명 (1~3줄)
컴포넌트 구조 · props · 레이아웃을 구현 전에 짧게 설명한다. ASCII 와이어프레임은 복잡한
레이아웃일 때만 추가한다. 이 설명 없이 바로 코드로 넘어가지 않는다.

### 3. GENERATE — 코드 생성
아래 "핵심 규칙"을 지켜 JSX + inline style을 작성한다. 신규 화면/컴포넌트라면 CLAUDE.md 규칙에
따라 `DESIGN_PROMPTS/design/DESIGN_PROMPT_<feature>.md`를 먼저(또는 구현과 함께) 작성한다.

### 4. BUILD — 빌드 검증
```bash
cd frontend && npm run build
```
"Compiled successfully."가 아니면 3단계로 돌아가 고친다.

### 5. PREVIEW — 브라우저 자가 검수 (생략 금지)
1. dev 서버가 안 떠 있으면 백그라운드로 기동: `BROWSER=none npm start` (frontend), 필요하면 백엔드도
   `./gradlew bootRun --no-daemon` (backend, 로그인·데이터가 필요한 화면일 때만).
2. Playwright로 실제 페이지를 열어 스크린샷을 찍는다 (`chromium.launch({ executablePath:
   '/opt/pw-browsers/chromium' })`). 컴포넌트 단독이면 실제로 쓰이는 화면에 붙여서 확인한다 —
   격리된 storybook 같은 건 없으므로 실제 배치 위치에서 봐야 한다.
3. 스크린샷을 직접 보고 아래를 점검한다:
   - 여백/정렬이 어색하지 않은가 (텍스트 잘림, 카드 높이 불일치, 과도한/부족한 padding)
   - 라이트/다크 각 배경에서 텍스트 대비가 충분한가 (흰 배경에 흰 텍스트 같은 실수 없는가)
   - hover/포커스 상태가 시각적으로 구분되는가
   - 모바일(<768px)·태블릿(768~1023px) 폭에서도 깨지지 않는가 (`constants/breakpoints.js`의
     `BP`/`mq` 참고 — 새 하드코딩 숫자 추가 금지)
4. 문제를 발견하면 3단계 코드로 돌아가 고치고 **다시 스크린샷**해서 확인한다. 이 루프는
   눈에 띄는 문제가 없을 때까지 반복한다.
5. 검수를 마친 스크린샷을 결과물과 함께 사용자에게 보여준다.

### 6. ITERATE — 피드백 반영
사용자 피드백이 오면 2~5단계를 다시 수행한다. 전체를 처음부터 다시 만들지 않는다.

---

## 핵심 규칙 (위반 불가)

### 컬러 — `frontend/src/constants/colors.js` 토큰만 사용

기준 문서: `DESIGN_PROMPTS/design/DESIGN_PROMPT_toss-design-system.md` (Toss 디자인 시스템).
과거 AKIRA(레드 `#E8121A`+시안 `#22D3EE`)·Cosmos 팔레트·glass.js는 전부 폐기됐다.

```javascript
// Toss 라이트 (기본 — 대부분의 페이지)
primary:       '#3182F6'   // CTA·활성 탭·선택 상태 전용, 넓은 면 칠하기 금지
primaryDark:   '#1B64DA'   // hover/pressed
primaryLight:  '#E8F3FF'   // 배지·선택 배경
accent:        '#4E9FFF'   // 보조 블루, 단독 배경 금지

bg:            '#F2F4F6'
surface:       '#ffffff'
surfaceDim:    '#F5F6F8'
border:        '#E5E8EB'
borderLight:   '#EEF1F4'

text:          '#191F28'
textSecondary: '#4E5968'
textMuted:     '#8B95A1'
textHint:      '#B0B8C1'

danger: '#F04452' / success: '#00C471' / warning: '#FFB800'   // 상태 전달 전용

// 다크 예외 영역 전용 — 아래 "레이아웃 결정 트리" 참고 없이 임의로 쓰지 말 것
darkBg: '#111417' / darkSurface: '#1A1E22' / darkElevated: '#22262B'
darkBorder: '#2E3338' / darkText: '#F2F4F6' / darkTextSub: '#8B95A1' / darkTextHint: '#5B6472'
galleryBg: '#111417'   // 이미지 뷰어 전용
```
hex를 직접 쓰지 않는다. 토큰에 없는 색이 필요하면 도메인 상수(`GENRE_META`, `MOOD_COLORS`)로
해결되는지 먼저 보고, 그래도 없으면 디자인 시스템 문서 8절(알려진 불일치)에 기록한다.
그림자는 중립 회색만(카드 `0 2px 8px rgba(0,0,0,0.04)`, 모달 상한 0.12), `backdropFilter`는
디자인 시스템 문서 6절의 허용 예외(슬라이드쇼·PhotoViewer 컨트롤) 외 금지.

### 레이아웃 결정 트리 — 다크냐 라이트냐

```
새 화면이 속하는 영역은?
├─ 로그인/회원가입(LoginPage, SignUpPage)          → 분할: 좌 다크 브랜드 패널(darkBg) + 우 흰 폼(surface)
├─ 이미지 뷰어/에디터(PhotoDetail 이미지 패널, /editor) → 다크 (darkBg/darkSurface/darkElevated)
│    ※ EditorShell에 남은 `#080810`/`#0c0c18`(남색 undertone)은 정리 대상 — 새 코드에 복사 금지
├─ 포트폴리오(/portfolio/:profileName)             → 템플릿 고유 톤을 따른다
│    (DARK_ROOM은 다크, MINIMAL은 화이트 — 해당 템플릿 파일의 기존 배경을 먼저 확인)
├─ 어드민(/admin/**)                                → Toss 라이트 (glass.js 예외는 폐지됨)
└─ 그 외 대부분(Gallery/Explore/Header/Feed/PhotoDetail 정보패널/Profile/Series/예약/약속/모임 등)
                                                    → Toss 라이트 (bg/surface/text 토큰)
```
확신이 안 서면 배치될 페이지의 기존 배경색을 먼저 확인하고 맞춘다 — 페이지 안에서 테마가
섞이는 것(화이트 페이지에 다크 카드 하나 등)이 가장 흔한 실수다.

### 컴포넌트 규칙

```javascript
// ✅ 올바른 패턴
export default function MyComponent({ prop1, prop2 }) {
  return (
    <div style={{
      background: COLORS.surface,
      color: COLORS.text,
      borderRadius: 12,
      padding: '16px 20px',
    }}>
      ✦ 아이콘은 이모지/유니코드 사용
    </div>
  );
}

// ❌ 금지 패턴
import { Icon } from 'some-library';    // 외부 아이콘 라이브러리
import styled from 'styled-components'; // CSS-in-JS
import styles from './style.css';       // CSS 모듈
```

### 인터랙션 상태 — 모든 클릭 가능 요소에 필수
```javascript
const [hovered, setHovered] = useState(false);
<button
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
  style={{
    background: hovered ? COLORS.primaryDark : COLORS.primary,
    transition: 'all 0.15s ease',
  }}
>
```
포커스 링(키보드 접근성)도 함께: `outline: 2px solid ${COLORS.primary}` (`:focus-visible`).

### 스켈레톤 로딩 / 빈 상태 — 비동기 데이터가 있는 모든 화면에 필수
기존 컴포넌트를 재사용한다 (아래 체크리스트). 새로 만들 필요가 거의 없다.

### 반응형 — `constants/breakpoints.js`의 `BP`/`mq` 사용
```javascript
import { BP, mq } from '../constants/breakpoints';
// BP = { sm:480, md:768, lg:1024, xl:1280 }
// mq.mobile / mq.tablet / mq.desktop / mq.upToTablet / mq.tabletUp

<style>{`
  .grid { display:grid; grid-template-columns: repeat(4, 1fr); }
  ${mq.tablet} { .grid { grid-template-columns: repeat(3, 1fr); } }
  ${mq.mobile} { .grid { grid-template-columns: repeat(2, 1fr); } }
`}</style>
```
새 화면에 임의의 브레이크포인트 숫자(예: 900px, 640px)를 하드코딩하지 않는다 — `BP` 토큰과
정확히 일치하지 않으면 먼저 어느 토큰에 대응시킬지 판단하고 쓴다.

---

## 공통 컴포넌트 재사용 체크리스트 (`frontend/src/components/common/`)

새로 만들기 전에 먼저 이걸로 되는지 확인한다:

| 상황 | 재사용할 컴포넌트 |
|---|---|
| 빈 상태 (다크 페이지) | `DotEmptyState` (theme="dark") |
| 빈 상태 (라이트 페이지) | `DotEmptyState` (theme="light") 또는 `EmptyState` |
| 카드 로딩 스켈레톤 | `DotSkeletonCard` (theme prop 지원) 또는 `Skeleton`의 `SkeletonGalleryCard`/`SkeletonFeedCard`/`SkeletonExploreCard`/`SkeletonListRow` |
| 장르 필터 탭바 | `GenreTabBar` (theme="dark"|"light") |
| 장르 선택 UI (폼) | `GenreSelector` |
| 이미지 업로드 | `ImageUploader` |
| 토스트 알림 | `Toast` / `ToastStack` (`useToast` 훅과 함께) |
| 로고 | `Logo` (variant="white"|"black") |
| 12컬럼 그리드 너비 선택 | `GridSpanPicker` |
| 버튼 | `Button` (default export, variant primary/secondary/ghost/danger × size sm/md/lg, `loading`, `fullWidth`) |
| 입력 | `Input` / `Textarea` / `FormField` (named export, `error`·`helperText`·`label`) |

버튼·입력은 인라인으로 새로 만들지 않고 위 `Button`/`Input`을 쓴다(현재 채택률이 낮아 화면을
수정할 때마다 교체해 나가는 중 — MASTER_PLAN P1-5).

---

## 파일 위치 규칙

| 파일 유형 | 위치 |
|---|---|
| 디자인 문서 | `DESIGN_PROMPTS/design/DESIGN_PROMPT_<feature>.md` |
| 페이지 컴포넌트 | `frontend/src/pages/<PageName>.jsx` |
| 공용 컴포넌트 | `frontend/src/components/common/<ComponentName>.jsx` |
| 도메인 컴포넌트 | `frontend/src/components/<domain>/<ComponentName>.jsx` |
| 레이아웃 | `frontend/src/components/layout/<ComponentName>.jsx` |

---

## 접근성 (WCAG 2.1 AA)

- 텍스트 대비: 라이트 페이지는 `COLORS.text`(#191F28)/`textSecondary`, 다크 예외 영역은
  `darkText`(#F2F4F6) — 배경과 반드시 짝지어 확인한다(PREVIEW 단계에서 스크린샷으로 실제 확인).
- 포커스 링: `outline: 2px solid ${COLORS.primary}` (브라우저 기본 제거 시 반드시 대체 제공).
- 아이콘 버튼·이미지·모달에 `aria-label` 필수.
- 모달은 Escape로 닫기, 폼은 Enter 제출.

---

## 실행 예시

**입력**: `/design "이번 주 인기 작가 TOP5 카드 컴포넌트 만들어줘"`

**진행**:
1. UNDERSTAND — GalleryPage 또는 ExplorePage 상단에 들어갈 순위 카드로 파악, `PhotoCard`/`ExplorePhotoCard`의 기존 카드 톤(화이트, `COLORS.border` 플레이스홀더) 확인.
2. PLAN — "가로 스크롤 5장 카드, 순위 배지(1~5) + 작가 아바타 + 작품수, Toss 라이트 톤"
3. GENERATE — `frontend/src/components/photo/TopArtistsCard.jsx` 작성 + `DESIGN_PROMPT_top-artists-card.md` 작성.
4. BUILD — `npm run build` 통과 확인.
5. PREVIEW — dev 서버 기동 → GalleryPage에 임시로 마운트해 실제 스크린샷 → 5번째 카드가 화면 밖으로 잘리는 것 발견 → `overflow-x:auto` + `scroll-snap` 추가 → 재스크린샷으로 확인.
6. 결과 스크린샷 + 코드 diff 전달.

---

## 이 스킬이 하지 않는 것

- 백엔드 API·엔티티·DB 스키마 변경 — `backend` 에이전트 소관.
- 인증/권한·비즈니스 로직 — 시각적 부분만 담당하고, 데이터 연동 로직이 복잡하면 어떤 API를
  어떻게 호출해야 하는지까지만 명시하고 실제 백엔드 작업은 넘긴다.
- 라우팅 전체 구조 변경(`App.jsx`의 `<Route>` 추가는 필요하면 하되, 인증 가드·레이아웃 셸
  재설계는 범위 밖).
- `CLAUDE.md`에 정의된 브랜드 컬러(`COLORS` 토큰)·아이콘 정책(이모지만)을 사용자가 명시적으로
  요청하지 않는 한 임의로 바꾸는 것.

---

## 금지 사항

- `import`에 react, react-router-dom 외 UI 라이브러리 추가 금지.
- CSS 파일, styled-components, emotion, tailwind 사용 금지.
- 외부 아이콘 라이브러리(FontAwesome, heroicons 등) 사용 금지.
- 영어 UI 텍스트 사용 금지 (한국어 필수).
- PREVIEW(브라우저 스크린샷 자가 검수) 단계를 생략하고 코드만 전달하는 것.
- 스켈레톤/빈 상태 없는 비동기 컴포넌트 제출.
- 새 화면인데 `DESIGN_PROMPT_<feature>.md` 없이 구현부터 시작하는 것.
- `BP`/`mq` 토큰 대신 임의의 브레이크포인트 숫자를 새로 하드코딩하는 것.

## 최종 체크리스트

- [ ] `DESIGN_PROMPTS/design/DESIGN_PROMPT_<feature>.md` 생성(또는 갱신)됨
- [ ] 재사용 가능한 공통 컴포넌트를 먼저 확인했음
- [ ] 모든 클릭 요소에 hover/focus 상태 정의됨
- [ ] 비동기 데이터에 스켈레톤/빈 상태 포함됨
- [ ] 모바일(<768px)·태블릿(768~1023px) 대응됨, `BP`/`mq` 토큰 사용
- [ ] `npm run build` 오류 없음
- [ ] **실제 브라우저 스크린샷으로 PREVIEW 단계를 거쳤고, 발견된 문제를 고쳐 재확인함**
- [ ] 하드코딩 hex 색상 없음 (`COLORS` 토큰 사용)
- [ ] 외부 라이브러리 import 없음
- [ ] 한국어 UI 텍스트 사용됨
