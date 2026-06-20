# 22 — iOS 26 Liquid Glass 전체 앱 리디자인 바이블

> 작성일: 2026-06-20  
> 버전: 1.0  
> 범위: Happiness 앱 전체 페이지 완전 재설계 (다크 퍼스트, 프리미엄 포트폴리오)  
> 영감: Apple iOS 26 Liquid Glass (WWDC 2025) + VSCO Dark + Apple Photos Dark + Unsplash  
> 상태: 기존 디자인 전면 폐기 — 신규 다크 토큰 시스템 기반 재설계

---

## 0. 비전 & 컨셉

### 앱 페르소나

"Happiness는 어두운 갤러리 벽 앞에 서 있는 느낌을 준다.  
사진 그 자체가 빛이고, UI는 그 빛을 방해하지 않는 투명한 유리 틀이다."

| 원칙 | 설명 |
|------|------|
| **Dark-First** | 모든 페이지는 기본적으로 어둡다. 배경은 `#07070f` 딥 블루-블랙 |
| **사진이 주인공** | UI 크롬을 최소화해 사진 자체가 돋보이게 |
| **Liquid Glass** | 모든 패널/카드는 유리 소재. 빛의 굴절, 반사, 투과 표현 |
| **글로벌 앰비언트** | 배경 컬러 오브가 전체 앱에 걸쳐 은은한 색감을 입힘 |
| **소재 계층** | Chrome > Thick > Regular > Thin — 계층마다 투명도와 흐림 다름 |

### 기존 디자인과의 차이

| 항목 | 기존 | 신규 |
|------|------|------|
| 배경 | `#f5f5fa` 라이트 / `#0e0e0e` 갤러리 | `#07070f` 딥 블루-블랙 (전체 앱) |
| 컬러 토큰 | COLORS 단일 팔레트 | C 토큰(다크 전용) + G 토큰(소재 계층) |
| 카드 | 흰색 `surface` | 반투명 Regular Glass |
| 네비게이션 | 고체 배경 | Chrome Glass + 스펙큘러 하이라이트 |
| 애니메이션 | ease | SPRING + EASE 두 곡선 |
| 배경 효과 | 없음 | 떠다니는 컬러 오브 (글로벌 앰비언트) |

---

## 1. 디자인 토큰 시스템

### 1-1. 색상 팔레트 (C 토큰)

```javascript
// 신규 다크 전용 색상 시스템
// 기존 constants/colors.js의 COLORS를 대체하지 않고 별도로 관리
// 파일: constants/darkColors.js

export const C = {
  // ── 배경 ──
  bg:       '#07070f',    // 전역 배경 — 딥 블루-블랙
  bgLayer:  '#0c0c1a',    // 카드 내부 레이어 배경

  // ── 텍스트 ──
  text:     '#f0f0ff',    // 주요 텍스트 — 약간 보랏빛 흰색
  textSub:  '#8a8ab8',    // 보조 텍스트 — 미드-톤 퍼플-그레이
  textHint: '#4e4e7a',    // 힌트/플레이스홀더 — 다크 퍼플-그레이

  // ── 브랜드 ──
  primary:  '#6c6ef7',    // 일렉트릭 인디고 (기존 #5b6ef5에서 밝게)
  accent:   '#9b7ff7',    // 바이올렛 (기존 #a78bfa와 유사)

  // ── 시맨틱 ──
  danger:   '#ff4d6d',    // 레드-핑크
  success:  '#34d399',    // 에메랄드
  warning:  '#fbbf24',    // 앰버

  // ── 구분선 ──
  divider:  'rgba(255,255,255,0.06)',
};

// 무드 컬러 — 다크 배경에 최적화된 버전
export const MOOD_DARK = {
  WARM:       { dot: '#ff8a65', bg: 'rgba(255,138,101,0.12)', label: '따뜻함' },
  ENERGETIC:  { dot: '#ffd54f', bg: 'rgba(255,213,79,0.10)',  label: '에너지' },
  NATURAL:    { dot: '#66bb6a', bg: 'rgba(102,187,106,0.10)', label: '자연스러움' },
  COOL:       { dot: '#42a5f5', bg: 'rgba(66,165,245,0.10)',  label: '시원함' },
  SERENE:     { dot: '#9b7ff7', bg: 'rgba(155,127,247,0.12)', label: '평온함' },
  ROMANTIC:   { dot: '#f48fb1', bg: 'rgba(244,143,177,0.10)', label: '로맨틱' },
  VIBRANT:    { dot: '#ff4081', bg: 'rgba(255,64,129,0.10)',  label: '생동감' },
  MUTED:      { dot: '#78909c', bg: 'rgba(120,144,156,0.10)', label: '차분함' },
  DRAMATIC:   { dot: '#546e7a', bg: 'rgba(84,110,122,0.10)',  label: '극적임' },
  CLEAN:      { dot: '#b0bec5', bg: 'rgba(176,190,197,0.08)', label: '청결함' },
  MONOCHROME: { dot: '#90a4ae', bg: 'rgba(144,164,174,0.08)', label: '단색' },
};
```

### 1-2. 글래스 소재 계층 (G 토큰)

5단계 소재 계층. 위로 갈수록 더 불투명하고 흐림 강도가 높다.

```javascript
// 파일: constants/glass.js (기존 파일 확장)

export const G = {
  // ── Chrome ── (네비게이션바, 툴바 — 가장 불투명)
  chrome: {
    bg:     'rgba(14,14,26,0.96)',
    blur:   'blur(48px) saturate(180%)',
    border: 'rgba(255,255,255,0.08)',
    glow:   '0 1px 0 rgba(255,255,255,0.12) inset',   // 스펙큘러 탑 하이라이트
    shadow: '0 1px 0 rgba(0,0,0,0.5)',
  },

  // ── Thick ── (패널, 사이드바, 모달 배경)
  thick: {
    bg:     'rgba(16,16,28,0.88)',
    blur:   'blur(40px) saturate(160%)',
    border: 'rgba(255,255,255,0.10)',
    glow:   '0 1px 0 rgba(255,255,255,0.10) inset',
    shadow: '0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05) inset',
  },

  // ── Regular ── (카드, 일반 모달 — 중간 투명도)
  regular: {
    bg:     'rgba(18,18,32,0.72)',
    blur:   'blur(32px) saturate(150%)',
    border: 'rgba(255,255,255,0.08)',
    glow:   '0 1px 0 rgba(255,255,255,0.08) inset',
    shadow: '0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset',
  },

  // ── Thin ── (호버 상태, 태그 배경 — 가장 투명)
  thin: {
    bg:     'rgba(255,255,255,0.05)',
    blur:   'blur(16px) saturate(130%)',
    border: 'rgba(255,255,255,0.06)',
    glow:   'none',
    shadow: '0 2px 8px rgba(0,0,0,0.2)',
  },

  // ── Tinted ── (액센트 강조 요소 — 인디고 틴트)
  tinted: {
    bg:     'rgba(108,110,247,0.15)',
    blur:   'blur(20px) saturate(140%)',
    border: 'rgba(108,110,247,0.30)',
    glow:   '0 1px 0 rgba(108,110,247,0.25) inset',
    shadow: '0 4px 20px rgba(108,110,247,0.20)',
  },
};

// 소재별 인라인 스타일 헬퍼
export function gStyle(level = 'regular', overrides = {}) {
  const m = G[level];
  return {
    background:           m.bg,
    backdropFilter:       m.blur,
    WebkitBackdropFilter: m.blur,
    border:               `1px solid ${m.border}`,
    boxShadow:            `${m.glow !== 'none' ? m.glow + ', ' : ''}${m.shadow}`,
    ...overrides,
  };
}
```

### 1-3. 타이포그래피

