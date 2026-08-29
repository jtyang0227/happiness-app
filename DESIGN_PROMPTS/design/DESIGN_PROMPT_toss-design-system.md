# DESIGN_PROMPT — Toss 디자인 시스템 전환 (2026-08-29)

이전의 AKIRA Neo-Tokyo(레드 #E8121A + 시안 #22D3EE) 액센트와 Cosmos × Pinterest 다크
에디토리얼 방향을 전면 폐기하고, **토스(Toss)의 시각 언어**로 앱 전체를 재구성한다.
과거 방향 문서는 모두 `DESIGN_PROMPTS/deprecated/`로 이동했다.

## 핵심 원칙

1. **단일 브랜드 컬러** — Toss Blue(`#3182F6`) 하나만 브랜드 액센트로 쓴다. CTA, 활성
   탭/링크, 선택 상태에만 사용하고 배경을 칠하는 용도로 쓰지 않는다.
2. **플랫 서페이스** — 그림자는 중립 회색조(rgba(0,0,0,0.04~0.12))만 쓰고, 브랜드 컬러를
   tint한 glow shadow를 금지한다. `backdrop-filter: blur()`, 글래스모피즘, 그라디언트
   오브(aurora/bokeh) 장식을 쓰지 않는다.
3. **밝은 회색조 배경** — 앱 기본 배경은 `#F2F4F6`(연한 웜그레이), 카드/서페이스는
   `#ffffff`. 기존의 순수 블랙(`#090909`) 다크 퍼스트 배경을 폐기했다.
4. **의미 컬러는 브랜드와 분리** — success(`#00C471`)/danger(`#F04452`)/warning(`#FFB800`)는
   상태 전달 전용이며 브랜드 액센트가 아니다.
5. **다크 예외 영역** — 이미지 뷰어/에디터처럼 사진 감상이 목적인 화면은 계속 어둡게
   유지하되, 색상은 브랜드 색조(남색/보라 undertone) 없는 중립 웜그레이-블랙
   (`#111417` / `#1A1E22` / `#22262B`)으로 교체했다.
6. **장식 애니메이션 최소화** — RGB 글리치, aurora 배경, pulseGlow 등 old-era 모션 효과를
   제거했다. 남긴 것은 `spin`(로딩), `pulse`(스켈레톤), `fadeInUp`/`slideUp`(진입) 정도의
   실용적 모션뿐이다.

## 컬러 토큰

`frontend/src/constants/colors.js` (`COLORS` export) 참조. 주요 값:

```
primary        #3182F6   (Toss Blue)
primaryDark    #1B64DA
primaryLight   #E8F3FF
accent         #4E9FFF   (그라디언트 등 보조용, 단독 배경 금지)

bg             #F2F4F6
surface        #ffffff
surfaceDim     #F5F6F8
border         #E5E8EB

text           #191F28
textSecondary  #4E5968
textMuted      #8B95A1
textHint       #B0B8C1

danger         #F04452
success        #00C471
warning        #FFB800
```

모바일(`mobile/constants/colors.js`)도 동일 팔레트를 미러링한다.

## [시스템 컨텍스트] (Claude.ai 아티팩트 프롬프트용)

```
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

Toss 디자인 시스템 컬러:
  primary:       '#3182F6'
  primaryDark:   '#1B64DA'
  primaryLight:  '#E8F3FF'
  accent:        '#4E9FFF'
  bg:            '#F2F4F6'
  surface:       '#ffffff'
  surfaceDim:    '#F5F6F8'
  border:        '#E5E8EB'
  text:          '#191F28'
  textSecondary: '#4E5968'
  textMuted:     '#8B95A1'
  textHint:      '#B0B8C1'
  danger:        '#F04452'
  success:       '#00C471'
  warning:       '#FFB800'
  darkBg:        '#111417'   (이미지 뷰어/에디터 전용)
  darkSurface:   '#1A1E22'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- backdrop-filter/blur, 브랜드 컬러 tint된 그림자, 그라디언트 오브 장식 금지 — 플랫 서페이스만 사용
- 그림자는 중립 회색(rgba(0,0,0,0.04~0.12))만 사용
```

## 적용 범위

- `frontend/src/constants/colors.js`, `mobile/constants/colors.js` — 토큰 교체 완료
- `frontend/src/constants/glass.js` — 삭제 (글래스모피즘 시스템 전체 폐기)
- `frontend/src/components/common/AkiraLogo.jsx` → `Logo.jsx` — RGB 글리치 애니메이션 제거,
  정적 렌더링으로 교체
- `App.jsx`, `Header.jsx`, `AdminLayout.jsx`, `GalleryPage.jsx`, `ListPage.jsx`,
  `SeriesPage.jsx`, `LoginPage.jsx`, `SignUpPage.jsx` — glass 유틸/다크 아우라 배경 제거,
  플랫 Toss 서페이스로 교체
- 나머지 40여 개 파일의 raw AKIRA hex 리터럴(`#E8121A`/`#A80D14`/`#22D3EE` 등) → Toss 블루
  계열로 일괄 치환
- `frontend/src/styles/theme.css`, `global.css` — CSS 변수 토큰 및 전역 keyframes/스크롤바/
  포커스링/셀렉션 색상 교체, 다크 body 배경(`#090909`) → 밝은 배경(`#F2F4F6`)
