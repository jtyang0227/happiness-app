# 디자인 프롬프트 — Cosmos 화이트 테마 전면 전환 (1차: 핵심 브라우징 화면)

작성일: 2026-08-23
참고: 사용자 제공 Cosmos 앱 스크린샷 (화이트 배경, Featured 탭)
연관: `DESIGN_PROMPTS/design/DESIGN_PROMPT_cosmos-board-and-nav.md`, `31_COSMOS_PINTEREST_DESIGN_SYSTEM.md`

---

## 결정 사항 (사용자 확인 완료)

- **범위**: 다크 퍼스트 원칙을 폐기하고 화이트 배경으로 전면 전환한다(사용자 명시적 확인).
- **하단 네비게이션**: 아이콘 5개 유지, 필(pill) 스타일은 이미 반영되어 있으므로 변경 없음 —
  색상만 라이트 테마에 맞게 조정한다.

## 왜 "1차"인가 — 전면 전환의 실제 범위

다크 퍼스트는 CLAUDE.md에 "Feature 31 — Cosmos 디자인 마이그레이션 구현 완료"로 명시된 광범위한
작업이었다(global.css, Header, GalleryPage, PhotoCard, ExplorePage, FeedPage, PhotoDetailPage,
PortfolioPage 템플릿 등 수십 개 파일). 단순 색상 토큰 1:1 교체(AKIRA 레드 작업 때처럼)가 아니라
**배경↔전경(텍스트) 극성 자체를 뒤집는 작업**이라 회귀 위험이 크다 — 흰 배경에 흰 텍스트가 남으면
그 자리는 완전히 안 보이게 된다. 따라서 한 번에 전체를 기계적으로 치환하지 않고, 화면 단위로 확인하며
순차 적용한다.

**1차 범위(이번 작업)** — 사용자가 보여준 참고 이미지와 가장 직접적으로 대응하는 핵심 브라우징 화면:
- `global.css` body 배경
- `Header.jsx` (PC 헤더 + 모바일 BottomNav)
- `GalleryPage.jsx`
- `ExplorePage.jsx`
- `PhotoCard.jsx`

**이번에 의도적으로 유지(다크)하는 것**:
- `LoginPage`/`SignUpPage` — 독립적인 다크 히어로 컨셉(글래스모피즘)으로 이미 CLAUDE.md에 명시된
  별도 예외 영역. 이번 요청은 "탐색/갤러리 같은 Cosmos 화면"을 겨냥한 것이라 로그인 화면까지 뒤집는
  것은 범위 밖으로 판단.
- `TemplateDarkRoom` — 템플릿 이름 자체가 "다크룸"이며 사진작가가 명시적으로 선택하는 다크 전용
  템플릿이므로 라이트 전환 대상이 아니다.
- `TemplateScrl` — 전체화면 몰입형 슬라이드쇼(검정 배경이 사진 감상에 필수적인 lightbox 성격).
- `SeriesPage`, Admin 패널 — 이미 라이트 테마이므로 변경 불필요.
- `PortfolioPage`(TemplateEditorial 기본 템플릿), `FeedPage`, `PhotoDetailPage` — 2차 작업으로 이연.

## 컬러 매핑

```
배경(다크 #090909/#0e0e0e/#0a0a18) → COLORS.bg '#f5f5fa' 또는 surface '#ffffff'
카드/서페이스(#12122a 등)          → COLORS.surface '#ffffff'
테두리(rgba(255,255,255,0.0x))     → COLORS.border '#e2e2ee'
본문 텍스트(#fff/rgba(255,255,255,X)) → COLORS.text '#1a1a2e'
보조 텍스트(rgba(255,255,255,0.4~0.6)) → COLORS.textSecondary '#5c5c7a' / textMuted '#9090b0'
액센트(레드/시안)                   → 변경 없음(AKIRA 유지, 배경 반전과 무관)
```

## AC (수용 기준)

- **AC1**: `global.css`/`Header.jsx`/`GalleryPage.jsx`/`ExplorePage.jsx`/`PhotoCard.jsx`가 화이트
  배경 + 다크 텍스트로 전환되고, 모든 텍스트가 배경 대비 WCAG AA 이상을 만족한다(흰 텍스트 잔존 없음).
- **AC2**: 레드/시안 액센트 사용 비율과 위치는 그대로 유지된다(배경 반전과 액센트 로직은 독립적).
- **AC3**: `npm run build` 성공.
- **AC4**: 실제 브라우저에서 갤러리/탐색 화면을 스크린샷으로 확인해 텍스트 가독성과 레이아웃 정상
  여부를 검증한다.
- **AC5**: 의도적으로 유지한 다크 영역(로그인/회원가입/DarkRoom/Scrl)은 변경되지 않는다.