```javascript
export const TYPE = {
  // 디스플레이 — 히어로 타이틀
  display: { fontSize: 48, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1 },
  // 헤드라인 — 섹션 제목
  h1:      { fontSize: 32, fontWeight: 700, letterSpacing: -0.8 },
  h2:      { fontSize: 24, fontWeight: 700, letterSpacing: -0.5 },
  h3:      { fontSize: 18, fontWeight: 600, letterSpacing: -0.3 },
  // 바디
  body:    { fontSize: 15, fontWeight: 400, lineHeight: 1.6 },
  bodyMd:  { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
  bodySm:  { fontSize: 13, fontWeight: 400, lineHeight: 1.5 },
  // UI
  label:   { fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' },
  caption: { fontSize: 11, fontWeight: 400, letterSpacing: 0.2 },
};
```

### 1-4. 애니메이션 커브

```javascript
export const ANIM = {
  // 스프링 — 호버, 등장 애니메이션 (살짝 오버슈트)
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  // 이즈 — 일반 트랜지션
  ease:   'cubic-bezier(0.4, 0, 0.2, 1)',

  // 지속 시간
  fast:   '120ms',
  base:   '220ms',
  slow:   '360ms',
};

// CSS 키프레임 (인젝션용)
export const KEYFRAMES = `
  @keyframes glassIn {
    from { opacity: 0; transform: translateY(16px) scale(0.96); filter: blur(4px); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    filter: blur(0);   }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes orbFloat {
    0%, 100% { transform: translate(0, 0)     scale(1);    }
    33%       { transform: translate(30px, -20px) scale(1.05); }
    66%       { transform: translate(-20px, 15px) scale(0.97); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1;   }
    50%       { opacity: 0.5; }
  }
  @keyframes specularSweep {
    0%   { transform: translateX(-100%) rotate(25deg); opacity: 0; }
    20%  { opacity: 0.6; }
    100% { transform: translateX(300%)  rotate(25deg); opacity: 0; }
  }
`;
```

---

## 2. 글로벌 앰비언트 배경

모든 페이지 뒤에 `position: fixed` 로 깔리는 컬러 오브 레이어.  
개별 페이지 컴포넌트가 아닌 `App.js` 루트 레벨에서 한 번만 렌더링.

```javascript
// components/layout/AmbientBackground.jsx

const orbs = [
  {
    // 오브 1 — 좌상단, 인디고
    top: '-10%', left: '-5%',
    width: 600, height: 600,
    color: 'rgba(108,110,247,0.18)',
    blur: 120,
    duration: '12s',
    delay: '0s',
    direction: 'normal',
  },
  {
    // 오브 2 — 우하단, 바이올렛
    bottom: '-15%', right: '-8%',
    width: 500, height: 500,
    color: 'rgba(155,127,247,0.14)',
    blur: 100,
    duration: '16s',
    delay: '2s',
    direction: 'reverse',
  },
  {
    // 오브 3 — 우중단, 로즈 (작고 미묘)
    top: '40%', right: '10%',
    width: 320, height: 320,
    color: 'rgba(255,77,109,0.08)',
    blur: 80,
    duration: '20s',
    delay: '4s',
    direction: 'normal',
  },
];

// 스타일
const containerStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 0,          // 모든 콘텐츠 아래
  overflow: 'hidden',
  pointerEvents: 'none',
  background: '#07070f',
};

const orbStyle = (orb) => ({
  position: 'absolute',
  top: orb.top, left: orb.left,
  bottom: orb.bottom, right: orb.right,
  width: orb.width, height: orb.height,
  borderRadius: '50%',
  background: orb.color,
  filter: `blur(${orb.blur}px)`,
  animation: `orbFloat ${orb.duration} ease-in-out ${orb.delay} infinite ${orb.direction}`,
});
```

---

## 3. 페이지별 상세 설계

---

### 3-1. LoginPage

#### 레이아웃 구조

```
[AmbientBackground — fixed, zIndex 0]
[LoginPage — zIndex 1, 100vh flex center]
  └── GlassCard (Regular Glass, maxWidth 420px)
        ├── 로고 영역 (앱 이름 + 태그라인)
        ├── 이메일/비밀번호 입력 필드 (Thin Glass input)
        ├── 로그인 버튼 (Tinted Glass CTA)
        ├── 소셜 로그인 구분선
        ├── 소셜 버튼 행 (카카오/구글/네이버/애플 — 각각 Thin Glass)
        └── 회원가입 링크
```

#### 소재 사용

| 요소 | 소재 | 특이사항 |
|------|------|----------|
| 페이지 배경 | AmbientBackground | 오브 3개 |
| 메인 카드 | Regular Glass | `borderRadius: 24px`, `padding: 40px 36px` |
| 입력 필드 | Thin Glass | `borderRadius: 12px` |
| 로그인 CTA | 인디고 그라디언트 | `linear-gradient(135deg, #6c6ef7, #9b7ff7)` |
| 소셜 버튼 | Thin Glass | hover → Regular Glass |
| 카드 상단 | 스펙큘러 하이라이트 | `0 1px 0 rgba(255,255,255,0.08) inset` |

#### 인터랙션

- 카드: `glassIn` 0.5s 등장
- 입력 필드 포커스: `border-color: rgba(108,110,247,0.60)` + `box-shadow: 0 0 0 3px rgba(108,110,247,0.15)`
- CTA 호버: `scale(1.02)` + `box-shadow` 강화 (SPRING 220ms)
- 소셜 버튼 호버: `bg → Regular Glass` + `translateY(-1px)` (SPRING 180ms)

---

#### Claude.ai 프롬프트 — LoginPage

```
[시스템 컨텍스트]
앱 이름: Happiness — 프리미엄 사진 포트폴리오 앱 (Dark-First)
기술 스택: React 18 SPA, React Router v6, inline style only
아이콘: 이모지 또는 유니코드 기호 사용 (외부 라이브러리 없음)

새 다크 토큰 시스템:
  C.bg:       '#07070f'   — 전역 배경
  C.text:     '#f0f0ff'   — 주요 텍스트
  C.textSub:  '#8a8ab8'   — 보조 텍스트
  C.textHint: '#4e4e7a'   — 플레이스홀더
  C.primary:  '#6c6ef7'   — 인디고
  C.accent:   '#9b7ff7'   — 바이올렛
  C.danger:   '#ff4d6d'   — 위험
  C.divider:  'rgba(255,255,255,0.06)'

Glass 소재 (Regular):
  bg:     'rgba(18,18,32,0.72)'
  blur:   'blur(32px) saturate(150%)'
  border: '1px solid rgba(255,255,255,0.08)'
  glow:   'inset 0 1px 0 rgba(255,255,255,0.08)'
  shadow: '0 4px 24px rgba(0,0,0,0.4)'

Glass 소재 (Thin) — 입력 필드용:
  bg:     'rgba(255,255,255,0.05)'
  blur:   'blur(16px)'
  border: '1px solid rgba(255,255,255,0.06)'

애니메이션:
  SPRING: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  EASE:   'cubic-bezier(0.4, 0, 0.2, 1)'
  @keyframes glassIn { from { opacity:0; transform: translateY(16px) scale(0.96); } to { opacity:1; transform: none; } }
  @keyframes orbFloat { 0%,100%{transform:translate(0,0)} 33%{transform:translate(30px,-20px)} 66%{transform:translate(-20px,15px)} }

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용 (CSS-in-JS 라이브러리 없음)
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트

작업 요청:
Happiness 앱의 새 LoginPage 컴포넌트를 만들어주세요.

요구사항:
1. 배경: 전체 화면 (#07070f 딥 블루-블랙) + 3개의 컬러 오브 (fixed, blur처리, 떠다니는 애니메이션)
   - 오브1: 좌상단, rgba(108,110,247,0.18), blur 120px, orbFloat 12s
   - 오브2: 우하단, rgba(155,127,247,0.14), blur 100px, orbFloat 16s reverse
   - 오브3: 우중앙, rgba(255,77,109,0.08), blur 80px, orbFloat 20s 4s delay
2. 중앙 글래스 카드 (Regular Glass, maxWidth 420px, borderRadius 24px, padding 40px 36px)
   - 카드 등장: glassIn 애니메이션 0.5s ease
   - 상단: ✨ 아이콘 + "Happiness" h1 타이틀 (흰색, fontWeight 800) + "포트폴리오 갤러리" 서브텍스트
3. 입력 필드 2개 (Thin Glass):
   - 이메일 주소 (type="email"), 비밀번호 (type="password")
   - 포커스 시: border-color rgba(108,110,247,0.6) + box-shadow 0 0 0 3px rgba(108,110,247,0.15)
   - 플레이스홀더: '#4e4e7a'
4. 로그인 버튼:
   - background: linear-gradient(135deg, #6c6ef7 0%, #9b7ff7 100%)
   - boxShadow: 0 4px 20px rgba(108,110,247,0.35), inset 0 1px 0 rgba(255,255,255,0.2)
   - 호버: scale(1.02) + shadow 강화 (SPRING 220ms)
   - 너비 100%, borderRadius 12px, height 48px
5. 소셜 로그인 구분선: "또는 소셜 계정으로 로그인" 텍스트 + 양쪽 라인 (C.divider)
6. 소셜 버튼 4개 (카카오 🟡, 구글 🔵, 네이버 🟢, 애플 ⚫):
   - Thin Glass 스타일, borderRadius 12px, height 44px
   - 호버: Regular Glass로 전환 + translateY(-1px) (SPRING 180ms)
   - 2×2 그리드 배치
7. 하단: "계정이 없으신가요?" + "회원가입" 링크 (C.primary)
8. 오류 메시지: 카드 내 붉은 글래스 알림 (rgba(255,77,109,0.15) bg + red border)
```

---

### 3-2. SignUpPage

#### 레이아웃 구조

LoginPage와 동일한 구조. 카드 내부만 다름.

```
GlassCard
  ├── 로고 영역
  ├── 이름 입력 (Thin Glass)
  ├── 이메일 입력 (Thin Glass)
  ├── 비밀번호 입력 (Thin Glass)
  ├── 비밀번호 확인 (Thin Glass)
  ├── 약관 동의 체크박스 (custom Thin Glass checkbox)
  ├── 회원가입 CTA 버튼 (Tinted/인디고)
  └── "이미 계정이 있으신가요?" 로그인 링크
```

#### 소재 사용

LoginPage와 동일. 추가:

| 요소 | 소재 | 특이사항 |
|------|------|----------|
| 체크박스 | Thin Glass | 체크 시 인디고 Tinted + 체크마크 |
| 약관 링크 | 텍스트 | `color: C.primary`, 밑줄 |

---

#### Claude.ai 프롬프트 — SignUpPage

```
[시스템 컨텍스트 — LoginPage와 동일]

작업 요청:
Happiness 앱의 SignUpPage 컴포넌트를 만들어주세요.

요구사항:
1. LoginPage와 동일한 배경 (컬러 오브 3개)
2. 중앙 글래스 카드 (Regular Glass, maxWidth 440px)
3. 입력 필드 4개 (Thin Glass):
   - 이름, 이메일, 비밀번호, 비밀번호 확인
   - 모든 포커스/에러 상태 동일
   - 비밀번호 확인 불일치 시: 빨간 테두리 + 에러 메시지
4. 비밀번호 강도 인디케이터:
   - 입력 필드 하단에 4칸 강도 바 (약/보통/강/매우강)
   - 약: rgba(255,77,109,0.8), 보통: rgba(251,191,36,0.8), 강/매우강: rgba(52,211,153,0.8)
   - 각 칸: Thin Glass 배경 → 채워질 때 해당 색으로 전환
5. 약관 동의 영역 (Thin Glass 컨테이너):
   - 커스텀 체크박스: 14px 정사각형, Thin Glass 배경
   - 체크 시: C.primary 배경 + "✓" 흰색
   - "[이용약관]과 [개인정보처리방침]에 동의합니다" (링크는 C.primary)
6. 회원가입 버튼:
   - LoginPage CTA와 동일 스타일
   - 약관 미동의 시: 50% 불투명 + cursor not-allowed
7. 하단: "이미 계정이 있으신가요?" + "로그인" 링크
8. 성공 시: 카드 전체 glassIn 역재생 후 라우팅
```

---

### 3-3. Header (PC — 768px 이상)

#### 레이아웃 구조

```
[Chrome Glass Sticky Bar — height 60px, zIndex 200]
  ├── 로고 영역 (좌측)  — ✨ Happiness
  ├── 네비게이션 링크 (중앙 또는 우측)
  │     탐색 · 갤러리 · 목록 · 시리즈 · 피드
  ├── 활성 링크: 인디고 Tinted Pill
  └── 우측 액션 영역
        ├── 문의함 아이콘 (미읽음 배지 — 레드 글래스)
        ├── 에디터 링크
        └── 프로필 아바타 (circular, 32px)
```

#### 소재 사용

| 요소 | 소재 | 값 |
|------|------|-----|
| 헤더 바 전체 | Chrome Glass | `rgba(14,14,26,0.96)` + `blur(48px)` |
| 스펙큘러 라인 | 하단 하이라이트 | `border-bottom: 1px solid rgba(255,255,255,0.06)` |
| 활성 네비 pill | Tinted Glass | `rgba(108,110,247,0.20)` + 인디고 border |
| 비활성 네비 링크 | 텍스트 | `color: C.textSub`, hover → `C.text` |
| 미읽음 배지 | 위험 글래스 | `rgba(255,77,109,0.90)` + 흰 텍스트 |
| 아바타 | Chrome 테두리 | `border: 1.5px solid rgba(255,255,255,0.15)` |

#### 인터랙션

- 스크롤 내려갈 때: `blur` 강화 효과 (JS `window.scrollY > 10` 감지)
- 네비 링크 호버: `color: C.text` + 활성 pill 슬라이드 (EASE 200ms)
- 아바타 호버: `scale(1.05)` + `border-color: C.primary` (SPRING 180ms)

---

#### Claude.ai 프롬프트 — Header (PC)

```
[시스템 컨텍스트]
앱 이름: Happiness — Dark-First 프리미엄 사진 포트폴리오
기술 스택: React 18, React Router v6, inline style only

다크 토큰:
  C.bg: '#07070f' / C.text: '#f0f0ff' / C.textSub: '#8a8ab8'
  C.primary: '#6c6ef7' / C.accent: '#9b7ff7' / C.danger: '#ff4d6d'
  C.divider: 'rgba(255,255,255,0.06)'

Chrome Glass:
  bg: 'rgba(14,14,26,0.96)' / blur: 'blur(48px) saturate(180%)'
  border-bottom: '1px solid rgba(255,255,255,0.06)'
  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset'

Tinted Glass (활성 pill):
  bg: 'rgba(108,110,247,0.20)' / border: '1px solid rgba(108,110,247,0.40)'
  borderRadius: 20px / padding: '4px 14px'

SPRING: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
EASE: 'cubic-bezier(0.4, 0, 0.2, 1)'

규칙: export default 함수형, inline style, react/react-router-dom만, 한국어 텍스트

작업 요청:
Happiness 앱의 PC Header 컴포넌트 (768px 이상)를 만들어주세요.

요구사항:
1. Chrome Glass sticky bar:
   - position: sticky, top: 0, zIndex: 200, height: 60px
   - background: Chrome Glass / blur: 48px / borderBottom: C.divider
   - 스펙큘러: inset 0 1px 0 rgba(255,255,255,0.04)
2. 레이아웃 (flexbox, justifyContent: space-between, alignItems: center, padding: 0 24px):
   좌: 로고 | 중: 네비링크 | 우: 액션
3. 로고: "✨ Happiness" — fontSize 18, fontWeight 800, color C.text
   클릭 시 "/" 이동
4. 중앙 네비게이션 (gap 4px):
   - 링크 목록: [{to:'/explore', label:'탐색'}, {to:'/gallery', label:'갤러리'}, {to:'/list', label:'목록'}, {to:'/series', label:'시리즈'}, {to:'/feed', label:'피드'}]
   - 비활성: color C.textSub, padding '6px 14px', borderRadius 20px, transition EASE 180ms
   - 비활성 호버: color C.text, background 'rgba(255,255,255,0.05)'
   - 활성(useLocation 비교): Tinted Glass pill 스타일, color C.primary
5. 우측 액션 (gap 8px):
   a. 문의함 버튼 (🔔): 상대 위치, 미읽음 count > 0일 때 우상단에 빨간 pill 배지
      배지: fontSize 10px, minWidth 16px, height 16px, rgba(255,77,109,0.9), 흰색
   b. 에디터 링크 ("✏️ 에디터"): Thin Glass 스타일 버튼
   c. 프로필 아바타 (32px circle): border 1.5px solid rgba(255,255,255,0.15)
      호버: scale(1.05) + border-color C.primary (SPRING 180ms)
6. useScrolled 훅 (scrollY > 10):
   스크롤 시 blur 48px→60px, background opacity 강화 (transition EASE 300ms)
7. props: { unreadCount = 0, user = null }
   user가 null이면 우측에 "로그인" 버튼만 표시 (Tinted Glass)
```

---

### 3-4. BottomNav (모바일 — 768px 미만)

#### 레이아웃 구조

```
[Chrome Glass Floating Pill — position fixed, bottom]
  탐색 · 갤러리 · ➕등록 · 목록 · 프로필
  (등록 버튼만 원형 강조 — 인디고 그라디언트)
```

#### 소재 사용

| 요소 | 소재 | 특이사항 |
|------|------|----------|
| 네비 컨테이너 | Chrome Glass | 풀 width가 아닌 pill — `borderRadius: 28px`, `marginX: auto` |
| 비활성 아이콘 | 텍스트/이모지 | `color: C.textSub` |
| 활성 아이콘 | Tinted 배경 | 원형 pill 배경 `rgba(108,110,247,0.25)` |
| 등록 버튼 | 인디고 그라디언트 | `linear-gradient(135deg, #6c6ef7, #9b7ff7)`, 50px 원형 |
| safe-area | padding | `paddingBottom: 'env(safe-area-inset-bottom)'` |

---

#### Claude.ai 프롬프트 — BottomNav (모바일)

```
[시스템 컨텍스트 — Header와 동일 토큰]

작업 요청:
Happiness 앱의 모바일 BottomNav 컴포넌트 (768px 미만)를 만들어주세요.

요구사항:
1. 위치: position fixed, bottom 12px, left/right 각 16px (풀 width 아님 — floating pill)
   zIndex: 190, borderRadius: 28px
2. Chrome Glass 스타일:
   background: rgba(14,14,26,0.96), blur: 48px, border: 1px solid rgba(255,255,255,0.08)
   boxShadow: 0 8px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06) inset
3. 내부 레이아웃: flexbox, 5개 탭 균등 배치, height 64px, paddingBottom env(safe-area-inset-bottom)
4. 탭 5개:
   - 탐색 (🔍, /explore)
   - 갤러리 (🖼, /gallery)
   - 등록 (➕) — 특별 처리
   - 목록 (📋, /list)
   - 프로필 (👤, /profile)
5. 일반 탭 아이템:
   - 이모지 (fontSize 20px) + 레이블 (fontSize 10px, C.textSub)
   - 비활성: C.textSub / 활성: C.primary + 이모지 아래 작은 인디고 점
   - 활성 탭: 이모지 배경 pill (borderRadius 12px, padding 4px 12px, rgba(108,110,247,0.20))
   - 탭 탭 시: scale(0.92)→scale(1) (SPRING 180ms)
6. 등록 버튼 (중앙):
   - 50px × 50px 원형, translateY(-8px)로 살짝 떠 있음
   - background: linear-gradient(135deg, #6c6ef7, #9b7ff7)
   - boxShadow: 0 4px 20px rgba(108,110,247,0.5), 0 1px 0 rgba(255,255,255,0.3) inset
   - 탭 시: scale(0.9)→scale(1.05) (SPRING 300ms)
7. 활성 상태: useLocation()으로 현재 경로 비교
```

---

### 3-5. GalleryPage

#### 레이아웃 구조

```
[AmbientBackground]
[페이지 — 전체 배경 #07070f]
  ├── Chrome Glass Sticky 툴바
  │     ├── "갤러리" 제목 + 사진 수
  │     ├── 정렬 Chip 그룹 (Thin → Tinted 활성)
  │     └── 뷰 전환 버튼 (그리드/리스트)
  └── 갤러리 그리드
        └── PhotoCard × N (Regular Glass hover 오버레이)
```

#### 소재 사용

| 요소 | 소재 | 특이사항 |
|------|------|----------|
| 페이지 배경 | `C.bg` 단색 | AmbientBackground가 깔려 있음 |
| 툴바 | Chrome Glass | sticky, 테두리 없음, 하단 구분선만 |
| 정렬 Chip 비활성 | Thin Glass | `borderRadius: 20px` |
| 정렬 Chip 활성 | Tinted Glass | 인디고 pill |
| 사진 카드 | 이미지 직접 (유리 없음) | hover 시 Regular Glass 오버레이 |
| 카드 호버 오버레이 | 그라디언트 | `linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)` |
| 무드 배지 | Thin Glass | 카드 상단 좌측 |
| 카드 hover 정보 | Chrome Glass 미니 패널 | 제목 + 좋아요 + 작가 |

#### 인터랙션

- 카드 마운트: `glassIn` staggered (각 카드 40ms 지연)
- 카드 호버: 오버레이 `opacity: 0→1` (EASE 200ms) + 이미지 `scale(1.03)` (EASE 400ms)
- 툴바 스크롤 고정 시: blur 강화

---

#### Claude.ai 프롬프트 — GalleryPage

```
[시스템 컨텍스트]
앱 이름: Happiness — Dark-First 프리미엄 갤러리
기술 스택: React 18, React Router v6, inline style only, 외부 라이브러리 없음

다크 토큰:
  bg: '#07070f' / text: '#f0f0ff' / textSub: '#8a8ab8' / textHint: '#4e4e7a'
  primary: '#6c6ef7' / accent: '#9b7ff7'
  divider: 'rgba(255,255,255,0.06)'

소재:
  Chrome: bg 'rgba(14,14,26,0.96)', blur 48px, border-bottom rgba(255,255,255,0.06)
  Thin:   bg 'rgba(255,255,255,0.05)', blur 16px, border rgba(255,255,255,0.06)
  Tinted: bg 'rgba(108,110,247,0.20)', blur 20px, border rgba(108,110,247,0.35)
  RegularHover: bg 'rgba(0,0,0,0.7)' 그라디언트 오버레이

@keyframes glassIn { from{opacity:0;transform:translateY(16px) scale(0.96)} to{opacity:1;transform:none} }
SPRING: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
EASE: 'cubic-bezier(0.4, 0, 0.2, 1)'

작업 요청:
Happiness 앱의 GalleryPage 컴포넌트를 만들어주세요.
(목 데이터로 사진 8장 렌더링)

요구사항:
1. 전체 배경: #07070f + 앰비언트 오브 3개 (fixed, AmbientBackground 인라인 구현)
2. Chrome Glass sticky 툴바 (zIndex 100, height 56px):
   - 좌: "갤러리" (fontSize 20, fontWeight 700, color white) + "(12)" 서브텍스트
   - 우: 정렬 chip들 + 뷰 전환
   - 정렬 chip: ['최신순', '인기순', '저장순'] — 비활성 Thin Glass, 활성 Tinted Glass
   - Chip 전환: scale + background 트랜지션 (SPRING 200ms)
3. CSS columns 마소닉 그리드 (padding 16px):
   - columns: 2 (모바일), 3 (768px), 4 (1200px)
   - gap: 12px
   - breakInside: avoid-column
4. PhotoCard (각 카드):
   - overflow hidden, borderRadius 12px, cursor pointer
   - position relative (hover 오버레이용)
   - 이미지: width 100%, display block
   - 등장: animation glassIn 0.4s EASE 0ms ~ 320ms (stagger 40ms 목 구현)
5. 카드 호버 오버레이 (position absolute, inset 0):
   - opacity 0 → 1 (EASE 200ms)
   - background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)
   - 이미지: transform scale(1→1.03) (EASE 400ms)
6. 오버레이 내 정보 (하단 absolute):
   - 사진 제목: fontSize 14, fontWeight 600, color white
   - 좋아요 수: "❤️ {n}" fontSize 12, color rgba(255,255,255,0.7)
7. 무드 배지 (카드 좌상단 12px):
   - Thin Glass pill, fontSize 11, color white
   - background: 무드별 색상 rgba + blur
8. 빈 상태: 중앙에 "📷 아직 사진이 없어요" + Regular Glass 카드
```

---

### 3-6. ExplorePage

#### 레이아웃 구조

```
[AmbientBackground]
[ExplorePage]
  ├── Chrome Glass sticky 검색/필터 바
  │     ├── Floating Glass Pill 검색창 (좌측)
  │     └── 무드 필터 Chip 스크롤 행 (우측 or 하단)
  └── 사진 그리드 (Regular Glass 카드 — 탐색은 카드 형)
        └── PhotoCard (이미지 + Regular Glass 정보 패널 하단)
```

#### 소재 사용

| 요소 | 소재 | 특이사항 |
|------|------|----------|
| 검색 pill | Regular Glass | `borderRadius: 28px`, 검색 아이콘 |
| 무드 chip 비활성 | Thin Glass | `borderRadius: 20px` |
| 무드 chip 활성 | 무드별 색상 glass | 무드 dot 색상의 15% 투명도 배경 |
| 사진 카드 | Regular Glass 하단 패널 | 이미지 위 Regular Glass overlay |
| 자동완성 드롭다운 | Thick Glass | `borderRadius: 16px` |

---

#### Claude.ai 프롬프트 — ExplorePage

```
[시스템 컨텍스트 — GalleryPage와 동일 토큰]

Regular Glass:
  bg: 'rgba(18,18,32,0.72)' / blur: 'blur(32px)' / border: rgba(255,255,255,0.08)
  glow: '0 1px 0 rgba(255,255,255,0.08) inset' / shadow: '0 4px 24px rgba(0,0,0,0.4)'

Thick Glass:
  bg: 'rgba(16,16,28,0.88)' / blur: 'blur(40px)' / border: rgba(255,255,255,0.10)

작업 요청:
Happiness 앱의 ExplorePage (탐색) 컴포넌트를 만들어주세요.

요구사항:
1. 배경: #07070f + AmbientBackground (인라인)
2. Chrome Glass sticky 검색/필터 바 (height 72px, padding 0 16px):
   a. Regular Glass Pill 검색창 (flex-grow, height 44px, borderRadius 28px):
      - 좌: "🔍" 아이콘 (color textHint)
      - 입력 투명 배경, color text, placeholder textHint
      - 포커스: border → rgba(108,110,247,0.5) + glow 3px
      - 우: 검색어 있을 때 "✕" 클리어 버튼
   b. 검색어 3글자 이상 시 Thick Glass 자동완성 드롭다운 (absolute, zIndex 300):
      - Regular Glass 아이템 hover (Thin Glass 배경)
3. 무드 필터 Chip 수평 스크롤 행 (height 44px, 툴바 하단):
   - scrollbar 숨김, 좌우 패딩 16px
   - Chip 목록: ['전체', '따뜻함', '에너지', '자연스러움', '시원함', '평온함', '로맨틱']
   - 비활성: Thin Glass / 활성: 무드 색상 기반 Tinted Glass (각 무드 색상 15% 배경)
   - Chip 높이 32px, borderRadius 20px, fontSize 12px
4. 사진 그리드 (2컬럼 모바일, 3컬럼 768px, padding 16px, gap 12px):
   - 카드: 이미지 + Regular Glass 정보 패널 (이미지 하단 오버레이)
   - 정보 패널: position absolute, bottom 0, left/right 0
     - background: Regular Glass / padding: 12px / borderRadius: 0 0 12px 12px
     - 사진 제목 (fontSize 13, bold) + 좋아요 + 작가 avatar+이름
   - 카드 호버: 이미지 scale(1.02) + 패널 translateY(0) (평상시 translateY(4px))
5. 검색 결과 없음: 중앙 Regular Glass 카드에 "🔍 검색 결과가 없습니다" + 서브텍스트
6. 스켈레톤 로딩: Thin Glass 카드 shimmer (background: linear-gradient(90deg, thin glass → slightly lighter → thin glass), animation shimmer 1.5s infinite)
```

---

### 3-7. FeedPage

#### 레이아웃 구조

```
[AmbientBackground]
[FeedPage]
  ├── Chrome Glass 헤더 (고정)
  └── 피드 스트림
        └── FeedCard × N
              ├── Regular Glass 작가 헤더 (아바타 + 이름 + 팔로우 버튼)
              ├── 사진 (full-width, borderRadius 0)
              └── Regular Glass 액션 바 (좋아요/저장/댓글/공유)
```

#### 소재 사용

| 요소 | 소재 | 특이사항 |
|------|------|----------|
| FeedCard 전체 | Regular Glass | `borderRadius: 16px`, `overflow: hidden` |
| 작가 헤더 | Regular Glass (불투명) | 카드 최상단 |
| 액션 바 | Regular Glass | 카드 최하단 |
| 팔로우 버튼 비팔 | Thin Glass | `borderRadius: 20px` |
| 팔로우 버튼 팔로잉 | Tinted Glass | `color: C.primary` |
| 좋아요 활성 | 텍스트 | `color: C.danger` |

---

#### Claude.ai 프롬프트 — FeedPage

```
[시스템 컨텍스트 — GalleryPage와 동일 토큰]
[Regular Glass 동일]

작업 요청:
Happiness 앱의 FeedPage 컴포넌트를 만들어주세요.

요구사항:
1. 배경: #07070f + AmbientBackground (인라인)
2. 상단 "피드" 타이틀 헤더 (Chrome Glass, height 56px):
   - "팔로우 피드" 텍스트 + 우측 "새로고침" 아이콘 버튼
3. 피드 스트림 (maxWidth 680px, margin auto, padding 16px, gap 16px):
   FeedCard 구조:
   a. Regular Glass 카드 컨테이너 (borderRadius 16px, overflow hidden):
      top glow: inset 0 1px 0 rgba(255,255,255,0.08)
   b. 작가 헤더 (padding 14px 16px, flexbox):
      - 아바타 (36px circle, border 1.5px rgba(255,255,255,0.15))
      - 작가명 (fontWeight 600, color text) + 업로드 시간 (fontSize 12, textSub)
      - 팔로우 버튼 (ml auto):
        비팔로잉: Thin Glass, "팔로우" 텍스트, color primary
        팔로잉: Tinted Glass, "팔로잉 ✓", color primary
        호버 전환: SPRING 200ms
   c. 사진 (width 100%, aspectRatio auto, objectFit cover, display block)
      - 최대 높이 600px
   d. 캡션 (padding 12px 16px, fontSize 14, color text, lineHeight 1.5):
      "#태그" 강조: color primary
   e. 액션 바 (padding 12px 16px, flexbox, gap 20px):
      - 좋아요 버튼: "🤍/{❤️}" + count — 비활성 textSub, 활성 danger
        탭 시: scale(1.3)→scale(1) (SPRING 300ms) + 숫자 fadeUp
      - 저장 버튼: "🔖" + count — 비활성 textSub, 활성 accent
      - 댓글 버튼: "💬" + count — textSub
      - 공유 버튼: "↗" — textSub, ml auto
   f. 좋아요 애니메이션: 탭 시 하트 파티클 3개 (absolute, fadeUp + scale 0→1.5→0)
4. 카드 등장: glassIn, 각 카드 80ms stagger
5. "더 보기" 버튼 (Regular Glass pill, 가운데 정렬)
6. 빈 피드: "아직 팔로우한 작가가 없어요" + "탐색하기" CTA 버튼
```

---

### 3-8. ListPage

#### 레이아웃 구조

```
[AmbientBackground]
[ListPage]
  ├── Chrome Glass 툴바 (정렬 + 검색)
  └── 목록 컨테이너
        └── ListRow × N
              Thin Glass → hover → Regular Glass
              [썸네일 56px] [제목+서브] [무드뱃지] [좋아요] [날짜]
```

#### 소재 사용

| 요소 | 소재 | 특이사항 |
|------|------|----------|
| 각 행 기본 | Thin Glass | `borderRadius: 12px` |
| 각 행 호버 | Regular Glass | 트랜지션 EASE 180ms + `translateX(4px)` |
| 행 활성(선택) | Tinted Glass | 인디고 테두리 |
| 썸네일 | 이미지 | `borderRadius: 8px` |
| 무드 배지 | 소형 Thin Glass pill | 무드 점 + 텍스트 |

---

#### Claude.ai 프롬프트 — ListPage

```
[시스템 컨텍스트 — GalleryPage와 동일 토큰]

작업 요청:
Happiness 앱의 ListPage (사진 목록 뷰) 컴포넌트를 만들어주세요.

요구사항:
1. 배경: #07070f + AmbientBackground (인라인)
2. Chrome Glass sticky 툴바 (height 56px):
   - "목록" 제목 + 우측 검색 아이콘 버튼 + 정렬 드롭다운
   - 검색 아이콘 클릭 시: 툴바 내 인라인 검색 입력 필드 슬라이드 확장
   - 정렬 드롭다운: Thick Glass 패널, borderRadius 12px, padding 8px
3. 목록 컨테이너 (maxWidth 800px, margin auto, padding 16px, gap 4px):
   ListRow 구조 (각 행):
   a. 기본 상태: Thin Glass (borderRadius 12px, padding 12px 16px)
      flexbox, alignItems center, gap 14px
   b. 호버: Regular Glass + translateX(4px) (EASE 180ms)
   c. 썸네일 (56px × 56px, borderRadius 8px, objectFit cover, flexShrink 0)
   d. 정보 영역 (flex 1):
      - 제목 (fontSize 15, fontWeight 600, color text, 1줄 말줄임)
      - 설명 (fontSize 12, textSub, 1줄 말줄임, marginTop 2px)
   e. 무드 배지 (Thin Glass pill, fontSize 11, padding 2px 8px):
      - 무드 색상 점(6px circle) + 텍스트
   f. 좋아요 수 (fontSize 12, textSub): "❤️ {n}"
   g. 날짜 (fontSize 11, textHint, minWidth 60px, textAlign right): "n일 전"
   h. 우측 화살표 "›" (color textHint)
4. 행 사이 구분: gap 4px (선 대신 간격만)
5. 목록 등장: fadeUp 스태거 (각 행 20ms 지연)
6. 빈 상태: "📋 사진이 없어요" Regular Glass 카드
7. 검색 필터링: 클라이언트 사이드 (제목+설명 포함 여부)
```

---

### 3-9. SeriesPage

#### 레이아웃 구조

```
[AmbientBackground]
[SeriesPage]
  ├── Chrome Glass 툴바 (제목 + 새 시리즈 버튼)
  └── 시리즈 그리드
        └── SeriesCard × N (Regular Glass)
              ├── 커버 이미지 그리드 (4분할 또는 단일)
              └── Regular Glass 정보 패널 (제목 + 사진 수 + 날짜)
```

---

#### Claude.ai 프롬프트 — SeriesPage

```
[시스템 컨텍스트 — GalleryPage와 동일 토큰]
[Regular Glass 동일]

작업 요청:
Happiness 앱의 SeriesPage (시리즈/컬렉션) 컴포넌트를 만들어주세요.

요구사항:
1. 배경: #07070f + AmbientBackground (인라인)
2. Chrome Glass sticky 툴바 (height 56px):
   - "시리즈" 제목 (fontWeight 700)
   - 우측 "+ 새 시리즈" 버튼 (Tinted Glass, borderRadius 20px, height 34px)
3. 시리즈 그리드 (padding 16px, gap 16px):
   - 모바일: 1컬럼 / 768px: 2컬럼 / 1200px: 3컬럼
   SeriesCard:
   a. Regular Glass 컨테이너 (borderRadius 16px, overflow hidden, cursor pointer)
   b. 커버 이미지 영역 (height 200px):
      - 사진 1장: 풀 커버
      - 사진 2~3장: 좌우 분할
      - 사진 4장+: 2×2 그리드
      - 각 분할 칸: 이미지 objectFit cover
      - 커버 전체에 어두운 그라디언트 오버레이: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)
   c. Regular Glass 정보 패널 (padding 14px 16px):
      - 시리즈 제목 (fontSize 16, fontWeight 700, color text)
      - "사진 {n}장" (fontSize 12, textSub)
      - 마지막 수정일 (fontSize 11, textHint)
   d. 카드 호버:
      - 이미지 scale(1.03) (EASE 300ms)
      - Regular Glass → 테두리 color rgba(108,110,247,0.30)
      - translateY(-2px) (SPRING 200ms)
   e. 우측 상단 "···" 메뉴 버튼 (hover 시 표시, Thin Glass pill)
4. 시리즈 상세 펼치기 (클릭 시):
   카드 아래로 슬라이드 확장 (max-height 0 → auto, EASE 300ms)
   3컬럼 미니 사진 그리드
5. 빈 상태: Regular Glass 카드에 "📚 아직 시리즈가 없어요" + "새 시리즈 만들기" CTA
6. 삭제/수정 확인 다이얼로그: Thick Glass 모달
```

---

### 3-10. ProfilePage

#### 레이아웃 구조

```
[AmbientBackground]
[ProfilePage]
  ├── 히어로 영역 (커버 이미지 or 다크 그라디언트, height 280px)
  │     ├── 아바타 (80px, 하단 중앙)
  │     ├── 팔로우/팔로잉 버튼 (타인 프로필)
  │     └── Thick Glass 스탯 바 (고정, 히어로 하단)
  │           팔로워 · 팔로잉 · 사진 수 · 좋아요 · 저장 · 공유
  └── Thick Glass 탭 컨테이너
        탭: 내 작품 · 저장함 · 시리즈 · 설정
        └── 탭 콘텐츠 (Regular Glass 카드들)
```

#### 소재 사용

| 요소 | 소재 | 특이사항 |
|------|------|----------|
| 히어로 영역 | 커버 이미지 / `linear-gradient(180deg, rgba(7,7,15,0) 0%, #07070f 100%)` | 하단 페이드 |
| 아바타 테두리 | Chrome Glass 테두리 | `border: 3px solid rgba(255,255,255,0.15)` |
| 스탯 바 | Thick Glass | `backdropFilter: blur(40px)`, `borderTop: rgba(255,255,255,0.06)` |
| 탭 바 | Chrome Glass | sticky |
| 활성 탭 | Tinted 언더라인 | 하단 2px 인디고 바 |
| 탭 콘텐츠 | Regular Glass 그리드 카드 | |
| 설정 폼 | Regular Glass 폼 섹션 | 각 섹션 별도 카드 |

---

#### Claude.ai 프롬프트 — ProfilePage

```
[시스템 컨텍스트 — GalleryPage와 동일 토큰]
[Thick Glass: bg 'rgba(16,16,28,0.88)', blur 'blur(40px)', border rgba(255,255,255,0.10)]
[Regular Glass: 동일]

작업 요청:
Happiness 앱의 ProfilePage 컴포넌트를 만들어주세요.

요구사항:
1. 배경: #07070f + AmbientBackground (인라인)
2. 히어로 영역 (height 280px, position relative, overflow hidden):
   - 커버 이미지 (objectFit cover) 또는 없을 때: linear-gradient(135deg, #0d0d24, #12122a)
   - 하단 페이드 오버레이: linear-gradient(to bottom, transparent 0%, #07070f 100%)
   - 좌하단: 아바타 (80px circle, border 3px solid rgba(255,255,255,0.15), objectFit cover)
   - 아바타 옆: 이름 (fontSize 22, fontWeight 700, color text) + "@profileName" (textSub)
   - 아바타 호버 시: 편집 오버레이 (반투명 검정 + "📷" 아이콘)
3. Thick Glass 스탯 바 (margin: 0 16px, borderRadius 16px, padding 16px 24px):
   - 6개 통계: 사진수 · 총좋아요 · 총저장 · 팔로워 · 팔로잉 · 문의수
   - 각 stat: 수치 (fontSize 20, fontWeight 700, color text) + 레이블 (fontSize 11, textHint)
   - 구분선: C.divider 수직 선
   - 팔로워/팔로잉 클릭: 모달 팝업 (Thick Glass 패널)
4. Chrome Glass 탭 바 (sticky, top: 60px, height 48px, zIndex 90):
   - 탭: ['내 작품', '저장함', '시리즈', '설정']
   - 비활성: color textSub / 활성: color text + 하단 2px 인디고 언더라인
   - 언더라인: 탭 이동 시 슬라이드 (EASE 200ms)
5. 탭 콘텐츠 (padding 16px):
   a. 내 작품: GalleryPage와 동일 그리드 (2~3컬럼, Regular Glass hover 오버레이)
   b. 저장함: 동일 그리드 (저장된 사진들)
   c. 시리즈: 시리즈 카드 2컬럼 그리드
   d. 설정: Regular Glass 폼 섹션들
      - "기본 정보" 카드: 이름, bio (textarea), websiteUrl, location 입력 (Thin Glass)
      - "전문 분야" 카드: 스페셜티 체크박스 그리드 (Thin Glass 각 항목)
      - "포트폴리오 레이아웃" 카드: PortfolioLayoutPicker (grid/magazine/slideshow 카드 3개)
        선택 카드: Tinted Glass + 인디고 테두리
      - "비밀번호 변경" 카드 (kakao 유저에겐 숨김)
      - "저장" 버튼 (Tinted Glass CTA, width 100%)
6. 타인 프로필 시: 스탯 바 우측에 "팔로우"/"팔로잉" 버튼 + "문의하기" 버튼
```

---

### 3-11. AdminLayout

#### 레이아웃 구조

```
[AmbientBackground]
[AdminLayout]
  ├── Thick Glass 사이드바 (왼쪽, width 240px, 고정)
  │     ├── 로고 + "관리자 패널" 레이블
  │     ├── 네비게이션 메뉴 (정렬/회원/사진/대시보드)
  │     │     비활성: Thin Glass 행 / 활성: Tinted Glass 행
  │     └── 하단: 앱으로 돌아가기
  ├── Chrome Glass 상단 바 (우측 전체, height 60px)
  │     ├── 현재 페이지 제목 (좌)
  │     └── 관리자 정보 (우)
  └── 콘텐츠 영역 (Regular Glass 카드들)
```

#### 소재 사용

| 요소 | 소재 | 특이사항 |
|------|------|----------|
| 사이드바 | Thick Glass | `position: fixed`, `width: 240px`, `height: 100vh` |
| 활성 메뉴 | Tinted Glass | `borderRadius: 10px`, 좌측 3px 인디고 바 |
| 상단 바 | Chrome Glass | 우측 `calc(100% - 240px)` 영역 |
| 콘텐츠 카드 | Regular Glass | padding `24px` |
| 위험 액션 버튼 | 다크 레드 glass | `rgba(255,77,109,0.20)` bg + 레드 border |

---

#### Claude.ai 프롬프트 — AdminLayout

```
[시스템 컨텍스트 — Header와 동일 토큰]
[Thick Glass: 동일 / Chrome Glass: 동일]

작업 요청:
Happiness 앱의 AdminLayout 컴포넌트를 만들어주세요.
children prop을 콘텐츠 영역에 렌더링합니다.

요구사항:
1. 배경: #07070f + AmbientBackground (인라인)
2. Thick Glass 사이드바 (position fixed, left 0, top 0, width 240px, height 100vh, zIndex 100):
   - 우측 border: 1px solid rgba(255,255,255,0.06)
   - 로고 영역 (height 64px, padding 0 20px): "✨ Happiness" + "ADMIN" 빨간 뱃지
   - 메뉴 섹션 (padding 8px):
     메뉴 항목: [{to:'/admin', icon:'📊', label:'대시보드'}, {to:'/admin/gallery-order', icon:'🖼', label:'갤러리 순서'}, {to:'/admin/members', icon:'👥', label:'회원 관리'}, {to:'/admin/photos', icon:'📷', label:'사진 관리'}]
     비활성 행 (borderRadius 10px, padding 10px 14px, color textSub):
       호버: Thin Glass + color text (EASE 180ms)
     활성 행: Tinted Glass + color primary + 좌측 3px rgba(108,110,247,1) 바
     각 항목: 아이콘 (fontSize 16) + 레이블 (fontSize 14, fontWeight 500)
   - 하단 (position absolute, bottom 20px, left 0, right 0, padding 0 8px):
     "← 앱으로 돌아가기" 버튼 (Thin Glass, 전체 너비)
3. Chrome Glass 상단 바 (position fixed, top 0, left 240px, right 0, height 60px, zIndex 90):
   - 현재 페이지 제목 (좌, fontSize 18, fontWeight 700)
   - 우: 관리자 이름 + 아바타 (32px circle)
4. 콘텐츠 영역 (marginLeft 240px, marginTop 60px, padding 24px):
   {children}
5. 모바일 (768px 미만):
   - 사이드바: 기본 숨김 (transform translateX(-100%))
   - 상단 바 left: 0 + 햄버거 버튼 (좌측)
   - 햄버거 클릭: 사이드바 슬라이드 인 + 오버레이 (rgba(0,0,0,0.7))
6. 위험 액션 가이드라인 (AdminLayout 내 전역 스타일):
   .btn-danger: background rgba(255,77,109,0.20), border rgba(255,77,109,0.50), color '#ff4d6d'
   호버: background rgba(255,77,109,0.30), shadow 0 0 0 3px rgba(255,77,109,0.20)
```

---

### 3-12. Toast 컴포넌트

#### 디자인

```
[position: fixed, top-right, zIndex 9999]
[ToastStack — gap 8px]
  └── ToastItem
        [Regular Dark Glass 카드]
        ├── 좌측 타입 바 (4px, 타입별 색상)
        ├── 아이콘 + 메시지
        └── 닫기 버튼
```

#### 소재 사용

| 타입 | 좌측 바 색상 | 아이콘 |
|------|------------|--------|
| success | `#34d399` (에메랄드) | "✓" |
| error | `#ff4d6d` (레드-핑크) | "✕" |
| warning | `#fbbf24` (앰버) | "⚠" |
| info | `#6c6ef7` (인디고) | "ℹ" |

---

#### Claude.ai 프롬프트 — Toast 컴포넌트

```
[시스템 컨텍스트 — Header와 동일 토큰]

작업 요청:
Happiness 앱의 Toast / ToastStack 컴포넌트를 만들어주세요.

요구사항:
1. ToastStack (position fixed, top 80px, right 16px, zIndex 9999):
   - gap 8px, flexDirection column, alignItems flex-end
   - 최대 3개 표시 (이미 3개면 오래된 것 먼저 제거)
2. ToastItem:
   - Regular Glass (bg rgba(18,18,32,0.92), blur 32px)
   - width 320px (모바일 calc(100vw - 32px))
   - borderRadius 12px, overflow hidden
   - boxShadow: 0 8px 32px rgba(0,0,0,0.5), glow inset
   - 등장: 오른쪽에서 슬라이드 인 (translateX(120%) → translateX(0), SPRING 320ms)
   - 퇴장: 오른쪽으로 슬라이드 아웃 + opacity 0 (EASE 200ms)
3. 좌측 타입 바 (width 4px, height 100%, position absolute, left 0):
   - success: '#34d399' / error: '#ff4d6d' / warning: '#fbbf24' / info: '#6c6ef7'
4. 내용 영역 (padding 14px 14px 14px 18px, flexbox, alignItems flex-start, gap 10px):
   - 아이콘 원 (24px, 타입별 색상 10% bg + 타입 색상 아이콘):
     success "✓" / error "✕" / warning "⚠" / info "ℹ"
   - 메시지 (flex 1, fontSize 14, color text, lineHeight 1.4)
   - 닫기 버튼 (18px, color textHint, hover → text, Thin Glass 원형)
5. 하단 진행 바 (height 2px, position absolute, bottom 0):
   - 타입 색상 배경
   - 지속 시간동안 width 100% → 0% (linear)
   - success/info: 4000ms / warning: 5000ms / error: 6000ms
6. props: { toasts: [{id, type, message}], onClose(id) }
7. 각 토astId로 key, 자동 닫힘 useEffect (지속 시간 후 onClose 호출)
```

---

## 4. 공통 컴포넌트 가이드

### 4-1. GlassButton 변형

```javascript
// 공통 버튼 스타일 헬퍼
function getButtonStyle(variant, size, disabled) {
  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #6c6ef7 0%, #9b7ff7 100%)',
      border: '1px solid rgba(108,110,247,0.4)',
      boxShadow: '0 4px 20px rgba(108,110,247,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
      color: '#fff',
    },
    secondary: {  // Thin Glass
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.10)',
      color: '#f0f0ff',
    },
    tinted: {  // Tinted Glass
      background: 'rgba(108,110,247,0.15)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(108,110,247,0.30)',
      color: '#6c6ef7',
    },
    danger: {  // 위험 액션
      background: 'rgba(255,77,109,0.15)',
      border: '1px solid rgba(255,77,109,0.40)',
      color: '#ff4d6d',
    },
  };

  const sizes = {
    sm:  { height: 32, padding: '0 12px', fontSize: 12, borderRadius: 8  },
    md:  { height: 40, padding: '0 18px', fontSize: 14, borderRadius: 10 },
    lg:  { height: 48, padding: '0 24px', fontSize: 15, borderRadius: 12 },
    xl:  { height: 56, padding: '0 32px', fontSize: 16, borderRadius: 14 },
    pill:{ height: 36, padding: '0 20px', fontSize: 13, borderRadius: 20 },
  };

  return {
    ...variants[variant],
    ...sizes[size],
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontWeight: 600,
    transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: variants[variant].border,
  };
}
```

### 4-2. GlassInput 스타일

```javascript
const inputBase = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  color: '#f0f0ff',
  fontSize: 14,
  padding: '10px 14px',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 180ms ease, box-shadow 180ms ease',
  // 플레이스홀더는 CSS로 처리 불가 → 조건부 렌더링으로 대체 텍스트 처리
};

// 포커스 상태 (onFocus/onBlur로 state 전환)
const inputFocused = {
  ...inputBase,
  borderColor: 'rgba(108,110,247,0.6)',
  boxShadow: '0 0 0 3px rgba(108,110,247,0.15)',
};

// 에러 상태
const inputError = {
  ...inputBase,
  borderColor: 'rgba(255,77,109,0.6)',
  boxShadow: '0 0 0 3px rgba(255,77,109,0.15)',
};
```

### 4-3. 글래스 모달 패턴

```javascript
// 모달 오버레이
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(8px)',
  zIndex: 500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// 모달 패널 (Thick Glass)
const modalStyle = {
  background: 'rgba(16,16,28,0.92)',
  backdropFilter: 'blur(40px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  boxShadow: '0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
  padding: '28px 32px',
  width: '90%',
  maxWidth: 480,
  animation: 'glassIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
};
```

### 4-4. 스켈레톤 로딩 패턴

```javascript
// shimmer 키프레임 필요
const skeletonCard = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease infinite',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.04)',
};
```

---

## 5. 구현 우선순위

### Phase A — 토큰 기반 교체 (1주)

| 작업 | 파일 | 설명 |
|------|------|------|
| 1 | `constants/darkColors.js` | C 토큰 신규 파일 |
| 2 | `constants/glass.js` | G 토큰 5레벨로 확장 |
| 3 | `App.js` | AmbientBackground 전역 삽입 + `background: #07070f` |
| 4 | `components/layout/Header.jsx` | Chrome Glass 전환 |
| 5 | `components/layout/BottomNav.jsx` | Floating Pill + Chrome Glass |
| 6 | `components/common/Toast.jsx` | Regular Glass + 타입 바 |

### Phase B — 페이지 전환 (2주)

| 순서 | 페이지 | 이유 |
|------|--------|------|
| 1 | LoginPage / SignUpPage | 진입점, 첫인상 |
| 2 | GalleryPage | 핵심 기능 |
| 3 | ExplorePage | 두 번째 핵심 |
| 4 | ProfilePage | 포트폴리오 연계 |
| 5 | FeedPage / ListPage / SeriesPage | 보조 기능 |
| 6 | AdminLayout + 어드민 페이지들 | 내부 도구 |

### Phase C — 마이크로 인터랙션 (1주)

- SPRING 애니메이션 전면 적용
- `glassIn` 스태거 등장
- 카드 호버 스케일 + 오버레이
- 버튼 햅틱 대체 효과 (scale bounce)

---

## 6. 기술 제약 & 해결책

### backdrop-filter 지원

```javascript
// 지원 안 되는 경우 폴백
const glassWithFallback = {
  background: 'rgba(18,18,32,0.72)',    // 기본
  backdropFilter: 'blur(32px)',          // 최신 브라우저
  WebkitBackdropFilter: 'blur(32px)',    // Safari
  // 폴백: 지원 안 될 경우 더 불투명한 배경
  // @supports not (backdrop-filter: blur(1px)) → 'rgba(10,10,20,0.95)'
};
```

### 성능

- `will-change: transform` — 애니메이션 요소에만 적용
- 오브 배경은 `pointer-events: none` + `will-change: transform`
- `blur()` 가 많은 레이어: 모바일에서 GPU 부하 주의
  - 모바일 600px 미만: `blur` 값을 50% 축소 (`blur(16px)` → `blur(8px)`)

### CSS 키프레임 삽입 방법

```javascript
// 각 컴포넌트 최상단에 단 한 번 삽입
useEffect(() => {
  if (!document.getElementById('glass-keyframes')) {
    const style = document.createElement('style');
    style.id = 'glass-keyframes';
    style.textContent = `
      @keyframes glassIn { ... }
      @keyframes orbFloat { ... }
      @keyframes shimmer { ... }
    `;
    document.head.appendChild(style);
  }
}, []);
```

---

## 7. 접근성 (WCAG 2.1 AA) 준수

| 요구사항 | 해결책 |
|---------|--------|
| 텍스트 대비 4.5:1 이상 | `C.text #f0f0ff` on `C.bg #07070f` → 대비 16.3:1 통과 |
| `C.textSub #8a8ab8` on `#07070f` | → 대비 5.2:1 통과 |
| `C.textHint #4e4e7a` on `#07070f` | → 대비 2.9:1 (비활성 플레이스홀더 전용 — 허용) |
| 포커스 표시 | 모든 인터랙티브 요소 `focusVisible` → 인디고 3px ring |
| 키보드 네비 | 탭 순서, `role="button"` div 금지 → 실제 `<button>` 사용 |
| 이미지 alt | 모든 `<img>`에 `alt={photo.title}` |
| 애니메이션 | `prefers-reduced-motion: reduce` → 모든 트랜지션 0ms |

```javascript
// prefers-reduced-motion 반응
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const transition = prefersReducedMotion ? 'none' : 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)';
```

---

## 8. 체크리스트 — 구현 완료 기준

각 페이지/컴포넌트 구현 시 아래를 모두 확인한다.

- [ ] `C.bg #07070f` 배경 적용 (또는 AmbientBackground 표시)
- [ ] 모든 카드/패널이 G 토큰 소재 사용 (고체 배경 금지)
- [ ] Chrome Glass 네비게이션 바 적용
- [ ] 스펙큘러 하이라이트 (`inset 0 1px 0 rgba(255,255,255,0.08)`) 존재
- [ ] 호버 SPRING 애니메이션 (SPRING 커브 사용)
- [ ] 등장 `glassIn` 애니메이션 적용
- [ ] 포커스 상태: 인디고 3px ring
- [ ] 모바일 blur 축소 (blur 값 50% 이하로)
- [ ] 빈 상태 UI (Regular Glass 카드)
- [ ] 스켈레톤 로딩 (shimmer)
- [ ] `npm run build` 성공

---

*이 문서는 Happiness 앱의 iOS 26 Liquid Glass 다크 리디자인 기준 문서입니다.  
모든 신규 컴포넌트는 이 문서의 토큰 시스템과 소재 계층을 따릅니다.*
