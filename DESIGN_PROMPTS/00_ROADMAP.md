# Happiness — 디자인 작업 로드맵

최초 작성: 2026-06-19 | 마지막 업데이트: 2026-06-23

---

## 🆕 디자인 방향 전환 (2026-06-23)

> iOS 26 Liquid Glass → **Cosmos × Pinterest 다크 에디토리얼** 방향으로 전환  
> - 21/22/23번 파일: DEPRECATED (어드민/인증 페이지에서만 glass.js 계속 사용)  
> - 신규: `31_COSMOS_PINTEREST_DESIGN_SYSTEM.md` — 전체 앱 Cosmos 스타일 기획서  
> - 신규: `DESIGN_PROMPT_COSMOS_GALLERY.md` — Cosmos 스타일 Claude 디자인 프롬프트 5종  
> - 에디터 UI 개선: CurveEditor·EditorShell·ImageAdjustmentPanel 프리미엄 업그레이드 완료

---

## 파일 구성 (전체 32개)

| 파일 | 포함 작업 | 상태 |
|------|----------|------|
| `01_FOUNDATION.md` | Button · Input · EmptyState · Skeleton (공통 컴포넌트) | 진행 중 |
| `02_GALLERY_EXPLORE.md` | 갤러리 뷰토글/정렬 · 탐색 필터 전체(비율/태그/자동완성) · 무한스크롤 | 진행 중 |
| `03_NAVIGATION_UX.md` | Header 7-item 재설계(문의 배지 포함) · Modal UX · 접근성 | 진행 중 |
| `04_PHOTO_FORM.md` | PhotoForm 레이아웃 · 워터마크 · 비율선택 · AI태그 · Before/After · 드래프트 | 진행 중 |
| `05_PROFILE_SOCIAL.md` | 프로필 4탭 · 커버업로드 · 6종통계 · 계정삭제 · 댓글 · 팔로우모달 | ✅ 대부분 구현됨 |
| `06_SERIES_INQUIRY.md` | SeriesPage · InquiryFormPage · InquiryInboxPage 전체 UX | ✅ 구현됨 |
| `07_FEED_SORT.md` | FeedPage 개선 · ~~PhotoSortPage~~ (폐기 → 어드민 이관) | ✅ FeedPage 구현됨 |
| `08_COLOR_PALETTE_DETAIL.md` | 5색 팔레트 추출 · PhotoDetail 강화 (네비게이션/전체화면/관련사진/공유/인쇄) | ✅ 구현됨 |
| `09_PORTFOLIO_BUILDER.md` | 슬라이드쇼 뷰어 · 매거진 레이아웃 · PDF 내보내기 · 임베드 코드 | ✅ 구현됨 |
| `10_ADMIN_PANEL.md` | 어드민 패널 MVP 기획 — 갤러리 순서 관리 · 회원 관리 · 대시보드 | ✅ 구현됨 |
| `11_IMAGE_EDITOR.md` | 프로덕션 이미지 에디터 SPA — 업로드·Transform·색상보정·필터·오버레이·Export | ✅ 구현됨 |
| `11_PORTFOLIO_REDESIGN.md` | 포트폴리오 페이지 전면 재설계 (lisamicheleburns.com 참조) | ✅ 구현됨 |
| `12_PHOTO_DETAIL_ENHANCED.md` | PhotoDetailPage 강화 레이아웃 명세 · useColorExtraction · 구성 요소 목록 | ✅ 구현됨 |
| `12_SIDE_EFFECT_REVIEW.md` | 이미지 에디터 SPA 사이드 이펙트 검증 리포트 (검토 문서) | ✅ 검토 완료 |
| `13_ADMIN_PANEL.md` | Admin Panel MVP 구현 요약 · 레이아웃 명세 · 보안 가이드 | ✅ 구현됨 |
| `13_IMAGE_EDITOR_DESIGN.md` | 이미지 에디터 UI 디자인 시스템 (다크 테마 · 패널 명세) | ✅ 참조됨 |
| `14_PORTFOLIO_LAYOUT_PICKER.md` | 포트폴리오 레이아웃 피커 (grid/magazine/slideshow 3종) | ✅ 구현됨 |
| `15_PORTFOLIO_SLIDESHOW_FULL.md` | 포트폴리오 슬라이드쇼 전체 구현 명세 | ✅ 구현됨 |
| `16_ADMIN_PANEL_COMPLETE.md` | 어드민 패널 완전 구현 가이드 (4개 페이지 상세) | ✅ 구현됨 |
| `17_PHOTO_TEXT_FONT_EXTENSION.md` | 이미지 에디터 폰트 라이브러리(30+) · 크롭 비율(7종) · 프레임 프리셋 | 진행 중 |
| `18_FEATURE_ENHANCEMENT_V2.md` | 기능 고도화 로드맵 V2 — 8가지 차별화 아이디어 (클라이언트 납품 포털 등) | 기획 완료 |
| `19_PORTFOLIO_META_SEO.md` | 포트폴리오 메타 · Open Graph · Schema.org · 사이트맵 · 서버 SSR | 기획 완료 |
| `20_PHOTO_FORM_DETAIL_GALLERY_V2.md` | PhotoForm 스튜디오 레이아웃 V2 · 갤러리 4종 뷰 모드 · 멀티 선택 | 기획 완료 |
| `21_IOS26_LIQUID_GLASS_DESIGN.md` | ~~iOS 26 Liquid Glass 기초~~ **[DEPRECATED → 31번으로 대체]** | 폐기됨 |
| `22_IOS26_LIQUID_GLASS_REDESIGN.md` | ~~iOS 26 Liquid Glass 재설계 바이블~~ **[DEPRECATED → 31번으로 대체]** | 폐기됨 |
| `23_IOS26_LIQUID_GLASS_V2.md` | ~~iOS 26 Liquid Glass V2~~ **[DEPRECATED → 31번으로 대체]** | 폐기됨 |
| `24_PHOTO_SORT_ALGORITHM_REDESIGN.md` | 사진 정렬 알고리즘 재설계 — Justified Layout · 4가지 정렬 전략 · IDOR 수정 | 기획 완료 |
| `25_MAGAZINE_SPREAD_LAYOUT.md` | **매거진 면·판 레이아웃 시스템** — 판 7종 · MagazineViewer · 시리즈 통합 | 기획 완료 |
| `26_GENRE_CLASSIFICATION.md` | **사진 장르 분류 시스템** — 장르 12종 · GenreTabBar · ExplorePage 필터 통합 | 기획 완료 |
| `27_MULTILINGUAL.md` | **다국어(i18n) 시스템** — 4개 언어(ko/en/ja/zh) · LanguageContext · 이중언어 콘텐츠 · 헤더 토글 | 기획 완료 |
| `28_PORTFOLIO_TEMPLATE_SCRL.md` | **포트폴리오 템플릿 시스템** (SCRL 참조) — 8종 템플릿 · 템플릿 에디터 · 섹션 구성 · 스냅 스크롤 | 기획 완료 |
| `29_ADMIN_CATEGORY_MANAGEMENT.md` | **어드민 카테고리·장르 관리** — 기존 어드민 강화 + 3종 신규 페이지(카테고리·태그·모더레이션) + 확장 아이디어 | 기획 완료 |
| `30_PHOTO_EDITOR_ENHANCEMENT.md` | **보정 엔진 강화 v2** — Camera Calibration · Y2K 필름 스냅 프리셋 · XMP 내보내기 · Color Grading Balance | 기획 완료 |
| `31_COSMOS_PINTEREST_DESIGN_SYSTEM.md` | **Cosmos × Pinterest 디자인 시스템** — 다크 에디토리얼, 보드 카드, 마소닉 그리드, 전체 마이그레이션 스펙 | 기획 완료 |
| `DESIGN_PROMPT_COSMOS_GALLERY.md` | **Claude 디자인 프롬프트** — Cosmos 갤러리 홈·보드카드·탐색·에디터 패널·포토카드 5종 | 기획 완료 |

