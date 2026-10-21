# DESIGN_PROMPT — 회원가입 입력란 검증 상태 (2026-10-21)

기획: `DESIGN_PROMPTS/planning/QA_signup-validation.md`

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

## 요청

회원가입 카드(최대 420px, 흰 카드 on #F2F4F6)의 입력란 상태 4종을 한 화면에 보여 주세요.

1. 기본: 회색 테두리 `#E5E8EB`, 아래 회색 힌트(`#8B95A1`, 11px).
2. 확인 중: 입력란 오른쪽 안쪽에 "확인 중…"(11px, 힌트색).
3. 오류: 테두리 `#F04452`, 아래 "⚠ 올바른 이메일 형식이 아닙니다." 11px danger. 입력에 `aria-invalid`, 문구에 `role="alert"`.
4. 확인됨: 아래 "✓ 사용 가능한 이메일입니다." 11px, 초록 글자 `#007A45`(흰 배경 대비 AA).

동작: 입력란을 벗어날 때 검사하고, 그 뒤에는 고치는 즉시 오류가 사라진다. 처음 입력하는 동안에는 오류를 먼저 띄우지 않는다.
포트폴리오 주소 힌트: "영문 소문자·숫자·하이픈 30자 이하 · 하이픈으로 시작·끝 불가".
전화번호는 입력하면서 `010-1234-5678`처럼 하이픈이 자동으로 들어간다.

모바일(RN 다크 화면 `#111417`/카드 `#1A1E22`)도 같은 4상태를 입력란 바로 아래 문구로 표시한다(Alert 대신).
