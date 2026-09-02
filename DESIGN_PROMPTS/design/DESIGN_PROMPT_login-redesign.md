# DESIGN_PROMPT — 로그인 페이지 전면 재설계
> Feature: LoginPage Redesign | 2026-09-02 | Toss 디자인 시스템 × 스플릿 레이아웃

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

## 디자인 컨셉

**이전 레이아웃**: 밝은 회색 배경 위 중앙 정렬 단일 카드
**새 레이아웃**: 좌/우 스플릿 패널

- 왼쪽 46% — 브랜드·비주얼 패널 (어두운 갤러리 배경, COLORS.darkBg)
  - 사진 포트폴리오 앱의 감성을 전달하는 추상 "포토 프레임" 모자이크 장식
  - 브랜드 로고, 앱 이름, 태그라인
- 오른쪽 54% — 폼 패널 (흰 배경, COLORS.surface)
  - 로그인 폼: 이메일 + 비밀번호 + 로그인 버튼
  - 나중에 소셜 로그인 버튼이 들어올 자리 (현재 JSX 주석)
  - 회원가입 링크

---

## 화면 와이어프레임

### 데스크탑 (>= 768px)

```
┌──────────────────────────┬──────────────────────────────┐
│                          │                              │
│  [포토 프레임 모자이크]   │                              │
│  ┌──────┐ ┌──────┐       │   로그인                     │
│  │      │ │      │       │   계속하려면 로그인해주세요.  │
│  │  A   │ │  B   │       │                              │
│  │      │ └──────┘       │   이메일                     │
│  │      │ ┌──────┐       │   ┌──────────────────────┐   │
│  └──────┘ │  C   │       │   │ your@email.com       │   │
│           └──────┘       │   └──────────────────────┘   │
│  ————                    │   비밀번호                    │
│  [로고] Happiness         │   ┌──────────────────────┐   │
│  사진으로 말하는          │   │ ••••••••             │   │
│  포트폴리오.              │   └──────────────────────┘   │
│  당신의 작품을            │                              │
│  세상과 나누세요.         │   ┌──────────────────────┐   │
│                          │   │      로그인           │   │
│                          │   └──────────────────────┘   │
│                          │                              │
│                          │   계정이 없으신가요? 회원가입  │
└──────────────────────────┴──────────────────────────────┘
```

### 모바일 (< 768px)

```
┌──────────────────────────────┐
│  [로고] Happiness            │  ← 다크 헤더 (compact)
├──────────────────────────────┤
│                              │
│  로그인                      │
│  계속하려면 로그인해주세요.   │
│                              │
│  이메일                      │
│  ┌────────────────────────┐  │
│  │ your@email.com         │  │
│  └────────────────────────┘  │
│  비밀번호                    │
│  ┌────────────────────────┐  │
│  │ ••••••••               │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │        로그인          │  │
│  └────────────────────────┘  │
│                              │
│  계정이 없으신가요? 회원가입  │
└──────────────────────────────┘
```

---

## 컴포넌트 스펙

