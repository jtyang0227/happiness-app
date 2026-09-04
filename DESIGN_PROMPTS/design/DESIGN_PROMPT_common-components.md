# DESIGN_PROMPT — 공통 Button / Input / FormField 컴포넌트
> Feature 38-A1, A2, A3 | 2026-09-04 | Toss 디자인 시스템

기획 원문: `DESIGN_PROMPTS/planning/PLAN_38_MULTIPLATFORM_UX_V2.md` — 섹션 A-1, A-2, A-3

---

## 시스템 컨텍스트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템 (Toss 디자인 시스템, 2026-08-29~):
  primary:       '#3182F6'
  primaryDark:   '#1B64DA'
  primaryLight:  '#E8F3FF'
  accent:        '#4E9FFF'
  bg:            '#F2F4F6'
  surface:       '#ffffff'
  border:        '#E5E8EB'
  text:          '#191F28'
  textSecondary: '#4E5968'
  textMuted:     '#8B95A1'
  danger:        '#F04452'
  darkBg:        '#111417'
  darkSurface:   '#1A1E22'
  galleryBg:     '#111417'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- backdrop-filter/blur, 브랜드 컬러 tint된 그림자, 그라디언트 오브 장식 금지 — 플랫 서페이스만 사용
- 그림자는 중립 회색(rgba(0,0,0,0.04~0.12))만 사용
```

---

## 배경 및 목적

각 페이지가 버튼과 입력 필드를 독립 inline style로 구현하여 height, borderRadius, fontWeight가
화면마다 다르다. 공통 컴포넌트 하나로 표준화하면 인터랙션 상태 일관성과 키보드 접근성을 동시에
보장한다. 이 파일은 `Button`, `Input`, `Textarea`, `FormField` 4개 컴포넌트의 구체적 시각 스펙을
정의한다.

---

## 1. Button 컴포넌트

### 화면 와이어프레임

```
variant / size 매트릭스:
                   sm (h32)           md (h40)           lg (h48)
                ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
  primary       │  저장하기   │   │  저장하기   │   │  저장하기   │
                │  #3182F6 bg │   │  #3182F6 bg │   │  #3182F6 bg │
                └─────────────┘   └─────────────┘   └─────────────┘
                ┌─────────────┐   ┌─────────────┐
  secondary     │  취소       │   │  취소       │
                │  border+txt │   │  border+txt │
                └─────────────┘   └─────────────┘
                ┌─────────────┐   ┌─────────────┐
  ghost         │  더 보기    │   │  더 보기    │
                │  no border  │   │  no border  │
                └─────────────┘   └─────────────┘
                ┌─────────────┐   ┌─────────────┐
  danger        │  삭제       │   │  삭제       │
                │  #F04452 bg │   │  #F04452 bg │
                └─────────────┘   └─────────────┘

loading 상태 (primary md):
                ┌─────────────┐
                │   저장 중…  │   ← "…" 점 3개 opacity 펄스, 클릭 차단
                └─────────────┘

disabled 상태:
                ┌─────────────┐
                │  저장하기   │   ← opacity 0.4, cursor not-allowed
                └─────────────┘
```

### 컴포넌트 스펙

#### 크기(size) 시스템

| size | height | padding(좌우) | fontSize | fontWeight | borderRadius | letterSpacing |
|------|--------|--------------|----------|------------|--------------|---------------|
| sm   | 32px   | 12px         | 13px     | 500        | 8px          | 0             |
| md   | 40px   | 16px         | 14px     | 600        | 8px          | 0             |
| lg   | 48px   | 20px         | 15px     | 600        | 10px         | 0.01em        |

#### variant 색상 시스템

| variant   | 기본 bg       | 기본 color    | 기본 border           | hover bg      | hover border  |
|-----------|--------------|--------------|----------------------|--------------|--------------|
| primary   | `#3182F6`    | `#ffffff`    | none                 | `#1B64DA`    | none         |
| secondary | `#ffffff`    | `#3182F6`    | `1px solid #3182F6`  | `#E8F3FF`    | `1px solid #1B64DA` |
| ghost     | `transparent`| `#4E5968`    | none                 | `#F2F4F6`    | none         |
| danger    | `#F04452`    | `#ffffff`    | none                 | `#D03040`    | none         |

