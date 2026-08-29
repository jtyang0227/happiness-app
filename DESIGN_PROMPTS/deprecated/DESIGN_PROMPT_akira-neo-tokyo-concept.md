# 디자인 프롬프트 — AKIRA Neo-Tokyo 액센트 컨셉

작성일: 2026-08-18
연관 기획서: `DESIGN_PROMPTS/planning/PLANNING_akira-neo-tokyo-concept.md`

---

## 개정 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| v1 (기존) | 2026-06-23 | Cosmos × Pinterest 다크 에디토리얼 — 브랜드 액센트: 인디고(`#5b6ef5`) + 라벤더(`#a78bfa`) |
| v2 (본 문서) | 2026-08-18 | **AKIRA Neo-Tokyo 액센트** — 브랜드 액센트: 아키라 레드(`#E8121A`) + 네온 시안(`#22D3EE`). 레이아웃/배경/타이포는 v1 그대로 유지, **컬러 토큰만 진화** |

## 왜 바꿨나 — 디자인 판단 근거

| 항목 | v1 (인디고) | v2 (아키라 레드+시안) |
|------|------------|----------------------|
| 브랜드 인상 | 무난한 SaaS 톤, 튀지 않음 | 강렬하고 개성 있는 시네마틱 톤 |
| 참조 소스 | 범용 다크 UI 트렌드 | 아키라(1988) 네오도쿄 — 가네다의 레드 바이크/재킷 vs 도시의 네온 블루 |
| 레드 사용 비율 | 없음 | **CTA·활성 탭·배지·좋아요 등 기존 primary 사용처에 한정** (배경/본문은 불변) |
| 보색 대비 | 인디고+라벤더 (유사색) | 레드+시안 (보색에 가까운 강한 대비 — "전부 빨강"이 되지 않도록 시안이 균형을 잡음) |
| 배경 | `#090909` 블랙 유지 | `#090909` 블랙 유지 (변경 없음) |

**핵심 원칙**: 레드는 화면의 지배색이 아니라 "포인트"다. 아키라 필름 자체도 대부분 어둡고 절제된
네오도쿄 야경이며, 레드는 소수의 강렬한 순간(바이크, 캡슐, 경고등)에만 등장한다. 이 비율을 그대로
디자인 토큰에 옮긴다 — `bg`/`surface`/`text`/`border`는 전혀 건드리지 않고, `primary`/`accent` 토큰만
교체해 기존에 인디고가 쓰이던 정확히 그 자리(버튼, 링크, 활성 상태, 배지)에서만 레드가 보이게 한다.

## 신규 컬러 팔레트

```
primary (구 인디고 → 아키라 레드): '#E8121A'
primaryDark  (hover/pressed):      '#A80D14'
primaryLight (연한 배경 틴트):      '#ffe9e7'
primaryTonal (중간 배경 틴트):      '#ffd2cd'
accent (구 라벤더 → 네온 시안):     '#22D3EE'

변경 없음:
bg / surface / border / text / darkBg / galleryBg / danger / success / warning
```

## Claude.ai 아티팩트 프롬프트 (신규 컴포넌트 제작 시 사용)

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

디자인 컨셉: AKIRA Neo-Tokyo 액센트
- 배경은 항상 순수 블랙(#090909) 또는 화이트(#ffffff) — 절대 레드로 채우지 않는다
- 레드(#E8121A)는 버튼/CTA, 활성 탭 인디케이터, 배지, 좋아요·저장 등 "선택된" 상태에만 사용
- 네온 시안(#22D3EE)은 레드와 짝을 이루는 보조 하이라이트(호버, 보조 배지, 차트 강조색)로 사용해
  레드 단독으로 화면이 무거워지지 않도록 균형을 잡는다
- 화면의 80% 이상은 여전히 블랙/화이트/그레이여야 한다 — 레드+시안 합산 사용 면적은 시각적으로 10~15%를 넘지 않게 배치

현재 컬러 시스템:
  primary:       '#E8121A'
  primaryDark:   '#A80D14'
  primaryLight:  '#ffe9e7'
  primaryTonal:  '#ffd2cd'
  accent:        '#22D3EE'
  bg:            '#f5f5fa'
  surface:       '#ffffff'
  border:        '#e2e2ee'
  text:          '#1a1a2e'
  textSecondary: '#5c5c7a'
  textMuted:     '#9090b0'
  danger:        '#e53e3e'
  darkBg:        '#0a0a18'
  darkSurface:   '#12122a'
  galleryBg:     '#0e0e0e'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- 레드를 배경 전체에 칠하는 디자인은 금지 — 반드시 블랙/화이트 배경 위의 포인트 컬러로만 사용
```

## 적용 대상

토큰 레벨 교체이므로 `COLORS.primary`/`COLORS.accent`를 참조하는 전체 컴포넌트(45개 파일)와,
토큰을 거치지 않고 hex를 직접 하드코딩한 컴포넌트(44개 파일) 모두에 반영된다. 대표적으로:

- 버튼/CTA: 로그인·회원가입·문의·예약·업로드 등 모든 primary 버튼
- 활성 상태: `GenreTabBar` 활성 탭, `Header`/`BottomNav` 활성 아이콘, 어드민 사이드바 활성 메뉴
- 배지/카운트: 문의함·약속 미읽음 배지, 장르 배지 primary variant
- 카드 인터랙션: `PhotoCard` 좋아요/저장 활성 아이콘, 매거진 뷰어 액센트
- 차트: `LineChart`/`DonutChart`/`AnalyticsDashboard`의 primary 계열 시리즈

배경/텍스트/테두리(`bg`, `surface`, `text`, `border`, `darkBg`, `galleryBg`)는 변경 대상이 아니다.

## AC (수용 기준) — 실제 검증 항목

- AC1~AC8: `PLANNING_akira-neo-tokyo-concept.md` 참조
- **AC9 (본 문서 고유)**: 실제 브라우저에서 로그인/갤러리/탐색 페이지를 열어 레드+시안 사용 면적이
  화면을 지배하지 않고 포인트로만 보이는지 스크린샷으로 확인한다.