### 브랜드 패널 (왼쪽)
- 배경: `COLORS.darkBg` (#111417)
- 포토 프레임 모자이크:
  - 3개의 절대 위치 사각형 (실제 사진 없이 CSS 직사각형으로 표현)
  - A (왼쪽 tall): `COLORS.darkSurface`, borderRadius 10, border `COLORS.darkBorder`
  - B (오른쪽 상단): `COLORS.darkElevated`, borderRadius 10
  - C (오른쪽 하단): `COLORS.darkSurface`, borderRadius 10
  - Primary 액센트 라인: `COLORS.primary`, height 3, width 40%
- 브랜드 텍스트:
  - 앱 이름 "Happiness": 28px, fontWeight 800, color `COLORS.darkText`
  - 태그라인: 14px, fontWeight 400, color `COLORS.darkTextSub`, lineHeight 1.65

### 폼 패널 (오른쪽)
- 배경: `COLORS.surface` (#ffffff)
- 폼 컨테이너: maxWidth 380, fadeUp 애니메이션
- h2 "로그인": 26px, fontWeight 800, color `COLORS.text`
- 부제목: 14px, color `COLORS.textMuted`
- 에러 배너: `COLORS.dangerTonal` bg, `COLORS.danger` border + text, borderRadius 10
- 입력 필드:
  - padding: 13px 16px, borderRadius 12, boxSizing border-box
  - 배경: `COLORS.surfaceDim`
  - 기본 border: `COLORS.border`
  - 에러 border: `COLORS.danger`
  - focus: border `COLORS.primary`, box-shadow 0 0 0 3px `COLORS.primaryLight`
- 로그인 버튼: 전체 너비, padding 14px, borderRadius 14, `COLORS.primary`
  - hover: `COLORS.primaryDark`
  - disabled: `COLORS.textHint`
- 회원가입 링크: `COLORS.primary`, fontWeight 700

### 레이블
- fontSize: 12px, fontWeight 600, color `COLORS.textSecondary`, letterSpacing 0.04em

---

## 상태 정의

| 상태 | 처리 |
|------|------|
| 로딩 중 | 버튼 비활성화 + "로그인 중..." 텍스트 + `COLORS.textHint` 배경 |
| 필드 에러 | 필드 아래 빨간 오류 메시지, 테두리 danger 색 |
| API 에러 | 폼 상단 에러 배너 |
| 정상 | 로그인 성공 → navigate('/') |

---

## 반응형

- **데스크탑 (>= 768px)**: 좌우 스플릿 (46% 브랜드 / 54% 폼)
- **모바일 (< 768px)**:
  - `flex-direction: column`으로 스택
  - 브랜드 패널 → compact 헤더 (높이 auto, 로고 + 앱 이름만 표시, 모자이크·태그라인 숨김)
  - 폼 패널 → 전체 너비, 상단 정렬

---

## 보존해야 하는 기능 로직

- `useAuth().login(email, password)` 호출, 성공 시 `navigate('/')`
- 이메일 정규식 + 빈 값 클라이언트 검증
- `apiErr` 배너 (로그인 실패 메시지)
- `loading` 상태 (버튼 비활성화)
- 하단 회원가입 링크 (React Router `Link`)
- 소셜 로그인 코드: JSX 주석 유지 (OAuth 키 발급 전까지 비활성화)
  - `Divider`, `SocialBtn` 서브 컴포넌트는 주석 안에 그대로 보존

---

## 클로드 구현 프롬프트 (claude.ai 아티팩트용)

```
Happiness 포트폴리오 사진 갤러리 앱의 로그인 페이지를 좌/우 스플릿 레이아웃으로 새로 디자인해줘.

[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용

컬러 시스템 (Toss 디자인 시스템):
  primary: '#3182F6', primaryDark: '#1B64DA', primaryLight: '#E8F3FF'
  bg: '#F2F4F6', surface: '#ffffff', surfaceDim: '#F5F6F8'
  border: '#E5E8EB', text: '#191F28', textSecondary: '#4E5968'
  textMuted: '#8B95A1', textHint: '#B0B8C1'
  danger: '#F04452', dangerTonal: '#FFEEEF'
  darkBg: '#111417', darkSurface: '#1A1E22', darkElevated: '#22262B'
  darkBorder: '#2E3338', darkText: '#F2F4F6', darkTextSub: '#8B95A1'

레이아웃:
- 왼쪽 46%: 다크 브랜드 패널 (darkBg 배경)
  - 포토 프레임 모자이크: 절대 위치 3개 직사각형(darkSurface/darkElevated) + primary 액센트 라인
  - 하단: 로고 + "Happiness" 타이틀 + 태그라인
- 오른쪽 54%: 흰 폼 패널 (surface 배경)
  - 로그인 폼 (이메일 + 비밀번호 + 버튼)
  - 회원가입 링크

모바일 (<768px): flex-direction column, 브랜드 패널은 compact 헤더로 변환

규칙:
- export default 함수형 컴포넌트 1개
- style은 inline object, <style> 태그로 미디어쿼리 처리
- 외부 라이브러리 import 없음
- 한국어 UI, 플랫 서페이스만 사용 (blur/gradient/glow 금지)
- 그림자는 중립 회색만 사용
```
