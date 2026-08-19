# 디자인 프롬프트 — 사진작가 포트폴리오 개성 강화

작성일: 2026-08-19
연관 기획서: `DESIGN_PROMPTS/planning/PLANNING_portfolio-strong-identity.md`
연관 컨셉: `DESIGN_PROMPTS/design/DESIGN_PROMPT_akira-neo-tokyo-concept.md` (AKIRA Neo-Tokyo 액센트)

---

## 무엇을, 왜

기본 포트폴리오 템플릿(`TemplateEditorial`)이 "범용 프로필 페이지"처럼 보인다는 문제를 해결한다.
새 화면을 만들지 않고 **기존 히어로를 강화**하고, **이미 만들어졌지만 어디에도 연결되지 않은
신뢰 신호 컴포넌트(추천사/언론·수상/클라이언트 로고)를 실제로 노출**시켜 설득력을 더한다.

## Claude.ai 아티팩트 프롬프트 (히어로 강화 컴포넌트 제작 시 사용)

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

디자인 컨셉: 사진작가 포트폴리오 히어로 — "강한 개성"
- 배경은 82vh 풀블리드 커버 사진 또는 다크 그라디언트(#0e0e0e 계열), 그 위에 텍스트
- 작가 이름 뒤에 대형 고스트 타이포(이니셜 1~2글자, 흰색 3~5% 불투명도, 120~220px)를 배경 레이어로 배치해
  매거진 커버 같은 깊이감을 만든다 — 절대 주 텍스트보다 진하게 칠하지 않는다
- 이름 옆/위에 원형 "시그니처 스탬프" 배지(지름 44~56px, 아키라 레드 #E8121A 테두리 또는 채움,
  살짝 회전 -8~-12deg, 내부에 이니셜 또는 ✦ 심볼) — 사진작가의 서명/도장처럼 기능
- 히어로 진입 시 이름/서브텍스트/버튼이 순차적으로 페이드+translateY(20px→0) 애니메이션으로 등장
- 레드(#E8121A)는 스탬프·CTA 버튼에만, 시안(#22D3EE)은 보조 버튼/글로우에만 — 배경을 칠하지 않음

현재 컬러 시스템 (AKIRA Neo-Tokyo 액센트):
  primary:       '#E8121A'
  primaryDark:   '#A80D14'
  accent:        '#22D3EE'
  darkBg:        '#0a0a18'
  galleryBg:     '#0e0e0e'
  text:          '#1a1a2e'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- prefers-reduced-motion 사용자를 위해 애니메이션은 CSS media query로 즉시 표시 처리
```

## 적용 대상 (지금 있는 기능 위에서 강화)

- `frontend/src/components/portfolio/templates/TemplateEditorial.jsx` — 히어로 섹션에 고스트 타이포 +
  시그니처 스탬프 + 등장 애니메이션 추가. 섹션 헤더·카드에 스크롤 리빌 적용.
- `frontend/src/components/portfolio/TestimonialsSection.jsx`, `PressAwardsSection.jsx`,
  `ClientLogoWall.jsx` — 신규 제작 아님, **이미 완성되어 있으나 미사용**이던 기존 컴포넌트를
  `TemplateEditorial`에 연결만 한다 (props: `testimonials`, `press`+`achievements`, `brands`).
- 데이터 로딩: `member.id`로 `testimonialApi.list` / `pressApi.list` / `brandApi.list` 호출
  (`frontend/src/services/portfolioApi.js`에 이미 구현됨).

## AC — `PLANNING_portfolio-strong-identity.md` 참조 (AC1~AC6)
