# 디자인 프롬프트 — 로고 교체 + AKIRA 모션 컨셉

작성일: 2026-08-23
연관 기획서: `DESIGN_PROMPTS/planning/PLANNING_akira-logo-motion.md`
연관 컨셉: `DESIGN_PROMPTS/design/DESIGN_PROMPT_akira-neo-tokyo-concept.md`

---

## 무엇을, 왜

AKIRA Neo-Tokyo 컨셉이 지금까지는 컬러 토큰 교체(레드+시안)에 머물렀다. 실제 로고 자산이 생긴 김에
로고를 실물 이미지로 교체하고, "정지된 색"이 아니라 "네온이 깜빡이는 도시"의 모션을 더한다 — 단,
레드가 화면을 지배하지 않는다는 원칙은 모션에도 동일하게 적용한다(포인트에만, 짧게, 반복 없이).

## Claude.ai 아티팩트 프롬프트 (로고/모션 컴포넌트 제작 시 사용)

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음) — 단, 브랜드 로고는 실제 이미지 자산 사용

디자인 컨셉: AKIRA 로고 진입 글리치 + 버튼 스피드라인
- 로고 이미지(<img src="/brand/logo-mark-white.png">)가 페이지 로드 시 0.4~0.6초 동안
  미세한 RGB 채널 분리(chromatic aberration, red/cyan 그림자 오프셋 2~3px)와 수평 스캔라인
  흔들림을 겪은 뒤 완전히 정착한다 — 반복 재생 금지(1회성), 무한 loop 금지
- 프라이머리 버튼(#E8121A 배경)에 hover 시 버튼 폭을 가로지르는 흰색 대각선 스피드라인이
  0.5초 동안 한 번 스쳐 지나간다 — 버튼 내부(overflow: hidden)로 제한, 버튼 밖으로 번지지 않음
- prefers-reduced-motion: reduce 환경에서는 두 효과 모두 애니메이션 없이 최종 상태로 즉시 표시

현재 컬러 시스템 (AKIRA Neo-Tokyo 액센트):
  primary:       '#E8121A'
  primaryDark:   '#A80D14'
  accent:        '#22D3EE'
  darkBg:        '#0a0a18'
  galleryBg:     '#0e0e0e'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용, keyframes는 <style> 태그 내 인라인 정의
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- 애니메이션은 요소 내부 범위로 한정 — 페이지 전체가 흔들리는 연출 금지
```

## 적용 대상

- `frontend/src/components/layout/Header.jsx` — 데스크탑 로고를 `logo-mark-white.png`로 교체 +
  로드 시 글리치 애니메이션.
- `frontend/src/pages/LoginPage.jsx`, `SignUpPage.jsx` — 히어로 아이콘을 동일 이미지로 교체 +
  글리치 애니메이션.
- `frontend/public/index.html` — favicon을 `logo-mark-black.png` 기반으로 교체.
- 프라이머리 버튼(로그인/회원가입 제출 버튼)에 스피드라인 hover 이펙트 추가.
- **건드리지 않는 것**: `Header.jsx`의 BottomNav 갤러리 탭 아이콘(`✦`)은 로고가 아니라 내비게이션
  아이콘이므로 그대로 둔다.

## AC — `PLANNING_akira-logo-motion.md` 참조 (AC1~AC8)
