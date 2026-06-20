# 23 — iOS 26 Liquid Glass 디자인 시스템 V2

## 0. V1 → V2 변경 이유

V1은 `rgba(255,255,255,0.72) + backdrop-filter: blur()` 조합의 단순 반투명 처리였다.
실제 유리(Glass)의 물리적 특성인 빛의 굴절(Refraction), 스펙큘러 하이라이트(Specular Highlight),
그리고 뒤 색상 증폭(Vibrancy)을 구현하지 못했다.

**V2 핵심 개선:**
- `inset 0 1.5px 0 rgba(255,255,255,X)` — 상단 스펙큘러 하이라이트 (빛이 위에서 들어오는 물리적 효과)
- `inset 0 -0.5px 0 rgba(0,0,0,Y)` — 하단 미세 그림자 (두께감)
- `saturate(180-220%) brightness(103-104%)` — Vibrancy 효과 (뒤 색상 강화)
- aurora 배경 그라디언트 — 유리 아래 색채 환경 구성

---

## 1. 핵심 시각 철학 — "Refracted Light"

유리는 투명하지 않다. 빛을 굴절시키고, 내부에 스펙큘러 하이라이트를 만들며,
뒤의 색을 진하게 만든다(vibrancy). V2는 이 물리적 특성을 CSS로 완전히 구현한다.

```
빛 방향: 위 → 아래
스펙큘러: 상단 테두리 내부에 밝은 흰색 선 (inset top)
그림자:   하단 테두리 내부에 미세한 어두운 선 (inset bottom)
Vibrancy: saturate + brightness로 배경 색 강화
Aurora:   유리 뒤 배경에 radial-gradient 색채 오브 배치
```

---

## 2. 배경 시스템 (Background System)

### 다크 모드 배경 (Login, SignUp)
```css
background:
  radial-gradient(ellipse at 20% 35%, rgba(91,110,245,0.28) 0%, transparent 50%),
  radial-gradient(ellipse at 80% 20%, rgba(30,5,69,0.90) 0%, transparent 55%),
  radial-gradient(ellipse at 55% 85%, rgba(167,139,250,0.20) 0%, transparent 50%),
  #05040f;
background-attachment: fixed;
```

### 라이트 모드 배경 (global body — Explore, Feed, List, Series, Profile, Admin)
```css
background:
  radial-gradient(ellipse at 15% 25%, rgba(167,139,250,0.18) 0%, transparent 55%),
  radial-gradient(ellipse at 85% 75%, rgba(91,110,245,0.14) 0%, transparent 55%),
  radial-gradient(ellipse at 50% 10%, rgba(196,181,253,0.10) 0%, transparent 40%),
  #f8f6ff;
background-attachment: fixed;
```

### 갤러리 배경
```
background: #0a0a0a;  /* 사진에 집중 */
```

---

## 3. Glass 소재 명세 (Glass Material Specification)

| Variant  | 용도                    | opacity | blur                              |
|----------|------------------------|---------|-----------------------------------|
| `bare`   | 아이콘 배경, 마이크로   | 10%     | blur(16px) saturate(150%)         |
| `light`  | 카드, 패널             | 68%     | blur(32px) saturate(180%) brightness(103%) |
| `strong` | 헤더, Nav              | 84%     | blur(40px) saturate(200%) brightness(104%) |
| `dark`   | 다크 배경 위 카드      | 72%     | blur(40px) saturate(180%) brightness(85%) |
| `darkBare`| 다크 오버레이         | 42%     | blur(24px) saturate(160%)         |
| `tinted` | 액션/강조 요소         | 16%     | blur(32px) saturate(220%)         |

### 각 variant 상세 명세