> danger hover 색 `#D03040` = `#F04452`를 brightness(88%)로 어둡게 한 근사치.

#### 인터랙션 상태 전이

```
상태            스타일 변화
─────────────────────────────────────────────────────────────────
default         위 variant 색상 그대로
hover           bg/border 위 표 적용 + transform: none (버튼은 lift 없음)
focus-visible   box-shadow: 0 0 0 3px rgba(49,130,246,0.25)
                outline: none (브라우저 기본 제거)
                *danger: 0 0 0 3px rgba(240,68,82,0.25)
active          transform: scale(0.98)
disabled        opacity: 0.4, pointer-events: none, cursor: not-allowed
loading         opacity: 0.7, pointer-events: none + "…" 점 텍스트 교체
─────────────────────────────────────────────────────────────────
```

transition 표준값: `all 0.15s ease`

#### loading 상태 점 애니메이션

```javascript
// <style> 태그 주입으로 CSS keyframe 정의
@keyframes dotPulse {
  0%, 80%, 100% { opacity: 0.2; }
  40%            { opacity: 1;   }
}
// "저장 중" 뒤에 <span> 3개 (각 0s, 0.2s, 0.4s delay)
// animation: dotPulse 1.2s ease-in-out infinite
```

#### focus-visible 전역 설정 (global.css 확인 필요)

```css
/* frontend/src/styles/global.css — 이미 있으면 생략, 없으면 추가 */
*:focus-visible {
  outline: 2px solid #3182F6;
  outline-offset: 2px;
}
button:focus:not(:focus-visible) {
  outline: none;
}
```

#### 구현 시 onMouseEnter/Leave 패턴

```javascript
// 예시 — 실제 구현 시 Button.jsx 내부에 상태 1개만 사용
const [hovered, setHovered] = useState(false);
const [active, setActive] = useState(false);

// style 결정 순서: disabled > loading > active > hover > default
```

---

## 2. Input / Textarea 컴포넌트

### 화면 와이어프레임

```
default:
  ┌──────────────────────────────────────┐
  │  입력 내용 또는 플레이스홀더          │  ← height 40px, border #E5E8EB
  └──────────────────────────────────────┘

focus:
  ┌──────────────────────────────────────┐  ← border #3182F6
  │  입력 중 텍스트                       │     + ring: 0 0 0 3px rgba(49,130,246,0.12)
  └──────────────────────────────────────┘

error:
  ┌──────────────────────────────────────┐  ← border #F04452
  │  잘못된 값                            │     + ring: 0 0 0 3px rgba(240,68,82,0.12)
  └──────────────────────────────────────┘

disabled:
  ┌──────────────────────────────────────┐
  │  (비활성)                             │  ← bg #F2F4F6, opacity 0.6, cursor default
  └──────────────────────────────────────┘

Textarea (height 자동 또는 고정 지정):
  ┌──────────────────────────────────────┐
  │  여러 줄 텍스트                       │
  │                                      │
  │                                      │
  └──────────────────────────────────────┘
```

### 컴포넌트 스펙

| 속성          | 값                                                |
|---------------|---------------------------------------------------|
| height        | 40px (Input), auto (Textarea, minHeight 80px)     |
| padding       | 0 12px (Input), 10px 12px (Textarea)              |
| fontSize      | 14px                                              |
| fontWeight    | 400                                               |
| border        | `1px solid #E5E8EB`                               |
| borderRadius  | 8px                                               |
| background    | `#ffffff`                                         |
| color         | `#191F28`                                         |
| placeholder   | color `#B0B8C1` (textHint)                        |
| lineHeight    | 1.5 (Textarea)                                    |

#### 상태 스타일

| 상태     | border 색       | box-shadow                               | background |
|----------|----------------|------------------------------------------|------------|
| default  | `#E5E8EB`      | none                                     | `#ffffff`  |
| focus    | `#3182F6`      | `0 0 0 3px rgba(49,130,246,0.12)`        | `#ffffff`  |
| error    | `#F04452`      | `0 0 0 3px rgba(240,68,82,0.12)`         | `#ffffff`  |
| disabled | `#E5E8EB`      | none                                     | `#F2F4F6`  |

