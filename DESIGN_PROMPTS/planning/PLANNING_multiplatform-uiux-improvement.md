# PLAN — 멀티플랫폼 UI/UX 디자인 개선
> 작성일: 2026-08-23 | PM: Claude | 대상 플랫폼: 웹(데스크탑/태블릿) · 모바일 앱(iOS/Android)

---

## 개요

지금까지 진행한 디자인 시스템 작업(AKIRA Neo-Tokyo 액센트, Cosmos 화이트 테마 1차 전환, 보드 카드 콜라주, 플로팅 필 네비, 로고 글리치 모션)이 웹의 일부 화면에만 적용된 채로 남아있고, 모바일 앱과 태블릿 뷰포트는 그 변화가 전혀 반영되지 않은 상태다. 이 문서는 3개 플랫폼의 현황을 코드 기반으로 진단하고, 각 플랫폼이 디자인 시스템을 일관성 있게 구현하기 위한 우선순위 로드맵을 제시한다.

---

## 1. 배경 — 지금까지 한 것과 남은 것

### 완료된 작업 (2026-08-18 ~ 2026-08-23)

| 작업 | 관련 파일 | 상태 |
|------|-----------|------|
| AKIRA Neo-Tokyo 액센트 (레드 #E8121A + 시안 #22D3EE) | `constants/colors.js`, 전체 primary/accent 참조 45개 파일 | 완료 |
| Cosmos 화이트 테마 1차: GalleryPage / ExplorePage / PhotoCard / Header / global.css | 5개 파일 | 완료 |
| 시리즈 보드 카드 — 3장 콜라주 (좌 60% + 우 상하 2분할) | `SeriesPage.jsx`, `TemplateEditorial.jsx`, `SeriesController` | 완료 |
| 플로팅 필(pill) 하단 네비게이션 | `Header.jsx` BottomNav | 완료 |
| 로고 교체 + 글리치 진입 애니메이션 + 버튼 스피드라인 | `Header.jsx`, `LoginPage.jsx`, `SignUpPage.jsx`, `AkiraLogo.jsx` | 완료 |
| 모바일 `constants/colors.js` AKIRA 컬러 토큰 반영 | `mobile/constants/colors.js` | 완료 |

### 미완료 — 웹 Cosmos 화이트 테마 2차 대상 화면

`DESIGN_PROMPT_cosmos-light-theme.md`에 명시적으로 "2차 작업으로 이연"된 화면들:

| 화면 | 파일 | 현재 상태 |
|------|------|-----------|
| FeedPage | `frontend/src/pages/FeedPage.jsx` | **폐기된 glass.js 시스템 사용**, 인디고/라벤더 그라디언트 배경 잔존 |
| PhotoDetailPage | `frontend/src/pages/PhotoDetailPage.jsx` | 데스크탑 래퍼 `#0e0e0e` 다크, 정보 패널만 `COLORS.surface` 화이트 |
| PortfolioPage (FollowListModal) | `frontend/src/pages/PortfolioPage.jsx` | 하드코딩 다크 hex 6종 잔존 |

---

## 2. 플랫폼별 현황 분석

### (a) 웹 — 라이트 전환 미완료 화면 3개

#### FeedPage.jsx — 심각도 높음

- **배경**: `background: 'linear-gradient(160deg, #f0f2ff 0%, #f5f0ff 40%, #eff7ff 100%)'`
  — AKIRA 이전 v1 시대(인디고 `#5b6ef5` + 라벤더 `#a78bfa`)의 그라디언트. Cosmos 화이트와 충돌.
- **카드**: `glass('light')` import — `constants/glass.js`는 iOS 26 Liquid Glass 시절 폐기된 모듈. 카드에 glassmorphism backdrop-filter, borderRadius 24px, 복잡한 shadow 적용 중.
- **빈 화면 버튼**: `GLASS.light.surface`, `GLASS.light.border`, `GLASS.light.blur` 상수 직접 참조.
- **필요 작업**: glass.js 의존성 제거, 배경을 `COLORS.bg`(#f5f5fa)로, 카드를 Cosmos 스타일 plain surface 카드(`background: COLORS.surface`, `border: 1px solid COLORS.border`)로 교체.

#### PhotoDetailPage.jsx — 심각도 중간 (의도적 예외 가능)

- **데스크탑 래퍼**: `background: isMobile ? COLORS.bg : '#0e0e0e'` — 데스크탑은 `#0e0e0e` 다크.
- **이미지 섹션**: `background: '#0e0e0e'` — 사진 감상용 다크 배경으로 의도적으로 유지할 수 있음. 유사 사례: Unsplash, 500px 모두 이미지 영역은 다크 처리.
- **정보 패널**: `background: COLORS.surface` — 이미 화이트. 혼재(이미지=다크, 정보=라이트)는 UI 패턴으로서 성립함.
- **뒤로가기 버튼**: `background: 'rgba(0,0,0,0.45)'`, `color: '#fff'` — 다크 이미지 배경 위 오버레이이므로 맥락상 적절.
- **필요 작업**: 실제로는 "이미지 영역 다크 + 정보 패널 라이트"가 Cosmos 앱 PhotoDetail과도 일치하는 패턴이므로 현재 구조는 유지 가능. 단, 데스크탑 전체 래퍼(`minHeight: '100vh'`)가 `#0e0e0e`여서 데스크탑에서 정보 패널 영역 밖(여백)이 다크로 보이는 문제 수정 필요.

#### PortfolioPage.jsx — FollowListModal 심각도 낮음 (인지도 낮은 모달)

- `background: '#12122a'` (darkSurface 하드코딩), `color: '#eeeeff'`, `#9090cc`, `#d0d0f0`, `#6060a0`, `border: '1px solid #2a2a50'`
- COLORS 토큰 없이 6개 hex 값 직접 사용 — 디자인 시스템 일관성 깨짐.
- `TemplateComingSoon`: `background: '#0e0e0e'` — 미완성 템플릿 플레이스홀더이므로 낮은 우선순위.

---

### (b) 모바일 앱 — AKIRA/Cosmos 미반영 + 기능 격차

#### 네비게이션 UI: COLORS 토큰 미사용

`mobile/src/navigation/AppNavigator.js`:
- 탭 바: `backgroundColor: '#0a0a18'`, `borderTopColor: '#1e1e3a'` — 모두 이전 `darkBg`/`darkSurface` 값 하드코딩.
- 스택 헤더: `headerStyle: { backgroundColor: '#0a0a18' }`, `headerTintColor: '#fff'` — `PhotoFormScreen`, `SeriesScreen` 모두 동일.
- `COLORS.dark: '#1a1a2e'`가 `mobile/constants/colors.js`에 존재하지만 네비게이터에서 참조하지 않음.

#### 화면별 Cosmos 라이트 미반영

웹에서 GalleryPage / ExplorePage가 화이트 배경으로 전환됐지만, 모바일 앱은 전체 화면이 여전히 다크 기조 유지. 이는 "네이티브 앱은 OS 다크모드 설정 기준"이라는 관행과 다르게, 현재 앱이 OS 설정과 무관하게 하드코딩된 다크 배경을 쓰고 있다는 점이 문제다.

다만 네이티브 앱에서 화이트/다크 전환은 웹보다 회귀 위험이 훨씬 크고(StyleSheet 캐싱, View 계층 구조) 별도 작업량이 상당하므로, 이 문서에서는 "모바일은 Cosmos 화이트가 아닌 AKIRA 다크로 통일"을 올바른 설계 결정으로 제안한다. 네이티브 다크 UI는 사진 갤러리 앱의 콘텐츠 감상에 더 적합하다.

#### 장르 시스템(Feature 26) 미반영 — 심각한 기능 격차

- 웹 ExplorePage: `GenreTabBar` 12개 장르 필터 + `genre` 파라미터로 검색.
- 모바일 ExploreScreen.js: `moodFilter`(colorMood) 기반 검색만 있음. `genre` 파라미터 없음.
- 사용자가 웹에서 "인물" 장르로 필터링한 사진을 모바일에서는 찾을 방법이 없음.

#### 시리즈 보드 카드(3장 콜라주) 미반영

- 웹 SeriesPage + TemplateEditorial: 3장 콜라주 완료 (좌 60% + 우 상하 2분할).
- 모바일 SeriesScreen.js: 해당 카드 UI 업데이트 미확인 (별도 검증 필요).
- `SeriesResponse.previewPhotos` 백엔드 필드가 추가됐다면 모바일에서도 활용 가능.

#### 기능 격차 — 웹 전용 기능

아래 기능은 현재 웹에만 존재하며 모바일 앱 대응 계획이 없다:
- 약속 시스템(Meets) — `/meets`, `/meets/:id`
- 클라이언트 납품 포털(Delivery) — `/proof/:token`, `/deliveries`
- 촬영 예약(Booking) — `/booking/:profileName`, `/bookings`
- 방문자 분석(Analytics) — ProfilePage 분석 탭
- 이미지 에디터(ImageEditor) — `/editor`

이 중 모바일에서 가장 수요가 높을 것으로 예상되는 기능은 **약속(Meets)** — 모델과 작가가 현장 이동 중에도 대화해야 하는 특성상 모바일 우선 기능에 해당한다.

---

### (c) 아이패드/태블릿 — 브레이크포인트 이진 구조

#### 현재 브레이크포인트 전체 현황 (코드 검증)

| 파일 | 브레이크포인트 | 동작 |
|------|--------------|------|
| `GalleryPage.jsx` | 600px | 600px 미만: 2컬럼 / 이상: 4컬럼 (3단계 없음) |
| `ExplorePage.jsx` | 640px, 1024px | 640px 미만: 2컬럼 / 1024px 미만: 3컬럼 / 이상: 4컬럼 |
| `Header.jsx` | 768px | 768px 미만: BottomNav / 이상: 데스크탑 헤더 |
| `PhotoDetailPage.jsx` | 768px (JS) | 768px 미만: 세로 스택 / 이상: 가로 2분할 |
| `TemplateEditorial.jsx` | 600px, 900px | 600px: 2컬럼 / 900px: 3컬럼 / 이상: 4컬럼 |
| `AdminLayout.jsx` | 768px | 768px 미만: 사이드바 숨김 |
| `RelatedPhotos.jsx` | 480px | 480px 미만: 2컬럼 |
| `TemplateMinimal.jsx` | ~768px 추정 | 작은 화면 2컬럼 전환 |

#### 아이패드 구체적 문제

- **아이패드 미니(768px)**: Header 기준 정확히 경계선. 가로 모드(1024px)는 데스크탑 헤더, 세로 모드(768px)는 하루 이틀 전환 경계 — 회전 시 레이아웃 점프 발생 가능성.
- **아이패드 Air/Pro(820~1024px)**: GalleryPage에서 4컬럼 그리드 적용됨. 4컬럼은 데스크탑(1280px)에서 설계된 것이라 820px에서는 각 컬럼이 약 190px — 정상 범위 내이나 여백이 빠듯함.
- **아이패드 Pro 12.9인치(1366px)**: 데스크탑 레이아웃 그대로 적용 — Header maxWidth 1280px 중앙 정렬이 작동해 비교적 양호.
- **공통 문제**: 통일된 브레이크포인트 시스템(예: sm/md/lg/xl 토큰)이 없어 파일마다 600, 640, 768, 900, 1024px 등 제각각 사용. 유지보수 시 모든 파일을 개별 수정해야 함.

---

## 3. 개선 방향

### (a) 웹 — Cosmos 화이트 테마 2차 전환

- **FeedPage**: glass.js 의존성 제거 → Cosmos plain 카드(surface + border) 적용. 배경을 `COLORS.bg`(#f5f5fa)로. 카드 구조는 유지하되 glassmorphism 대신 단순 elevation으로.
- **PhotoDetailPage**: 이미지 영역은 다크 유지(사진 감상 UX 적합). 데스크탑 전체 래퍼 배경을 `#0e0e0e`에서 `COLORS.bg`로 변경하되, 이미지 섹션만 별도로 `#0e0e0e` 유지하는 구조로 정밀 수정.
- **PortfolioPage FollowListModal**: 6개 하드코딩 다크 hex를 `COLORS` 토큰으로 교체. `#12122a` → `COLORS.surface`, `#eeeeff` → `COLORS.text`, `#6060a0` → `COLORS.textMuted`.

### (b) 모바일 앱

- **네비게이터 COLORS 토큰화**: `AppNavigator.js`의 `'#0a0a18'` → `COLORS.dark`, `'#1e1e3a'` → `COLORS.darkAlt`로 교체. 향후 컬러 변경 시 단일 지점 수정 가능.
- **장르 필터 추가 (ExploreScreen)**: `genre` 파라미터 지원, 수평 스크롤 장르 탭 추가(웹 GenreTabBar 로직 참조). 모바일에서는 12개 모두 표시 대신 상위 6개 + "더 보기" 방식 고려.
- **시리즈 보드 카드**: `SeriesScreen.js`에 3장 콜라주 UI 적용. `previewPhotos` 데이터가 백엔드에서 내려오면 별도 쿼리 없이 구현 가능.
- **Meets 화면 추가 (P1)**: 모바일 작가/모델 사용자의 핵심 기능. TabNavigator에 "약속" 탭 또는 Stack으로 진입. 채팅은 모바일에서 더 자주 사용.
- **다크 통일 (결정 사항)**: 모바일은 AKIRA 다크 테마(#0a0a18 베이스)로 통일. 웹의 Cosmos 화이트 전환은 모바일에 강제 적용하지 않는다 — 네이티브 사진 갤러리 앱은 다크 배경이 콘텐츠 집중도를 높인다.

### (c) 아이패드/태블릿

- **브레이크포인트 토큰 통일**: `constants/layout.js` (또는 신규 `constants/breakpoints.js`) 파일에 `BP = { sm: 480, md: 768, lg: 1024, xl: 1280 }` 정의. 각 파일에서 하드코딩된 숫자 대신 상수 참조.
- **태블릿 전용 3컬럼 레이아웃 추가**: GalleryPage에 `@media(max-width:1024px){columns:3}` 브레이크포인트 추가(현재 600px에서 2컬럼으로 바로 점프하는 문제 해소).
- **Header 태블릿 처리**: 768~1024px 범위에서 BottomNav → 데스크탑 헤더 전환이 어색한 경우 `@media (max-width: 1024px)` 조건 추가하여 태블릿에서도 BottomNav 또는 슬림 헤더 제공.
- **PhotoDetailPage 태블릿**: 768~1024px에서 가로 2분할 레이아웃이 적용되는데, 58%/42% 비율이 820px에서는 이미지 영역이 너무 좁음. 태블릿에서는 세로 스택 레이아웃이 더 나을 수 있음.

---

## 4. 사용자 페르소나

| 페르소나 | 주로 사용하는 플랫폼 | 현재 불편함 |
|---------|-------------------|------------|
| 사진작가 (포트폴리오 관리) | 데스크탑 웹 | FeedPage가 구식 glassmorphism — 갤러리/탐색과 디자인 언어가 달라 어색함 |
| 모델 (작업 협업/약속) | 모바일 앱 위주 | Meets 기능이 앱에 없어 웹 브라우저로 열어야 함 |
| 클라이언트 (사진 검색/예약) | 아이패드 or 모바일 | 아이패드에서 갤러리가 4컬럼 → 이미지가 너무 작게 보임; 장르 필터가 모바일 앱에 없어 원하는 스타일 찾기 어려움 |

---

## 5. 유저 스토리

### 웹 — Cosmos 화이트 테마 완성

- As a **사진작가**, I want to **피드 화면의 카드 디자인이 갤러리/탐색과 통일된 Cosmos 스타일로 보이길** want, so that **앱 내 모든 화면에서 일관된 시각적 경험을 느낄 수 있다**.
- As a **클라이언트**, I want to **PhotoDetail 페이지에서 사진 정보 패널이 밝고 읽기 편한 배경으로 보이길**, so that **촬영 정보(무드, 렌즈, EXIF)를 편안하게 읽고 문의 여부를 결정할 수 있다**.
- As a **사진작가**, I want to **PortfolioPage의 팔로워/팔로잉 목록 모달이 깔끔한 라이트 스타일로 보이길**, so that **다른 Cosmos 화이트 화면들과 시각적 충돌 없이 자연스럽게 사용할 수 있다**.

### 모바일 앱

- As a **모델**, I want to **모바일 앱에서 작가와 약속(Meets)을 만들고 채팅할 수 있길**, so that **현장 이동 중에도 촬영 일정을 조율할 수 있다**.
- As a **클라이언트**, I want to **모바일 앱 탐색 화면에서 "인물", "풍경" 등 장르로 사진을 필터링할 수 있길**, so that **원하는 스타일의 작가를 빠르게 찾을 수 있다**.
- As a **사진작가**, I want to **모바일 앱에서 시리즈 보드 카드가 3장 콜라주로 보이길**, so that **웹과 앱에서 동일한 포트폴리오 시각 언어를 유지할 수 있다**.

### 아이패드/태블릿

- As a **클라이언트**, I want to **아이패드로 갤러리를 볼 때 사진이 3컬럼으로 적당한 크기로 배치되길**, so that **이미지를 충분히 감상하며 원하는 스타일을 탐색할 수 있다**.
- As a **사진작가**, I want to **아이패드를 세로/가로로 회전해도 네비게이션과 레이아웃이 자연스럽게 전환되길**, so that **디바이스를 들고 클라이언트에게 포트폴리오를 보여줄 때 버벅임이 없다**.
- As a **개발자**, I want to **브레이크포인트가 단일 상수 파일에 정의되어 있길**, so that **태블릿 대응 수정 시 16개 파일을 개별 수정하지 않아도 된다**.

---

## 6. 수용 기준 (Acceptance Criteria)

### 웹 — Cosmos 화이트 테마 2차

- [ ] **AC-W1**: `FeedPage.jsx`에서 `glass`, `GLASS`, `GLASS_KEYFRAMES` import가 제거되고, 카드 배경이 `COLORS.surface`(`#ffffff`), 카드 테두리가 `1px solid COLORS.border`(`#e2e2ee`)로 교체된다.
- [ ] **AC-W2**: `FeedPage.jsx` 페이지 배경이 인디고 그라디언트에서 `COLORS.bg`(`#f5f5fa`) 단색으로 변경된다.
- [ ] **AC-W3**: `PhotoDetailPage.jsx`의 데스크탑 전체 래퍼 배경(`minHeight: '100vh'`)이 `#0e0e0e`에서 `COLORS.bg`로 변경되고, 이미지 섹션(`flex: 0 0 58%`)은 `#0e0e0e` 유지된다.
- [ ] **AC-W4**: `PortfolioPage.jsx` FollowListModal에서 하드코딩 hex 6개(`#12122a`, `#eeeeff`, `#9090cc`, `#1e1e3a`, `#d0d0f0`, `#6060a0`)가 `COLORS` 토큰으로 교체된다.
- [ ] **AC-W5**: `npm run build` 성공(빌드 에러 없음).
- [ ] **AC-W6**: 브라우저에서 FeedPage, PhotoDetail, PortfolioPage 팔로워 모달을 열어 흰 배경에 흰 텍스트가 겹치는 현상(invisible text)이 없음을 육안 확인.

### 모바일 앱

- [ ] **AC-M1**: `AppNavigator.js`의 `'#0a0a18'` 하드코딩이 `COLORS.dark` 또는 `COLORS.darkDeep` 토큰으로 교체되고, `'#1e1e3a'`가 `COLORS.darkAlt`로 교체된다.
- [ ] **AC-M2**: `ExploreScreen.js`에 `genre` 필터 수평 스크롤 탭이 추가되고, `photoApi.getAll({ genre })`가 호출된다. 상위 6개 장르 표시 + 전체 보기 옵션 포함.
- [ ] **AC-M3**: `SeriesScreen.js`의 시리즈 카드가 `previewPhotos` 배열(최대 3장)이 있을 때 3장 콜라주(좌 60% + 우 상하 2분할)로 렌더링된다.
- [ ] **AC-M4**: `npx expo export --platform web` 성공 — JS 번들 에러 없음.
- [ ] **AC-M5** (Meets, P1 조건): `MeetsScreen`, `MeetDetailScreen`이 추가되고 MainTabs에 약속 탭이 포함된다. 웹 meet API(`meetApi`)와 동일한 엔드포인트를 사용한다.

### 아이패드/태블릿

- [ ] **AC-T1**: `GalleryPage.jsx` 마소닉 그리드에 `@media(max-width:1024px){columns:3}` 브레이크포인트가 추가되어 768~1024px 구간에서 3컬럼이 적용된다.
- [ ] **AC-T2**: `frontend/src/constants/breakpoints.js` (신규) 또는 `layout.js` 확장으로 `BP = { sm: 480, md: 768, lg: 1024, xl: 1280 }` 상수가 정의된다.
- [ ] **AC-T3**: 아이패드 Air(820px 기준) Chrome DevTools에서 GalleryPage, ExplorePage, PhotoDetailPage를 로드해 레이아웃 깨짐(overflow, 텍스트 잘림, 빈 공간 과다) 없음을 확인.
- [ ] **AC-T4**: Header.jsx가 768~1024px 범위에서 BottomNav와 데스크탑 헤더 중 어느 쪽을 보여줄지 결정하고 문서화된다 (현재 768px 정확히 경계라 아이패드 미니 회전 시 급격한 전환 발생 가능).

---

## 7. 기능 범위

### In Scope (이번 구현)

**P0 — 웹:**
- FeedPage glass.js 제거 + Cosmos 카드 전환
- PhotoDetailPage 데스크탑 래퍼 배경 수정
- PortfolioPage FollowListModal 토큰화

**P1 — 모바일:**
- AppNavigator.js COLORS 토큰화
- ExploreScreen 장르 필터 추가
- SeriesScreen 보드 카드 콜라주 UI

**P1 — 태블릿:**
- GalleryPage 1024px 중간 브레이크포인트 추가
- 브레이크포인트 상수 파일 생성

### Out of Scope (다음 버전)

- 모바일 앱 Cosmos 화이트 테마 전환 — 네이티브 다크 통일 정책으로 배제
- 모바일 앱 Meets 화면 전체 구현 — P1 검토 후 별도 기획 문서로
- 모바일 앱 Delivery / Booking / Analytics — 장기 로드맵
- PhotoDetailPage 전체 레이아웃 리디자인 — 현재 구조(이미지 다크 + 정보 라이트)는 의도적 예외로 유지
- 태블릿 전용 PhotoDetail 세로 스택 전환 — 별도 UX 검토 필요
- Header 태블릿 슬림 버전 — 현재 768px 이분법 유지, 전환 연구는 다음 버전

---

## 8. 기술 트레이드오프

| 옵션 | 장점 | 단점 | 결정 |
|------|------|------|------|
| **웹 FeedPage: glass.js 유지 + 색상만 수정** | 작업량 최소 | 폐기된 의존성 지속, iOS 26 Liquid Glass 잔재가 남아 코드베이스 혼란 | ❌ |
| **웹 FeedPage: glass.js 완전 제거 + Cosmos 카드** | 폐기 모듈 정리, Cosmos 일관성 확보 | 카드 UX 변화(glassmorphism → flat card) — 사용자 체감 있음 | ✅ |
| **모바일: 화이트 테마 동기화** | 웹/모바일 시각 일관성 | StyleSheet 전면 교체 필요, 회귀 위험 높음, React Native 다크 배경이 사진 앱에 더 적합 | ❌ |
| **모바일: AKIRA 다크 통일** | 사진 감상 최적, 리스크 최소 | 웹(화이트)과 모바일(다크) 간 브랜드 경험 차이 존재 | ✅ (플랫폼 관용으로 허용) |
| **태블릿: 768px 이분법 유지** | 작업 없음 | 아이패드에서 콘텐츠 레이아웃 어색함 지속 | ❌ |
| **태블릿: 1024px 중간 브레이크포인트 추가 (파일별 개별)** | 즉시 적용 가능 | 파일마다 개별 추가 → 유지보수 부담 | 단기 ✅ |
| **태블릿: 브레이크포인트 상수 파일 통일 후 교체** | 장기 유지보수성 최대 | 16개 파일 수정 필요 | 중기 ✅ |
| **모바일 Meets: 웹과 동일 API 재사용** | 백엔드 작업 없음, 빠른 구현 | 모바일 UX(채팅 인터페이스 등)를 웹 스타일 그대로 복사하면 네이티브 경험 저하 | 조건부 ✅ (API만 재사용, UI는 RN 스타일로) |

---

## 9. 우선순위 로드맵

### P0 — 즉시 (디자인 일관성 블로커)

| 항목 | 플랫폼 | 예상 공수 |
|------|--------|---------|
| FeedPage glass.js 제거 + Cosmos 카드 전환 | 웹 | 2~3시간 |
| PortfolioPage FollowListModal COLORS 토큰화 | 웹 | 30분 |
| PhotoDetailPage 데스크탑 래퍼 배경 수정 | 웹 | 1시간 |
| AppNavigator.js COLORS 토큰화 | 모바일 | 30분 |

> **디자이너 검토 반영**: `PhotoDetailPage`는 원래 P1이었으나, 화이트로 전환된 GalleryPage에서 진입 시 전체 뷰포트가 순간적으로 `#0e0e0e`로 바뀌는 충격이 커 P0로 상향했다(이미지 섹션 자체는 다크 유지 — 래퍼만 수정). 근거: `DESIGN_PROMPT_web-cosmos-completion.md` 2절.

### P1 — 단기 (1~2주)

| 항목 | 플랫폼 | 예상 공수 |
|------|--------|---------|
| GalleryPage 768~1024px 3컬럼 브레이크포인트 | 웹 (태블릿) | 30분 |
| 브레이크포인트 상수 파일 생성 (`constants/breakpoints.js`) | 웹 | 1시간 |
| ExploreScreen 장르 필터 추가 | 모바일 | 3~4시간 |
| SeriesScreen 3장 콜라주 카드 | 모바일 | 2~3시간 |

### P2 — 중기 (1개월)

| 항목 | 플랫폼 | 예상 공수 |
|------|--------|---------|
| 모바일 Meets 화면 (MeetsScreen + MeetDetailScreen) | 모바일 | 2~3일 |
| 전체 브레이크포인트 상수 파일 기반으로 통일 리팩토링 | 웹 (전체) | 반나절 |

> **디자이너 검토 반영**: "PhotoDetailPage 태블릿 레이아웃 개선"과 "Header 태블릿 UX 결정"은 P2에서 제외했다. 검토 결과 PhotoDetailPage는 태블릿에서도 가로 2분할 구조를 유지하는 것이 맞고(이미지 섹션 비율만 58%→52%로 소폭 조정, P1에 흡수), Header는 현행 768px 이분법을 유지하는 것으로 결론 내렸다(아이패드는 세로/가로가 정확히 768/1024px로 고정되어 있어 중간 폭이 실사용에 존재하지 않음). 결정 근거 전문은 `DESIGN_PROMPT_tablet-breakpoint-system.md` 3~4절 참조.

---

## 10. 성공 지표 (KPI)

- **디자인 일관성**: Lighthouse CLS(Cumulative Layout Shift) — FeedPage 전환 후 CLS 0.1 이하 유지
- **태블릿 커버리지**: 768~1024px Chrome DevTools 기준 5개 핵심 페이지(Gallery, Explore, PhotoDetail, PortfolioPage, FeedPage)에서 레이아웃 깨짐 0건
- **모바일 앱 기능 격차**: 웹 핵심 탐색 기능(장르 필터) 모바일 앱 반영 완료
- **코드 품질**: glass.js import 수 0개 (현재 FeedPage 1곳) — 폐기 모듈 완전 제거

---

## 11. 관련 파일

### 웹 (즉시 수정 대상)
- `frontend/src/pages/FeedPage.jsx` — glass.js 제거, Cosmos 카드 전환
- `frontend/src/pages/PhotoDetailPage.jsx` — 데스크탑 래퍼 배경 수정
- `frontend/src/pages/PortfolioPage.jsx` — FollowListModal 토큰화
- `frontend/src/pages/GalleryPage.jsx` — 1024px 브레이크포인트 추가
- `frontend/src/constants/colors.js` — AKIRA 컬러 토큰 (변경 없음, 참조용)

### 신규 생성
- `frontend/src/constants/breakpoints.js` — 브레이크포인트 상수 (신규)

### 모바일 앱 (단기 수정 대상)
- `mobile/src/navigation/AppNavigator.js` — COLORS 토큰화
- `mobile/screens/ExploreScreen.js` — 장르 필터 추가
- `mobile/screens/SeriesScreen.js` — 3장 콜라주 카드 UI

### 관련 기획/디자인 문서
- `DESIGN_PROMPTS/design/DESIGN_PROMPT_cosmos-light-theme.md` — 화이트 테마 전환 결정 사항 (1차)
- `DESIGN_PROMPTS/design/DESIGN_PROMPT_akira-neo-tokyo-concept.md` — AKIRA 컬러 시스템
- `DESIGN_PROMPTS/design/DESIGN_PROMPT_cosmos-board-and-nav.md` — 보드 카드 + 필 네비
- `DESIGN_PROMPTS/design/DESIGN_PROMPT_web-cosmos-completion.md` — 웹 2차 완성 (본 기획서 기반 디자인 상세, P0 상향 근거 포함)
- `DESIGN_PROMPTS/design/DESIGN_PROMPT_mobile-design-parity.md` — 모바일 AKIRA 통일 + 장르필터·Meets 화면 디자인 상세
- `DESIGN_PROMPTS/design/DESIGN_PROMPT_tablet-breakpoint-system.md` — 태블릿 브레이크포인트 디자인 상세, Header 결정 근거
- `DESIGN_PROMPTS/planning/35_MODEL_MEET_PLANNING.md` — 모바일 Meets 기획 참조
- `DESIGN_PROMPTS/planning/26_GENRE_CLASSIFICATION.md` — 장르 시스템 기획 참조