> **⚠️ 파일 번호 중복 안내**  
> - `11_IMAGE_EDITOR.md` 와 `11_PORTFOLIO_REDESIGN.md` 모두 11번 — 각각 독립 기획서  
> - `12_PHOTO_DETAIL_ENHANCED.md` 와 `12_SIDE_EFFECT_REVIEW.md` — 12번 중복 (후자는 검토 문서)  
> - `13_ADMIN_PANEL.md` 와 `13_IMAGE_EDITOR_DESIGN.md` — 13번 중복 (각각 독립 내용)

---

## 우선순위 현황

### P0 — 즉시 (UX 블로커)

- [ ] 빈 상태 UI (갤러리/탐색/피드/시리즈) → `01_FOUNDATION.md`
- [ ] 갤러리 본문 모바일 2컬럼 (Portfolio는 완료, GalleryPage 미확인) → `02_GALLERY_EXPLORE.md`
- [ ] 모달 body 스크롤 잠금 → `03_NAVIGATION_UX.md`
- [ ] 이미지 alt 텍스트 + aria-label → `03_NAVIGATION_UX.md`
- ✅ 댓글 섹션 — PhotoDetailPage + Modal 공용 CommentsSection 구현됨
- ✅ Header 문의함 미읽음 배지 (inquiryApi.getUnreadCount)
- **🆕 P0** 사진 정렬 알고리즘 재설계 — Justified Layout + IDOR 보안 수정 → `24_PHOTO_SORT_ALGORITHM_REDESIGN.md`