focus/blur는 `onFocus`/`onBlur` 이벤트로 React state 관리 (`useState(false)`).

#### WCAG 2.1 AA 접근성 속성

```javascript
// Input에 반드시 포함할 속성
<input
  id={id}               // FormField의 label htmlFor와 연결
  aria-invalid={!!error}
  aria-describedby={error ? `${id}-error` : helperText ? `${id}-hint` : undefined}
/>
// 에러 메시지 span
<span id={`${id}-error`} role="alert" style={{ color: '#F04452', fontSize: 12 }}>
  {error}
</span>
```

---

## 3. FormField 래퍼 컴포넌트

### 화면 와이어프레임

```
required 레이블 + Input + 에러 메시지:

  이름 *
  ┌──────────────────────────────────────┐
  │  홍길동                               │
  └──────────────────────────────────────┘

  이름 *                                     ← label: fontSize 13px, fontWeight 500, color #191F28
  ┌──────────────────────────────────────┐
  │  (비어있음)                           │  ← error border
  └──────────────────────────────────────┘
  ⚠ 이름을 입력해주세요.                     ← color #F04452, fontSize 12px, marginTop 4px

helperText (에러 없을 때):
  비밀번호
  ┌──────────────────────────────────────┐
  │  ••••••••                            │
  └──────────────────────────────────────┘
  영문, 숫자 포함 8자 이상                   ← color #8B95A1, fontSize 12px, marginTop 4px
```

### 컴포넌트 스펙

| 요소          | 스타일                                                  |
|---------------|---------------------------------------------------------|
| 레이블        | fontSize 13px, fontWeight 500, color `#191F28`, marginBottom 6px |
| 필수 표시(*)  | color `#F04452`, marginLeft 2px                         |
| 에러 메시지   | fontSize 12px, color `#F04452`, marginTop 4px, role="alert" |
| 도움말 텍스트 | fontSize 12px, color `#8B95A1`, marginTop 4px           |
| 컨테이너 gap  | display flex, flexDirection column, marginBottom 16px   |

---

## 4. Skeleton 컴포넌트 색상 토큰 (A-3)

기존 `Skeleton.jsx`의 구 Cosmos 팔레트를 Toss 토큰으로 교체한다.

### shimmer 그라디언트 정의

```javascript
// 라이트 모드 (앱 기본 배경 #F2F4F6 기반)
const SHIMMER_LIGHT = `
  linear-gradient(
    90deg,
    #E5E8EB 25%,   /* COLORS.border */
    #F2F4F6 50%,   /* COLORS.bg */
    #E5E8EB 75%
  )
`;

// 다크 모드 (이미지 뷰어/에디터 전용, #111417 배경 기반)
const SHIMMER_DARK = `
  linear-gradient(
    90deg,
    #1A1E22 25%,   /* COLORS.darkSurface */
    #22262B 50%,   /* COLORS.darkElevated */
    #1A1E22 75%
  )
`;
```

### shimmer 애니메이션

```css
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
/* backgroundSize: '200% 100%' 로 설정 후 animation: shimmer 1.5s ease infinite */
```

### 적용 대상 확인 체크리스트

| 페이지            | SkeletonGalleryCard | SkeletonFeedCard | 적용 여부    |
|-------------------|--------------------:|----------------:|-------------|
| GalleryPage       | ✅ 확인              | —               | 이미 적용   |
| ExplorePage       | ✅ 확인              | —               | 이미 적용   |
| FeedPage          | —                   | ✅ 추가 필요    | 추가         |
| GatheringsPage    | ✅ 확인              | —               | 이미 적용   |

---

## 반응형

이 컴포넌트들은 플랫폼 독립적 원자 컴포넌트이며 별도 반응형 분기가 없다.
사용하는 컨테이너(FormField를 담는 폼 레이아웃)가 반응형을 책임진다.

Button width:
- 기본: `width: auto` (인라인)
- 전체 너비 필요 시 prop `fullWidth`로 `width: '100%'` 지정
- 모바일 폼에서 제출 버튼은 fullWidth 사용 권장

---

## Claude.ai 아티팩트 요청 프롬프트

아래 텍스트를 claude.ai 대화창에 그대로 붙여 사용한다.

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지/유니코드만 사용

