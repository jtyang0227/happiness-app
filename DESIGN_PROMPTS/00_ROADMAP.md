# Happiness — 디자인 작업 로드맵

검증일: 2026-06-17 (Phase 4 기획 추가)

## 파일 구성

| 파일 | 포함 작업 |
|------|----------|
| `01_FOUNDATION.md` | Button · Input · EmptyState · Skeleton (공통 컴포넌트) |
| `02_GALLERY_EXPLORE.md` | 갤러리 뷰토글/정렬 · 탐색 필터 전체(비율/태그/자동완성) · 무한스크롤 |
| `03_NAVIGATION_UX.md` | Header 7-item 재설계(문의 배지 포함) · Modal UX · 접근성 |
| `04_PHOTO_FORM.md` | PhotoForm 레이아웃 · 워터마크 · 비율선택 · AI태그 · Before/After · 드래프트 |
| `05_PROFILE_SOCIAL.md` | 프로필 4탭 · 커버업로드 · 6종통계 · 계정삭제 · 댓글 · 팔로우모달 |
| `06_SERIES_INQUIRY.md` | SeriesPage · InquiryFormPage · InquiryInboxPage 전체 UX |
| `07_FEED_SORT.md` | FeedPage · PhotoSortPage(드래그 정렬) UX |
| `08_COLOR_PALETTE_DETAIL.md` | **[신규]** 5색 팔레트 추출 · PhotoDetail 강화 (네비게이션/전체화면/관련사진/공유/인쇄) |
| `09_PORTFOLIO_BUILDER.md` | **[신규]** 슬라이드쇼 뷰어 · 매거진 레이아웃 · PDF 내보내기 · 임베드 코드 |

---

## 우선순위

### P0 — 즉시 (UX 블로커)
- [ ] 빈 상태 UI (갤러리/탐색/피드/시리즈) → `01_FOUNDATION.md`
- [ ] 갤러리 모바일 2컬럼 → `02_GALLERY_EXPLORE.md`
- [ ] 댓글 섹션 — PhotoDetailPage에 누락 (Modal에만 있음) → `05_PROFILE_SOCIAL.md`
- [ ] 모달 body 스크롤 잠금 → `03_NAVIGATION_UX.md`
- [ ] 이미지 alt 텍스트 + aria-label → `03_NAVIGATION_UX.md`
- [ ] Header 문의함 배지 UX 개선 (현재 있지만 시각적으로 약함) → `03_NAVIGATION_UX.md`

### P1 — 단기 (1~2주)
- [ ] 스켈레톤 로딩 (갤러리/탐색/피드) → `01_FOUNDATION.md`
- [ ] 공통 Button / Input 컴포넌트 → `01_FOUNDATION.md`
- [ ] Header 아바타 드롭다운 (7-item nav 포함) → `03_NAVIGATION_UX.md`
- [ ] 탐색 비율 필터 + 태그 필터 + 자동완성 UI → `02_GALLERY_EXPLORE.md`
- [ ] 갤러리 뷰 토글(마소닉↔리스트) + 정렬 UI → `02_GALLERY_EXPLORE.md`
- [ ] 프로필 아바타/커버 이미지 업로드 → `05_PROFILE_SOCIAL.md`
- [ ] InquiryInbox 카드 UX (읽음/미읽음, 펼치기) → `06_SERIES_INQUIRY.md`
- [ ] PhotoSortPage 드래그 UX 개선 → `07_FEED_SORT.md`