### P1 — 단기 (1~2주)

- [ ] 스켈레톤 shimmer 로딩 (갤러리/탐색/피드) → `01_FOUNDATION.md`
- [ ] 공통 Button / Input 컴포넌트 → `01_FOUNDATION.md`
- [ ] Header 아바타 드롭다운 (7-item nav 포함) → `03_NAVIGATION_UX.md`
- [ ] 탐색 비율 필터 + 태그 필터 + 자동완성 UI → `02_GALLERY_EXPLORE.md`
- ✅ 갤러리 뷰 토글 (masonry ↔ list) + 정렬 UI 구현됨
- ✅ 프로필 아바타/커버 이미지 업로드 (hover overlay 포함)
- ✅ InquiryInbox 카드 UX (읽음/미읽음)
- ✅ Admin 갤러리 순서 관리 (AdminGalleryOrderPage)
- ✅ Admin 대시보드 + 회원 관리 (AdminDashboardPage · AdminMembersPage)
- [ ] 이미지 에디터 폰트 라이브러리 30종 추가 → `17_PHOTO_TEXT_FONT_EXTENSION.md`

### P2 — 중기 (1개월)

- [ ] PhotoForm 워터마크 UI → `04_PHOTO_FORM.md`
- [ ] PhotoForm 이미지 비율 선택 UI → `04_PHOTO_FORM.md`
- [ ] PhotoForm 2컬럼 레이아웃 → `04_PHOTO_FORM.md`
- [ ] Before/After 비교 뷰 → `04_PHOTO_FORM.md`
- [ ] 드래프트 자동저장 (useDraft) → `04_PHOTO_FORM.md`
- [ ] 계정 삭제 2단계 확인 UI → `05_PROFILE_SOCIAL.md`
- [ ] 무한 스크롤 (갤러리/탐색/피드) → `02_GALLERY_EXPLORE.md`
- ✅ 프로필 4탭 UX 완성 (내 작품·저장함·시리즈·설정)
- ✅ PortfolioPage FollowListModal (팔로워/팔로잉 클릭)
- ✅ FeedPage 디자인 (더 보기 페이지네이션)
- ✅ PhotoForm AI 자동태그 버튼 (AutoTagService)

### P3 — 장기 (로드맵 V2, `18_FEATURE_ENHANCEMENT_V2.md`)

| 우선순위 | 아이디어 |
|---------|---------|
| **P3-0** | 클라이언트 납품 포털 `/proof/:token` |
| **P3-1** | 촬영 예약 캘린더 |
| **P3-1** | 방문자 분석 대시보드 (Canvas 차트) |
| **P3-1** | AI 스마트 앨범 자동 분류 |
| **P3-2** | 다크모드 / 테마 전환 (`useTheme`) |
| **P3-2** | 사진 이야기 스크롤 내러티브 |
| **P3-2** | 포토북 PDF 내보내기 |
| **P3-2** | 디지털 명함 카드 `/portfolio/:profileName/card` |

### 디자인 방향 (대규모 리디자인 검토 중)

- `21_IOS26_LIQUID_GLASS_DESIGN.md` — iOS 26 Liquid Glass 기초 토큰 설계
- `22_IOS26_LIQUID_GLASS_REDESIGN.md` — 전체 앱 재설계 바이블 (가장 완전한 문서)
- `23_IOS26_LIQUID_GLASS_V2.md` — V2 개선안 (specular highlight · aurora)
- `19_PORTFOLIO_META_SEO.md` — SEO · Open Graph · Schema.org 적용 기획

---

## 실제 라우트 구조 (최신 검증)