컬러 토큰 (Toss 디자인 시스템):
  primary:      '#3182F6'
  primaryDark:  '#1B64DA'
  primaryLight: '#E8F3FF'
  bg:           '#F2F4F6'
  surface:      '#ffffff'
  border:       '#E5E8EB'
  text:         '#191F28'
  textSecondary:'#4E5968'
  textMuted:    '#8B95A1'
  textHint:     '#B0B8C1'
  danger:       '#F04452'

규칙:
- export default 함수형 컴포넌트 1개 반환 (데모 페이지)
- inline style만 사용, 외부 라이브러리 없음
- 한국어 UI 텍스트
- blur/glassmorphism/그라디언트 오브 금지, 그림자는 rgba(0,0,0,0.04~0.12)만

다음 컴포넌트들을 한 화면에 데모로 보여주는 React 컴포넌트를 만들어줘.

1. Button 컴포넌트 — variant(primary/secondary/ghost/danger) × size(sm/md/lg) 전체 매트릭스 표시.
   각 variant별로:
   - primary: bg #3182F6, color #fff, hover: bg #1B64DA
   - secondary: bg #fff, color #3182F6, border 1px solid #3182F6, hover: bg #E8F3FF + border #1B64DA
   - ghost: bg transparent, color #4E5968, hover: bg #F2F4F6
   - danger: bg #F04452, color #fff, hover: bg #D03040
   크기:
   - sm: height 32px, padding 0 12px, fontSize 13px, fontWeight 500, borderRadius 8px
   - md: height 40px, padding 0 16px, fontSize 14px, fontWeight 600, borderRadius 8px
   - lg: height 48px, padding 0 20px, fontSize 15px, fontWeight 600, borderRadius 10px
   인터랙션:
   - hover: onMouseEnter/Leave로 bg/border 변경
   - focus-visible: box-shadow 0 0 0 3px rgba(49,130,246,0.25) (danger는 rgba(240,68,82,0.25))
   - active: scale(0.98)
   - disabled: opacity 0.4, pointer-events none
   - loading: 텍스트를 "저장 중<span>.  .  .</span>"으로 교체, dotPulse @keyframes
   transition: all 0.15s ease

2. Input / Textarea 컴포넌트 — 4가지 상태(default/focus/error/disabled)를 열로 나란히 표시.
   - 공통: height 40px(Input), padding 0 12px, fontSize 14px, border 1px solid #E5E8EB, borderRadius 8px, bg #fff
   - focus: border #3182F6, box-shadow 0 0 0 3px rgba(49,130,246,0.12)
   - error: border #F04452, box-shadow 0 0 0 3px rgba(240,68,82,0.12)
   - disabled: bg #F2F4F6, opacity 0.6
   - placeholder color #B0B8C1
   onFocus/onBlur로 focus state 관리

3. FormField 래퍼 컴포넌트 — 레이블+Input+에러메시지 세트 3개 예시:
   (a) 정상 입력 상태: 레이블 "이름 *", value "홍길동"
   (b) 에러 상태: 레이블 "이메일 *", error="올바른 이메일 형식을 입력해주세요."
   (c) 도움말: 레이블 "비밀번호", helperText="영문, 숫자 포함 8자 이상"
   레이블: fontSize 13px, fontWeight 500, color #191F28, marginBottom 6px
   필수(*): color #F04452, marginLeft 2px
   에러: fontSize 12px, color #F04452, marginTop 4px, role="alert"
   도움말: fontSize 12px, color #8B95A1, marginTop 4px
   aria-invalid, aria-describedby 반드시 포함

4. Skeleton 컴포넌트 — 카드형 skeleton 2종 (GalleryCard: 비율 3:2, FeedCard: 이미지+텍스트줄) 표시.
   shimmer: linear-gradient(90deg, #E5E8EB 25%, #F2F4F6 50%, #E5E8EB 75%)
   backgroundSize: 200% 100%
   @keyframes shimmer: background-position -200%→200%
   animation: 1.5s ease infinite

화면 배경: #F2F4F6. 각 섹션은 흰 카드(#fff, borderRadius 12px, padding 24px, box-shadow 0 1px 4px rgba(0,0,0,0.06))로 구분.
```