```js
bare: {
  bg:       'rgba(255,255,255,0.10)',
  blur:     'blur(16px) saturate(150%)',
  border:   'rgba(255,255,255,0.22)',
  specular: 'rgba(255,255,255,0.30)',  // 상단 inset highlight
  shadow:   '0 2px 12px rgba(0,0,0,0.06)',
}

light: {
  bg:       'rgba(255,255,255,0.68)',
  blur:     'blur(32px) saturate(180%) brightness(103%)',
  border:   'rgba(255,255,255,0.58)',
  specular: 'rgba(255,255,255,0.72)',
  shadow:   '0 8px 32px rgba(91,110,245,0.10), 0 2px 8px rgba(0,0,0,0.06)',
}

strong: {
  bg:       'rgba(255,255,255,0.84)',
  blur:     'blur(40px) saturate(200%) brightness(104%)',
  border:   'rgba(255,255,255,0.65)',
  specular: 'rgba(255,255,255,0.80)',
  shadow:   '0 4px 20px rgba(91,110,245,0.08), 0 1px 4px rgba(0,0,0,0.04)',
}

dark: {
  bg:       'rgba(8,8,22,0.72)',
  blur:     'blur(40px) saturate(180%) brightness(85%)',
  border:   'rgba(255,255,255,0.11)',
  specular: 'rgba(255,255,255,0.10)',
  shadow:   '0 8px 48px rgba(0,0,0,0.55)',
}

darkBare: {
  bg:       'rgba(8,8,22,0.42)',
  blur:     'blur(24px) saturate(160%)',
  border:   'rgba(255,255,255,0.08)',
  specular: 'rgba(255,255,255,0.06)',
  shadow:   '0 4px 24px rgba(0,0,0,0.35)',
}

tinted: {
  bg:       'rgba(91,110,245,0.16)',
  blur:     'blur(32px) saturate(220%)',
  border:   'rgba(91,110,245,0.28)',
  specular: 'rgba(255,255,255,0.25)',
  shadow:   '0 8px 32px rgba(91,110,245,0.22)',
}
```

---

## 4. 스펙큘러 하이라이트 규칙

```
라이트 glass (glass() 함수):
  inset 0  1.5px 0 ${specular}       ← 상단 밝은 선 (주 하이라이트)
  inset 0 -0.5px 0 rgba(0,0,0,0.05) ← 하단 미세 어두운 선 (두께감)

다크 glass (glassDark() 함수):
  inset 0  1.5px 0 ${specular}        ← 상단 (어두운 배경이므로 약함)
  inset 0 -0.5px 0 rgba(0,0,0,0.25)  ← 하단 (더 강함)
```

### Variant별 X, Y 값

| Variant   | 상단 specular             | 하단 rgba(0,0,0,Y) |
|-----------|--------------------------|-------------------|
| bare      | rgba(255,255,255,0.30)   | 0.05              |
| light     | rgba(255,255,255,0.72)   | 0.05              |
| strong    | rgba(255,255,255,0.80)   | 0.05              |
| dark      | rgba(255,255,255,0.10)   | 0.25              |
| darkBare  | rgba(255,255,255,0.06)   | 0.25              |
| tinted    | rgba(255,255,255,0.25)   | 0.05              |

---

## 5. 애니메이션 시스템

### glassIn (카드/모달 입장)
```css
@keyframes glassIn {
  0%   { opacity: 0; transform: scale(0.95) translateY(14px); filter: blur(6px); }
  60%  { filter: blur(0px); }
  100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
}
사용: animation: glassIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
```

### bokeh / bokehAlt (배경 오브)
```css
@keyframes bokeh {
  0%,100% { transform: translate(0, 0) scale(1); opacity: 0.65; }
  33%      { transform: translate(28px, -18px) scale(1.06); opacity: 0.85; }
  66%      { transform: translate(-18px, 14px) scale(0.95); opacity: 0.70; }
}
@keyframes bokehAlt {
  0%,100% { transform: translate(0, 0) scale(1); opacity: 0.50; }
  40%      { transform: translate(-24px, 20px) scale(1.04); opacity: 0.75; }
  70%      { transform: translate(18px, -12px) scale(0.97); opacity: 0.60; }
}
```

### Spring easing
```
SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'  ← 탄성 효과
EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'     ← 빠른 감속
```

---

## 6. 타이포그래피

```
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif
Base: 15px / line-height: 1.5
-webkit-font-smoothing: antialiased
```

---

## 7. 레이아웃 & 간격

```
헤더 높이: 58px (PC), calc(60px + safe-area-inset-bottom) (모바일)
카드 borderRadius: 24px (주요 카드), 20px (서브 카드), 16px (아이템)
패딩: 24-32px (카드 내부), 16-20px (페이지)
gap: 8-16px (요소 간격)
```

---

## 8. 페이지별 적용 명세