```
── 공개 (로그인 불필요) ──────────────────────────────────────
  /login                            LoginPage
  /signup                           SignUpPage
  /oauth/kakao/callback             KakaoCallbackPage
  /oauth/google/callback            GoogleCallbackPage
  /oauth/naver/callback             NaverCallbackPage
  /oauth/apple/result               AppleResultPage (백엔드 리다이렉트)
  /portfolio/:profileName           PortfolioPage   ← 다크 테마, 에디토리얼 레이아웃
  /portfolio/:profileName/slideshow PortfolioSlideshowPage ← 풀스크린, 헤더 없음
  /inquiry/:profileName             InquiryFormPage ← 촬영 문의, 헤더 없음

── 보호 (로그인 필요, 헤더 있음) ──────────────────────────────
  /                                 GalleryPage
  /explore                          ExplorePage
  /list                             ListPage
  /photo/new                        PhotoFormPage (신규 등록)
  /photo/:id                        PhotoDetailPage
  /photo/:id/edit                   PhotoFormPage (수정)
  /profile                          ProfilePage (4탭)
  /series                           SeriesPage
  /inbox                            InquiryInboxPage
  /feed                             FeedPage

── 독립 (헤더 없음, 로그인 필요) ──────────────────────────────
  /editor                           ImageEditorPage (이미지 에디터 SPA)

── 어드민 (ADMIN 역할, ProtectedRoute requiredRoles=['ADMIN']) ──
  /admin                            AdminDashboardPage
  /admin/gallery-order              AdminGalleryOrderPage
  /admin/members                    AdminMembersPage
  /admin/photos                     AdminPhotosPage

── 🗑️ 제거된 라우트 ─────────────────────────────────────────
  /gallery/sort    PhotoSortPage   ← 어드민 패널로 이관 완료. 파일 자체도 deprecated.
```

> `/u/:profileName` 라우트 없음. 공개 프로필은 `/portfolio/:profileName`.

---

## 디자인 토큰 (코드 검증 완료 — 모든 신규 프롬프트에 이 값 사용)

```js
// constants/colors.js 실제 값 (2026-06-19 검증)
primary:       '#5b6ef5'     primaryDark:  '#4458e0'    primaryLight: '#eef0ff'
accent:        '#a78bfa'     bg:           '#f7f7fb'    surface:      '#ffffff'
surfaceDim:    '#ededf4'     border:       '#e5e5ed'    text:         '#0f0f1a'
textSecondary: '#5555aa'     textMuted:    '#8888bb'    danger:       '#e53e3e'
success:       '#22c55e'     bg:       '#090909'    surface:  '#0f0f0f'
border:    'rgba(255,255,255,0.07)'     text:     '#e8e8f0'    textSub:  '#8080b0'
galleryBg:     '#090909'

// ⚠️ 아래는 구버전 — 사용 금지 (일부 오래된 파일에 잔존)
// bg '#f5f5fa', text '#1a1a2e', textSecondary '#5c5c7a', textMuted '#9090b0', border '#e2e2ee'

radius: { xs:4, sm:8, md:12, lg:16, xl:20, full:9999 }
shadow:
  sm:    '0 2px 8px rgba(91,110,245,0.08)'
  md:    '0 4px 16px rgba(91,110,245,0.12)'
  lg:    '0 8px 32px rgba(91,110,245,0.16)'
  focus: '0 0 0 3px rgba(91,110,245,0.25)'
```

---

## 실제 Header Nav 항목 (검증됨)

```
PC 헤더 (768px 이상):
  [탐색] [갤러리] [시리즈] [목록] [등록] [문의함 🔴N] [프로필] | [로그아웃]

모바일 BottomNav (768px 미만):
  탐색 | 갤러리 | ➕(등록, 원형 강조) | 피드 | 프로필
```

> 기존 일부 문서에서 Header를 [탐색][갤러리][목록] 3개로 표기했으나 실제는 7개 항목.  
> 새 프롬프트 작성 시 반드시 위 항목 목록 기준으로 작성할 것.

---

## 작업 원칙

1. P0 완료 후 P1 진입 (블로커 먼저). 단, `24_PHOTO_SORT_ALGORITHM_REDESIGN.md`는 레이아웃 품질 블로커이므로 즉시 착수.
2. `01_FOUNDATION` 완료 후 나머지 파일 작업 (Button/Input 컴포넌트 먼저)
3. 모든 컴포넌트: 모바일 375px 테스트 필수
4. 기존 기능 회귀 없음 — 갤러리/탐색/등록/시리즈/포트폴리오 수동 테스트
5. 색상 토큰은 반드시 위 **검증된 실제 값** 사용 (구버전 혼용 금지)
6. 보안: `PUT /api/photos/reorder` IDOR 버그 — ✅ `@AuthenticationPrincipal` + 소유자 확인으로 수정 완료 (2026-06-20)
