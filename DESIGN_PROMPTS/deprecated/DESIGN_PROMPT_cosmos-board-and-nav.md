# 디자인 프롬프트 — Cosmos 참고 UI 반영 (보드 카드 콜라주 + 플로팅 필 네비)

작성일: 2026-08-23
참고: 사용자 제공 Cosmos 앱 스크린샷 (Featured 탭)
연관: `DESIGN_PROMPTS/design/31_COSMOS_PINTEREST_DESIGN_SYSTEM.md`

---

## 무엇을, 왜

사용자가 Cosmos 앱 스크린샷을 제시하며 "이런 분위기로 세련되게" 반영을 요청했다. CLAUDE.md의
"Cosmos 앱 분석" 섹션에는 이미 "보드 카드: 3이미지 콜라주 + 메타(verified 배지, element 수)"가
목표로 적혀 있었지만 실제로는 구현되지 않았고(시리즈 카드가 단일 커버 이미지), 하단 네비게이션도
Cosmos의 떠 있는 필(pill) 캡슐 형태가 아니라 화면 폭 전체를 차지하는 바(bar) 형태였다 —
이 두 지점의 격차를 좁힌다.

## 반영 대상 1 — 시리즈 보드 카드 (3이미지 콜라주)

- 시리즈에 사진이 3장 이상이면 커버 영역을 좌측 큰 이미지 1장 + 우측 상하 작은 이미지 2장으로
  분할한 콜라주로 표시한다(Cosmos의 "Deserts, another planet" 카드와 동일한 3분할 비율).
- 사진이 1~2장뿐이면 콜라주 대신 단일/2분할로 자연스럽게 축소(빈 칸을 만들지 않음).
- 카드 하단 메타: 제목(bold) + `@profileName` + `N elements`(사진 수) — Cosmos의 "verified" 체크
  배지는 우리 데이터 모델에 실존하지 않는 개념이므로 **추가하지 않는다**(있지도 않은 인증을 있는 것처럼
  보여주는 것은 오해를 유발하므로 제외).

## 반영 대상 2 — 하단 네비게이션을 플로팅 필(pill) 캡슐로

- 기존: 화면 폭 전체를 차지하는 반투명 다크 바(borderRadius 0).
- 변경: 좌우 여백을 두고 하단에 살짝 띄운(margin) 캡슐형 pill 컨테이너(borderRadius 999px)로,
  은은한 그림자와 블러를 유지한 채 좀 더 프리미엄한 느낌을 준다. 중앙의 "등록" 버튼(원형, 레드+시안
  그라디언트)은 그대로 유지한다.

## Claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

디자인 컨셉: Cosmos 스타일 보드 카드 + 플로팅 필 네비게이션
- 보드 카드: 좌측 60% 큰 이미지 + 우측 40%를 상하 2분할한 작은 이미지 2장, 4px 간격, border-radius 12px
- 카드 하단: 제목(14px bold) + @handle(12px, muted) + "N elements"(12px, muted)
- 하단 네비: 화면 하단에서 12px 띄운 캡슐(pill) 컨테이너, border-radius 999px, 배경
  rgba(20,20,20,0.85) + blur(20px), 중앙 원형 CTA 버튼은 레드→시안 그라디언트 유지

현재 컬러 시스템 (AKIRA Neo-Tokyo 액센트):
  primary: '#E8121A', accent: '#22D3EE', galleryBg: '#0e0e0e'

규칙:
- export default 함수형 컴포넌트 1개만 반환, inline style만 사용
- 외부 라이브러리 import 없음, 한국어 UI 텍스트
- 실제 존재하지 않는 신뢰 배지(verified 등)를 임의로 추가하지 않는다
```

## 적용 대상

- 백엔드: `SeriesResponse`에 `previewPhotos`(최대 3개 썸네일 URL) 필드 추가, `SeriesController.getSeries()`와
  `PortfolioController`의 시리즈 매핑 로직에서 이미 조회 중인 `SeriesPhoto` 목록에서 최대 3개를 매핑
  — 신규 쿼리 없이 기존 데이터 재사용.
- 프론트: 콜라주 렌더링은 다크 테마(`TemplateEditorial.jsx`의 `SeriesScrollCard`)와 라이트 테마
  (`SeriesPage.jsx`의 `SeriesCard`, 시리즈 관리 화면)에서 각각의 기존 카드 스타일에 맞춰 인라인으로
  구현한다 — 두 화면의 테마가 달라(다크/라이트) 공용 컴포넌트로 억지로 묶지 않는다.
- `frontend/src/components/layout/Header.jsx`의 `BottomNav` — 플로팅 필 캡슐로 레이아웃 변경.