### LoginPage / SignUpPage
- 배경: `BG.dark` (딥 퍼플/네이비 aurora)
- 보케 오브: 3개, 480/380/260px, bokeh/bokehAlt 애니메이션
- 카드: `glassDark('dark')`, borderRadius: 28, glassIn 0.6s spring 입장
- 입력창: `glassDark('darkBare')` 스타일 (darkBare bg + 커스텀 border)
- 버튼: linear-gradient(135deg, #5b6ef5, #7c8ff7) + specular inset + hover scale

### Header (PC)
- `glass('strong')` — 84% white + 40px blur + 200% saturate
- borderBottom: 1px solid rgba(255,255,255,0.50)
- 로고: 22px + gradient badge (5b6ef5→a78bfa)
- nav-link active: rgba(91,110,245,0.12) bg + specular inset + primary 색상

### Header (BottomNav 모바일)
- `glassDark('dark')` — 72% 다크 + 40px blur
- borderTop: 1px solid rgba(255,255,255,0.10)
- 아이콘 active: #b8c0ff (라이트 퍼플)

### GalleryPage
- 배경: `BG.gallery` = #0a0a0a
- 툴바: `glassDark('dark')` sticky, top:0
- 정렬 칩 active: COLORS.primary + specular inset shadow

### ExplorePage
- 배경: global body (BG.light)
- 검색 바: `glass('strong')` borderRadius:50
- 포토카드: `glass('light')` borderRadius:20, glassIn 입장 애니메이션
- 무드 칩: COLORS 기반 (기존 유지)

### FeedPage
- 배경: global body (BG.light)
- 피드 카드: `glass('light')` borderRadius:24, spring transition

### ListPage
- 각 리스트 아이템: `glass('light')` borderRadius:16
- hover: translateX(4px) + shadowStrong

### SeriesPage
- 시리즈 카드: `glass('light')` borderRadius:20

### AdminLayout
- 사이드바: `glass('strong')` fixed, borderRight
- 상단바: `glass('strong')` sticky
- 배경: `BG.light`

### Toast / ToastStack
- 타입별 tinted glass (success/error/warning/info)
- backdrop-filter: blur(32px) saturate(180%) brightness(103%)
- specular: inset 0 1.5px 0 rgba(255,255,255,0.70)
- 각 타입별 colored shadow (rgba(색상,0.14))

---

## 9. constants/glass.js 핵심 API

```js
// V2 메인 API
glass(variant, extra)      // 라이트 glass 인라인 스타일 반환
glassDark(variant, extra)  // 다크 glass 인라인 스타일 반환

// 배경
BG.light    // 라이트 aurora
BG.dark     // 다크 aurora
BG.gallery  // 갤러리 블랙

// 애니메이션
GLASS_CSS / GLASS_KEYFRAMES  // @keyframes 문자열
SPRING      // cubic-bezier(0.34, 1.56, 0.64, 1)
EASE_OUT    // cubic-bezier(0.16, 1, 0.3, 1)

// 보케 오브
AMBIENT_ORBS  // 3개 오브 스타일 배열

// 레거시 호환 (기존 코드용)
GLASS.light.surface, GLASS.dark.blur 등
C, G, gStyle  // V1 dark-first API
```

---

## 10. claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style 전용 (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

iOS 26 Liquid Glass V2 컬러 시스템 (constants/glass.js):
  BG.light: radial-gradient aurora 라이트 배경 (#f8f6ff 기반)
  BG.dark:  radial-gradient aurora 다크 배경 (#05040f 기반)

glass('light'):
  background: rgba(255,255,255,0.68)
  backdropFilter: blur(32px) saturate(180%) brightness(103%)
  border: 1px solid rgba(255,255,255,0.58)
  boxShadow: [shadow] + inset 0 1.5px 0 rgba(255,255,255,0.72) + inset 0 -0.5px 0 rgba(0,0,0,0.05)

glass('strong'):
  background: rgba(255,255,255,0.84)
  backdropFilter: blur(40px) saturate(200%) brightness(104%)
  border: 1px solid rgba(255,255,255,0.65)
  boxShadow: [shadow] + inset 0 1.5px 0 rgba(255,255,255,0.80)

glassDark('dark'):
  background: rgba(8,8,22,0.72)
  backdropFilter: blur(40px) saturate(180%) brightness(85%)
  border: 1px solid rgba(255,255,255,0.11)
  boxShadow: [shadow] + inset 0 1.5px 0 rgba(255,255,255,0.10) + inset 0 -0.5px 0 rgba(0,0,0,0.25)

Spring: cubic-bezier(0.34, 1.56, 0.64, 1)
Primary: #5b6ef5, Accent: #a78bfa

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
```