### P2 — 중기 (1개월)
- [ ] PhotoForm 워터마크 UI → `04_PHOTO_FORM.md`
- [ ] PhotoForm 이미지 비율 선택 UI → `04_PHOTO_FORM.md`
- [ ] PhotoForm AI 자동태그 버튼 → `04_PHOTO_FORM.md`
- [ ] PhotoForm 2컬럼 레이아웃 → `04_PHOTO_FORM.md`
- [ ] Before/After 비교 뷰 → `04_PHOTO_FORM.md`
- [ ] 드래프트 자동저장 → `04_PHOTO_FORM.md`
- [ ] 프로필 4탭 UX 완성 (저장함/시리즈/설정) → `05_PROFILE_SOCIAL.md`
- [ ] 계정 삭제 2단계 확인 UI → `05_PROFILE_SOCIAL.md`
- [ ] SeriesPage PhotoPicker 모달 UX → `06_SERIES_INQUIRY.md`
- [ ] PortfolioPage FollowListModal → `05_PROFILE_SOCIAL.md`
- [ ] 무한 스크롤 (갤러리/탐색/피드) → `02_GALLERY_EXPLORE.md`
- [ ] FeedPage 디자인 개선 → `07_FEED_SORT.md`

---

## 실제 라우트 구조 (검증됨)

```
공개 (헤더 없음, 다크 테마):
  /login                      LoginPage
  /signup                     SignUpPage
  /oauth/kakao/callback       KakaoCallbackPage
  /portfolio/:profileName     PortfolioPage   ← 공개 포트폴리오 (다크 전용)
  /inquiry/:profileName       InquiryFormPage ← 촬영 문의

보호 (헤더 있음, 밝은 테마):
  /                           GalleryPage
  /explore                    ExplorePage
  /list                       ListPage
  /photo/new                  PhotoFormPage (create)
  /photo/:id                  PhotoDetailPage
  /photo/:id/edit             PhotoFormPage (edit)
  /profile                    ProfilePage
  /series                     SeriesPage
  /inbox                      InquiryInboxPage
  /gallery/sort               PhotoSortPage
  /feed                       FeedPage
```

> ⚠️ `/u/:profileName` 라우트는 현재 없음. 실제 공개 프로필은 `/portfolio/:profileName`.  
> AuthorPage 신규 생성 대신 PortfolioPage 디자인 개선으로 방향 수정.

---

## 디자인 토큰 (코드 검증 완료)

```js
// constants/colors.js 실제 값
primary:       '#5b6ef5'     primaryDark:  '#4458e0'    primaryLight: '#eef0ff'
accent:        '#a78bfa'     bg:           '#f7f7fb'    surface:      '#ffffff'
surfaceDim:    '#ededf4'     border:       '#e5e5ed'    text:         '#0f0f1a'
textSecondary: '#5555aa'     textMuted:    '#8888bb'    danger:       '#e53e3e'
success:       '#22c55e'     darkBg:       '#0a0a18'    darkSurface:  '#12122a'
darkBorder:    '#2a2a50'     darkText:     '#e8e8f0'    darkTextSub:  '#8080b0'
galleryBg:     '#0e0e0e'

// ⚠️ 기존 문서의 bg '#f5f5fa', text '#1a1a2e', textSecondary '#5c5c7a' 는 구버전 값
// 실제 코드에서는 위 값을 사용함. 프롬프트 작성 시 위 값으로 통일할 것.

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
현재 구현: [탐색] [갤러리] [시리즈] [목록] [등록] [문의함 🔴N] [프로필]
           + 로그아웃 버튼 (우측 끝)
모바일 BottomNav: 탐색 | 갤러리 | ➕(등록, 원형 강조) | 피드 | 프로필
```

> 기존 문서에서 Header를 [탐색][갤러리][목록] 3개로 표기했으나, 실제는 7개 항목.  
> 03_NAVIGATION_UX.md의 Header 재설계 프롬프트가 이 항목들을 모두 반영해야 함.

---

## 작업 원칙

1. P0 완료 후 P1 진입 (블로커 먼저)
2. `01_FOUNDATION` 완료 후 나머지 파일 작업 (Button/Input 먼저)
3. 모든 컴포넌트: 모바일 375px 테스트 필수
4. 기존 기능 회귀 없음 — 갤러리/탐색/등록/시리즈/포트폴리오 수동 테스트
5. 색상 토큰은 반드시 위 **검증된 실제 값** 사용 (구버전 혼용 금지)
