# PLAN — 3-플랫폼 UI/UX 개선 (웹 데스크탑 / 모바일 앱 / 아이패드·태블릿)
> Feature 38 | 2026-09-04 | PM: Claude
> 선행 문서: `PLANNING_multiplatform-uiux-improvement.md` (2026-08-23, AKIRA/Cosmos 시대 — 해당 이슈는 Toss 전환으로 해소됨. 이 문서가 Toss 기반 최신 진단으로 대체)

---

## 개요

Toss 디자인 시스템 전환이 완료된 현재 상태에서, 세 플랫폼의 실제 코드를 직접 확인해 발견한 구체적 격차를 근거로 다음 개선 우선순위를 정의한다. 격차의 핵심은 **컬러(이미 일치)**가 아니라 **컴포넌트 미공통화, 반응형 적용 불균일, 모바일 로딩/빈상태 UX, 플랫폼 간 기능 불균형**이다.

---

## 코드 기반 현황 진단 (2026-09-04 실측)

### 반응형 브레이크포인트 적용 현황

`frontend/src/constants/breakpoints.js`에 3단 토큰이 정의되어 있으나, 실제 사용은 극히 제한적이다.

| 파일 수 | mq.* 사용 | 상태 |
|--------|-----------|------|
| 35개 pages/*.jsx | 5개 파일만 사용 | **불균일** |
| 컴포넌트 포함 전체 | 9개 파일만 사용 | **심각한 격차** |

`mq.*` 사용 파일:
- `GalleryPage.jsx` — `mq.tablet`으로 3컬럼 마소닉 (정상)
- `ExplorePage.jsx` — `mq.tablet`으로 3컬럼 (정상)
- `Header.jsx`, `AdminLayout.jsx` — `mq.tabletUp`으로 PC/모바일 2단 전환 (정상)
- `TemplateEditorial.jsx`, `TemplateMinimal.jsx` — 포트폴리오 마소닉 (정상)
- `GatheringAlbumPage.jsx`, `GatheringsPage.jsx`, `GatheringNotificationsPage.jsx` — Gathering 기능 한정

반응형 없는 주요 페이지 (진단): `ProfilePage.jsx`, `FeedPage.jsx`, `MeetsPage.jsx`, `MeetDetailPage.jsx`, `BookingDashboard.jsx`, `DeliveriesPage.jsx`, `ListPage.jsx`, `SeriesPage.jsx`, `InquiryInboxPage.jsx`, `PhotoDetailPage.jsx`(BP 직접 비교만, `mq.*` 미사용), `PhotoFormPage.jsx`, `GatheringFormPage.jsx` 등 30개 이상.

### Skeleton 컴포넌트 현황

`Skeleton.jsx`가 존재하고 13개 파일에서 사용 중이나:
- 색상 토큰이 구 Cosmos 팔레트(`#ededf4`, `#1a1a3a`) 하드코딩 → Toss 토큰으로 교체 필요
- `GalleryPage`, `ExplorePage`, `FeedPage` 등 주요 비동기 화면 일부만 적용, 나머지는 미적용

### 모바일 로딩/빈상태 현황

- 로딩: `ActivityIndicator` 하드코딩, shimmer skeleton 없음 (전 화면)
- 빈상태: 단순 `Text` 문자열 (`GalleryScreen`, `FeedScreen` 등)
- Pull-to-refresh: `FeedScreen`, `ExploreScreen`, `GatheringsScreen`, `SeriesScreen` 적용. `GalleryScreen`, `ProfileScreen`, `MeetDetailScreen` 미적용

### 웹-모바일 기능 격차

모바일 앱에 없는 웹 기능:
- 이미지 에디터 (`/editor`) — 모바일 미구현
- 클라이언트 납품 포털 (`/deliveries`, `/proof/:token`) — 미구현
- 예약 대시보드 (`/bookings`) — 미구현
- 분석 대시보드 (ProfilePage 분석 탭) — 미구현
- 어드민 패널 (`/admin/**`) — 의도적 제외(OK)
- 모임 달력(`/gatherings/calendar`), 알림(`/gatherings/notifications`) — 미구현
- 신고 내역 (`MyReportsPage`) — 미구현

---

## 섹션 A — 웹 데스크탑

### A-1. 공통 Button 컴포넌트 (P1, 기존 로드맵 P1_02)

#### 사용자 문제
- 현재 상황: 각 페이지/컴포넌트가 inline style로 버튼을 독립 구현. 동일한 기본 버튼이 `FeedPage`, `MeetsPage`, `BookingDashboard`, `ProfilePage` 등 모든 곳에서 다른 height, borderRadius, fontWeight를 가짐.
- Pain Point: hover/focus/active/disabled 4가지 인터랙션 상태가 개별 구현에서 누락되거나 불일치. 키보드 사용자(Tab 탐색) 포커스 링이 일관되지 않아 접근성 미준수.
- 해결 후 기대 효과: 단일 `<Button>` 컴포넌트로 모든 CTA를 표준화해 코드 중복 제거, 인터랙션 상태 일관성 확보, 접근성 자동 보장.

#### 사용자 페르소나
| 페르소나 | 목표 | 현재 불편함 |
|---------|------|------------|
| 사진작가 (업로더) | 등록·수정·삭제 버튼을 직관적으로 구분하고 싶다 | 버튼마다 크기와 색이 달라 어느 것이 주 액션인지 불명확 |
| 키보드 사용자 | Tab키로 버튼을 탐색하고 Enter로 실행하고 싶다 | 포커스 아웃라인이 없어 현재 위치를 알 수 없음 |

#### 유저 스토리
- As a **사진작가**, I want **일관된 시각적 위계를 가진 버튼**을 원하는데, so that **어느 버튼이 주요 액션인지 즉시 알 수 있다**.
- As a **키보드 사용자**, I want **Tab 탐색 시 명확한 포커스 표시**를 원하는데, so that **마우스 없이도 앱을 완전히 사용할 수 있다**.
- As a **개발자**, I want **variant/size prop 하나로 버튼을 선언**하고 싶은데, so that **매 화면마다 inline style 버튼을 새로 만들지 않아도 된다**.

#### 수용 기준 (AC)
- [ ] AC1: `<Button variant="primary|secondary|ghost|danger" size="sm|md|lg" loading disabled>` prop을 지원한다
- [ ] AC2: `primary` — `#3182F6` solid, `secondary` — `border 1px solid #3182F6` outline, `ghost` — 테두리 없음, `danger` — `#F04452` solid
- [ ] AC3: hover(brightness 5% 조정), focus(0 0 0 3px rgba(49,130,246,0.25) 링), active(scale 0.98), disabled(opacity 0.4 + pointer-events none) 4상태 모두 구현
- [ ] AC4: `loading=true` 시 텍스트를 `…` 점 애니메이션으로 교체하고 클릭 차단
- [ ] AC5: 외부 라이브러리 없이 inline style만으로 구현
- [ ] AC6: 기존 코드의 버튼 중 `ProfilePage`, `FeedPage`, `MeetsPage` 3개 페이지에 우선 적용해 회귀 없음 확인

#### In Scope
- 3가지 variant, 3가지 size, loading, disabled
- hover/focus/active/disabled 4상태
- `frontend/src/components/common/Button.jsx` 신규 생성

#### Out of Scope
- 아이콘 버튼 (IconButton) — 다음 버전
- 버튼 그룹 (ButtonGroup) — 다음 버전
- 모바일 앱 Button 컴포넌트 — 별도 작업(섹션 B 참조)

#### 기술 트레이드오프
| 옵션 | 장점 | 단점 | 결정 |
|-----|------|------|------|
| CSS Modules | 클래스 충돌 없음 | 프로젝트 규칙상 inline style 원칙 위반 | ❌ |
| inline style + onMouseEnter/Leave | 기존 패턴 일치, 라이브러리 없음 | CSS pseudo-class(:focus-visible) 직접 지원 불가 → `<style>` 태그로 보완 | ✅ |

#### 우선순위: P1 (1~2주)
#### 기술 부채 vs 비즈니스 임팩트: 단일 컴포넌트로 전체 버튼 표준화는 구현 후 모든 신규 개발 속도를 높이는 레버리지 작업. 접근성 리스크를 즉시 해소한다.

---

### A-2. 공통 Input / FormField 컴포넌트 (P1, 기존 로드맵 P1_03)

#### 사용자 문제
- 현재 상황: `LoginPage`, `SignUpPage`, `ProfilePage`, `GatheringFormPage` 등 모든 폼이 각자 inputStyle 객체를 인라인으로 선언. 동일 역할의 필드가 서로 다른 border, padding, borderRadius를 가짐.
- Pain Point: 에러 상태 표시(붉은 테두리 + 에러 메시지)가 화면마다 없거나 다른 방식으로 구현됨.

#### 유저 스토리
- As a **사진작가**, I want **폼 입력 오류 시 어느 필드가 문제인지 즉시 알고 싶다**, so that **수정해야 할 곳을 찾아 헤매지 않아도 된다**.
- As a **개발자**, I want **`<FormField label error helperText>` 하나로 레이블+입력+에러를 묶어 쓰고 싶다**, so that **폼 구현 시간을 단축할 수 있다**.
- As a **스크린리더 사용자**, I want **입력 필드와 레이블이 올바르게 연결되어 있기를 원한다**, so that **어떤 정보를 입력해야 하는지 알 수 있다**.

#### 수용 기준 (AC)
- [ ] AC1: `<Input type placeholder value onChange disabled error>` — 기본 텍스트 입력
- [ ] AC2: `<Textarea>` — 동일 스타일 텍스트에어리어
- [ ] AC3: `<FormField label required error helperText>` — 레이블+입력+에러 메시지 래퍼 (htmlFor 자동 연결)
- [ ] AC4: focus 상태: `border-color: #3182F6` + 포커스 링 (ring 2px)
- [ ] AC5: error 상태: `border-color: #F04452` + 에러 메시지 표시 (`color: #F04452`)
- [ ] AC6: `aria-invalid`, `aria-describedby` 등 WCAG 2.1 AA 필수 속성 포함

#### In Scope
- Input, Textarea, FormField 래퍼
- focus/error/disabled 상태

#### Out of Scope
- Select, Radio, Checkbox, DatePicker — 다음 버전

#### 우선순위: P1
#### 기술 부채 vs 비즈니스 임팩트: 접근성 개선 직결. 폼이 많은 사진작가 중심 앱에서 입력 UX의 일관성은 이탈률 감소에 직접 기여한다.

---

### A-3. Skeleton 색상 토큰 업데이트 (P1)

#### 사용자 문제
- 현재 상황: `Skeleton.jsx`의 shimmer gradient가 구 Cosmos 팔레트(`#ededf4`/`#f5f5fa` 라이트, `#1a1a3a`/`#22223e` 다크) 하드코딩. Toss `#F2F4F6`/`#ffffff` 배경과 경계가 어색하게 보임.
- Pain Point: 로딩 중 스켈레톤 배경색과 실제 카드 배경색이 달라 깜빡임(flash) 발생.

#### 유저 스토리
- As a **방문자**, I want **로딩 중 화면이 자연스럽게 보이길 원한다**, so that **콘텐츠가 로드될 때까지 어색한 색 전환 없이 기다릴 수 있다**.
- As a **사진작가**, I want **갤러리 로딩 스켈레톤이 실제 카드와 같은 배경색으로 보이길 원한다**, so that **레이아웃 점프 없이 자연스러운 로딩 경험을 얻는다**.

#### 수용 기준 (AC)
- [ ] AC1: 라이트 shimmer: `linear-gradient(90deg, #E5E8EB 25%, #F2F4F6 50%, #E5E8EB 75%)` (Toss border/bg 토큰 활용)
- [ ] AC2: 다크 shimmer (이미지 뷰어 전용): `linear-gradient(90deg, #1A1E22 25%, #22262B 50%, #1A1E22 75%)` (Toss dark 토큰 활용)
- [ ] AC3: `SkeletonGalleryCard`, `SkeletonFeedCard` 두 variant 모두 업데이트
- [ ] AC4: `GalleryPage`, `ExplorePage`, `FeedPage`, `GatheringsPage` — 4개 주요 비동기 화면에서 Skeleton 적용 여부 확인. 미적용 화면은 적용

#### In Scope
- `Skeleton.jsx` 색상 하드코딩 → Toss 토큰 정렬
- 주요 4개 페이지 skeleton 적용 확인/추가

#### Out of Scope
- 새로운 Skeleton variant 추가

#### 우선순위: P1
#### 기술 부채 vs 비즈니스 임팩트: 코드 변경 범위가 작고(1개 파일 + 적용 확인) 시각적 완성도를 즉시 높인다.

---

### A-4. 주요 데스크탑 페이지의 최대 너비 제한 및 2컬럼 레이아웃 (P1)

#### 사용자 문제
- 현재 상황: `ProfilePage`, `FeedPage`, `MeetsPage`, `BookingDashboard`, `DeliveriesPage`, `SeriesPage`, `InquiryInboxPage` 등은 `maxWidth`를 제한하거나 태블릿/데스크탑에서 공간 활용 레이아웃이 없다. 1440px 데스크탑에서는 단일 컬럼 카드들이 800px 이상의 너비로 늘어나 가독성이 저하된다.
- Pain Point: 넓은 화면에서 텍스트 행 길이가 과도하게 길어지고(75자 이상), 카드가 불필요하게 늘어나 "미완성 앱"처럼 보인다.

#### 유저 스토리
- As a **데스크탑 사용자**, I want **피드와 리스트 화면에서 콘텐츠가 적절한 너비로 중앙 정렬되기를 원한다**, so that **가독성 좋게 내용을 소비할 수 있다**.
- As a **사진작가**, I want **예약 대시보드에서 목록과 상세를 같은 화면에서 볼 수 있기를 원한다**, so that **클릭 없이 내용을 파악할 수 있다**.

#### 수용 기준 (AC)
- [ ] AC1: `FeedPage` — 콘텐츠 컨테이너 `maxWidth: 680px`, 데스크탑(≥1024px)에서 좌우 auto 마진으로 중앙 정렬
- [ ] AC2: `MeetsPage` — 데스크탑에서 목록(좌) 320px + 미리보기 패널(우) flex-1 2컬럼 레이아웃
- [ ] AC3: `InquiryInboxPage` — `maxWidth: 800px` 중앙 정렬
- [ ] AC4: `BookingDashboard` — 데스크탑에서 탭 목록(좌) + 예약 상세 패널(우) 2컬럼
- [ ] AC5: `SeriesPage` — 데스크탑에서 그리드 3컬럼 유지 (이미 마소닉이면 확인 후 유지)
- [ ] AC6: 모바일(< 768px)에서는 단일 컬럼 유지 — 기존 레이아웃 회귀 없음
- [ ] AC7: Toss 플랫 서페이스 정책 위반 없음 — blur/glassmorphism 추가 금지

#### In Scope
- FeedPage, MeetsPage, InquiryInboxPage, BookingDashboard의 데스크탑 레이아웃 조정
- maxWidth 제한 + 중앙 정렬 (모든 페이지)

#### Out of Scope
- 2컬럼 패널에 별도 라우팅/URL 변경
- DeliveriesPage, ProfilePage 태블릿 레이아웃 (섹션 C에서 다룸)

#### 기술 트레이드오프
| 옵션 | 장점 | 단점 | 결정 |
|-----|------|------|------|
| CSS Grid `grid-template-columns` | 정교한 레이아웃 | `<style>` 태그 필요 | ✅ (style 태그 주입 기존 관례) |
| flexbox | 기존 코드와 일치 | 고정/유동 혼합 시 `flex-basis` 계산 필요 | ✅ 병행 가능 |

#### 우선순위: P1
#### 기술 부채 vs 비즈니스 임팩트: 데스크탑 이용자(추정 트래픽 60% 이상)의 시각적 완성도를 직접 개선한다. 구현 비용은 낮으나 임팩트는 크다.

---

### A-5. 인터랙션 상태(hover/focus/active) 일관성 점검 (P2)

#### 사용자 문제
- 현재 상황: `FeedPage.jsx` hover 관련 코드가 1건뿐. 일부 카드는 `onMouseEnter/Leave`로 transform 애니메이션이 있고, 일부는 없다.
- Pain Point: 클릭 가능 영역이 어디인지 예측 불가능하다.

#### 유저 스토리
- As a **모든 사용자**, I want **클릭 가능한 모든 요소가 hover 시 시각적 피드백을 제공하기를 원한다**, so that **인터랙티브 요소를 즉시 인지할 수 있다**.
- As a **키보드 사용자**, I want **모든 인터랙티브 요소가 focus 시 명확한 아웃라인을 표시하기를 원한다**, so that **Tab 탐색 중 현재 위치를 파악할 수 있다**.

#### 수용 기준 (AC)
- [ ] AC1: 클릭 가능한 카드(PhotoCard, FeedCard, MeetCard, GatheringCard): hover 시 `translateY(-2px)` + `box-shadow: 0 4px 16px rgba(0,0,0,0.08)` 일관 적용
- [ ] AC2: 링크/버튼: focus-visible 시 `outline: 2px solid #3182F6; outline-offset: 2px` (전역 `global.css` 설정 확인, 미설정 시 추가)
- [ ] AC3: 위험(danger) 버튼/액션: focus 링 `rgba(240,68,82,0.25)` 사용
- [ ] AC4: `transition: transform 0.15s ease, box-shadow 0.15s ease` 값 표준화 (현재 0.2s, 0.15s, 0.3s 혼재)

#### In Scope
- 전역 focus-visible 규칙 (`global.css`)
- 카드 hover 표준 정의

#### Out of Scope
- 개별 버튼 상태 (A-1에서 다룸)

#### 우선순위: P2
#### 기술 부채 vs 비즈니스 임팩트: 접근성 의무(WCAG 2.1 AA) 이행과 직결. 법적 리스크 대비 구현 비용이 낮다.

---

### A-6. 빈상태(EmptyState) 컴포넌트 일관화 (P2, 기존 로드맵 P0 — 부분 구현)

#### 사용자 문제
- 현재 상황: `DotEmptyState` 컴포넌트가 존재하나 적용 범위가 불균일. `FeedPage`에는 `DotEmptyState` 적용됨, 그러나 `MeetsPage`, `BookingDashboard`, `InquiryInboxPage`는 단순 `<p>` 텍스트.

#### 유저 스토리
- As a **신규 사진작가**, I want **처음 앱을 켰을 때 빈 화면 대신 다음 할 일을 안내받고 싶다**, so that **무엇을 해야 할지 막막하지 않다**.

#### 수용 기준 (AC)
- [ ] AC1: `MeetsPage` 빈 목록: "아직 약속이 없습니다. 작가/모델을 검색해 첫 약속을 요청해보세요." + CTA 버튼
- [ ] AC2: `BookingDashboard` 탭별 빈 상태: 탭에 맞는 안내 문구 + 예약 설정 바로가기 링크
- [ ] AC3: `InquiryInboxPage` 빈 상태: "받은 문의가 없습니다. 포트폴리오를 공유해 첫 문의를 받아보세요."
- [ ] AC4: `DotEmptyState` 컴포넌트를 재사용하거나, `icon + title + description + action?` 구조의 공통 `EmptyState` 컴포넌트로 통합

#### 우선순위: P2
#### 기술 부채 vs 비즈니스 임팩트: 신규 사용자 온보딩 이탈을 방지. 구현 비용 낮음.

---

## 섹션 B — 모바일 앱

### B-1. Skeleton 로딩 컴포넌트 도입 (P1)

#### 사용자 문제
- 현재 상황: 모든 모바일 화면이 `ActivityIndicator` 스피너만 사용. 웹은 shimmer skeleton 카드가 있어 레이아웃 점프 없이 로딩됨.
- Pain Point: 스피너는 "얼마나 기다려야 하는가"를 알 수 없어 체감 대기 시간이 길다. 콘텐츠 형태를 예상할 수 없어 레이아웃 점프가 심하다.

#### 페르소나
| 페르소나 | 목표 | 현재 불편함 |
|---------|------|------------|
| 모델 (탐색자) | 빠르게 포트폴리오를 탐색하고 싶다 | 갤러리 탭 진입 시 빈 화면 + 스피너가 0.5~1초 이상 보여 이탈 충동 |
| 사진작가 | 내 피드를 빠르게 확인하고 싶다 | FeedScreen 로딩 중 레이아웃이 점프해 UX가 어색하다 |

#### 유저 스토리
- As a **탐색 중인 모델**, I want **사진 목록이 로딩 중일 때 카드 형태의 플레이스홀더를 보고 싶다**, so that **내용이 곧 나타남을 알고 기다릴 수 있다**.
- As a **사진작가**, I want **피드 화면이 스크롤 가능한 레이아웃으로 먼저 나타나길 원한다**, so that **로딩 완료 후 레이아웃 점프가 없다**.
- As a **모바일 사용자**, I want **로딩 상태가 웹과 동일하게 자연스럽기를 원한다**, so that **어느 플랫폼에서나 같은 품질의 경험을 얻는다**.

#### 수용 기준 (AC)
- [ ] AC1: `mobile/components/SkeletonCard.js` 신규 생성 — RN `Animated` API 기반 opacity 펄스(0.4→1→0.4, 1.2s ease-in-out loop) 또는 단순 회색 placeholder 박스
- [ ] AC2: `ExploreScreen` — 2컬럼 그리드에 맞는 `SkeletonPhotoCard` 4~6개 표시
- [ ] AC3: `FeedScreen` — `SkeletonFeedCard` 3개 표시
- [ ] AC4: `GatheringsScreen` — `SkeletonGatheringCard` 2개 표시
- [ ] AC5: 로딩 완료 후 skeleton이 실제 카드로 자연스럽게 교체됨 (opacity fade: 0.2s)
- [ ] AC6: Toss `COLORS.border`(#E5E8EB) 기반 색상 사용

#### In Scope
- SkeletonCard 컴포넌트 (photo용, feed용)
- ExploreScreen, FeedScreen, GatheringsScreen 적용

#### Out of Scope
- MeetsScreen, SeriesScreen, ProfileScreen — 다음 배치
- 복잡한 shimmer gradient (opacity 펄스로 대체)

#### 기술 트레이드오프
| 옵션 | 장점 | 단점 | 결정 |
|-----|------|------|------|
| `react-native-skeleton-placeholder` 라이브러리 | gradient shimmer 바로 가능 | 외부 라이브러리 추가 — 기존 규칙 위반 | ❌ |
| RN `Animated` opacity 펄스 | 의존성 없음, 가벼움 | shimmer gradient 없음 (opacity만) | ✅ |

#### 우선순위: P1
#### 기술 부채 vs 비즈니스 임팩트: 체감 로딩 속도가 개선되어 이탈률 감소에 직접 기여. 외부 라이브러리 없이 구현 가능.

---

### B-2. Pull-to-refresh 전체 화면 일관화 (P1)

#### 사용자 문제
- 현재 상황: `FeedScreen`, `ExploreScreen`, `GatheringsScreen`, `SeriesScreen` 4개는 `RefreshControl`/`onRefresh` 있음. `GalleryScreen`, `ProfileScreen` 등은 없음.
- Pain Point: 모바일 사용자의 최우선 새로고침 방법(당겨서 새로고침)이 일부 화면에서 동작하지 않아 앱을 재실행하거나 탭을 다시 탭해야 함.

#### 유저 스토리
- As a **모바일 사용자**, I want **모든 목록 화면에서 아래로 당겨 새로고침할 수 있기를 원한다**, so that **앱 재실행 없이 최신 데이터를 볼 수 있다**.
- As a **사진작가**, I want **내 갤러리 탭에서 당겨서 새로고침으로 방금 등록한 사진을 확인하고 싶다**, so that **업로드 성공 여부를 빠르게 확인할 수 있다**.

#### 수용 기준 (AC)
- [ ] AC1: `GalleryScreen` — ScrollView를 FlatList로 전환 후 `RefreshControl` 추가 (tintColor: `COLORS.primary`)
- [ ] AC2: `ProfileScreen` 내 사진 탭 — 당겨서 새로고침 시 photos + stats 동시 재로드
- [ ] AC3: `MeetsScreen` — 이미 `refreshing` 상태가 있으나 RefreshControl이 FlatList에 연결됐는지 확인
- [ ] AC4: 새로고침 완료 시 스피너 자동 해제 (0.5s 최소 표시)

#### In Scope
- GalleryScreen, ProfileScreen pull-to-refresh 추가

#### Out of Scope
- MeetDetailScreen (탭 구조라 pull-to-refresh가 UX상 부적합)

#### 우선순위: P1
#### 기술 부채 vs 비즈니스 임팩트: 모바일 기본 제스처 패턴 이행. 기존 RefreshControl 패턴 복사로 구현 비용 낮음.

---

### B-3. 모바일 빈상태 EmptyState 컴포넌트 도입 (P1)

#### 사용자 문제
- 현재 상황: `GalleryScreen`은 `<Text>등록된 사진이 없습니다.</Text>` 단순 문자열. 웹의 `DotEmptyState`처럼 시각적 안내가 없다.

#### 유저 스토리
- As a **신규 사용자**, I want **빈 화면에서 다음 행동을 안내받고 싶다**, so that **앱 사용법을 스스로 발견할 수 있다**.
- As a **사진작가**, I want **갤러리가 비어있을 때 사진 등록 버튼으로 바로 이동할 수 있기를 원한다**, so that **탭을 찾아 헤매지 않아도 된다**.

#### 수용 기준 (AC)
- [ ] AC1: `mobile/components/EmptyState.js` 신규 생성 — `{ icon, title, description, actionLabel, onAction }` props
- [ ] AC2: 배경: `COLORS.bg(#F2F4F6)`, 아이콘: 이모지 48pt, 제목: `COLORS.textSecondary`, 액션 버튼: `COLORS.primary` solid
- [ ] AC3: `GalleryScreen`: "아직 사진이 없어요 / + 사진 등록하기" EmptyState
- [ ] AC4: `FeedScreen` 팔로우 없을 때: "팔로우한 작가가 없습니다 / 탐색 화면에서 작가를 찾아보세요"
- [ ] AC5: `MeetsScreen` 약속 없을 때: "아직 약속이 없어요 / + 약속 요청하기"

#### 우선순위: P1
#### 기술 부채 vs 비즈니스 임팩트: 온보딩 이탈 방지 + 기능 발견성 향상. 구현 비용 매우 낮음.

---

### B-4. 웹-모바일 기능 불균형 해소 — 1차 (P2)

현재 웹에 있으나 모바일에 없는 기능 중 모바일 사용성이 높은 것부터 우선순위를 정한다.

#### B-4-A. 예약 조회 화면 (BookingMobileScreen) — P2

- 현재: 웹 `BookingDashboard`만 존재. 모바일에서 예약 조회 불가.
- 제안: 읽기 전용 예약 목록 (`getMyBookings`) + 확정/거절 액션 카드. 설정(AvailabilityModal)은 모바일 미포함(복잡도 높음).

#### 유저 스토리
- As a **사진작가(모바일 사용자)**, I want **이동 중에도 새로 들어온 예약 요청을 확인하고 싶다**, so that **빠르게 응답할 수 있다**.

#### 수용 기준 (AC)
- [ ] AC1: `mobile/screens/BookingScreen.js` 신규 생성 — `getMyBookings` 상태별 섹션
- [ ] AC2: 예약 확정/거절 액션 버튼 (Alert 확인 포함)
- [ ] AC3: `AppNavigator.js` ProfileTab 또는 `ProfileScreen` 메뉴 섹션에서 접근
- [ ] AC4: 가용 시간 설정 링크 → 웹으로 deep-link 안내 (모바일 UI 설정 화면 없음)

#### B-4-B. 납품 포털 수신 확인 (DeliveryNotificationScreen) — P2

- 현재: 웹 `ClientDeliveryPage`(클라이언트 뷰)와 `DeliveriesPage`(작가 뷰)만 존재.
- 제안: 작가 전용 납품 세트 목록만 먼저 (토큰 링크 복사, 승인/거절 상태 확인). 납품 세트 생성(사진 선택 UI)은 P3.

#### 수용 기준 (AC)
- [ ] AC1: `getMyList()`로 납품 세트 목록 표시
- [ ] AC2: 상태 배지(PENDING/APPROVED/REJECTED) + 클라이언트 이름/날짜
- [ ] AC3: 링크 복사 버튼 (`Clipboard.setStringAsync(token)`)

#### B-4-C. Gathering 달력 및 알림 진입점 (P2)

- 현재: `GatheringCalendarPage`, `GatheringNotificationsPage` 웹만 구현.
- 제안: `GatheringsScreen`에 "달력" 버튼 추가 → 웹 달력으로 deep-link. 알림은 `ProfileScreen` 메뉴 섹션에 배지 추가.

#### 수용 기준 (AC)
- [ ] AC1: `GatheringsScreen` 헤더 우상단 "🔔 알림" 배지 버튼 추가 (`gatheringApi.getUnreadCount()` 폴링)
- [ ] AC2: 알림 목록 → 웹 URL 딥링크 (`Linking.openURL`)

#### 우선순위: B-4 전체 P2 (1개월)
#### 기술 부채 vs 비즈니스 임팩트: 모바일 사용자가 예약·납품을 확인하지 못해 웹으로 전환하는 마찰 해소. 백엔드 API는 이미 완성되어 있어 프론트엔드만 구현하면 됨.

---

### B-5. GalleryScreen 레이아웃 단순화 (P2)

#### 사용자 문제
- 현재 상황: `GalleryScreen.js`가 웹의 `packRows()` 12-컬럼 flexbox 알고리즘을 그대로 사용. 모바일 390px 화면에서 `gridColSpan` 기반 비율 분배가 의도대로 동작하지 않아 1px 이미지나 0px 이미지가 생길 수 있음.
- Pain Point: 모바일에서는 단순 2컬럼 masonry가 더 자연스럽고 성능 좋음.

#### 유저 스토리
- As a **사진작가**, I want **모바일 갤러리에서 내 사진들이 균일하게 표시되기를 원한다**, so that **어느 사진도 잘리거나 왜곡되지 않는다**.

#### 수용 기준 (AC)
- [ ] AC1: `GalleryScreen.js` — `packRows` 알고리즘 제거, FlatList `numColumns=2` 또는 두 컬럼 FlatList로 대체
- [ ] AC2: 세로 비율을 유지하는 방식: `aspectRatio` 또는 고정 height 150px (CLAUDE.md 기존 ExploreScreen 패턴 참조)
- [ ] AC3: 기존 `PhotoCard` 컴포넌트 재사용
- [ ] AC4: 기능(사진 상세 이동) 회귀 없음

#### 우선순위: P2
#### 기술 부채 vs 비즈니스 임팩트: packRows는 웹 전용 알고리즘. 모바일에 강제 적용하면 레이아웃 버그 발생 가능성이 높다.

---

## 섹션 C — 아이패드/태블릿 반응형

### C-1. 실제 브레이크포인트 적용 현황 요약

코드 기반 진단 결과:
- `mq.tablet` (768~1023px) 실제 사용: `GalleryPage` 3컬럼, `ExplorePage` 3컬럼 — **이 2개가 전부**
- `mq.tabletUp` (≥768px): Header PC/모바일 분기, AdminLayout 사이드바 분기 — **레이아웃 목적으로만 사용**
- 나머지 30개+ 페이지는 태블릿 구간에서 모바일 레이아웃 그대로 렌더링됨
- `PhotoDetailPage`는 `BP.md`/`BP.lg` 직접 비교로 state 기반 분기(유일한 진짜 태블릿 레이아웃 구현 사례)

태블릿 전용 레이아웃 적용 임팩트 순위 (트래픽 × 레이아웃 개선 여지):

| 순위 | 페이지 | 현재 태블릿 레이아웃 | 개선 기회 |
|-----|--------|-------------------|---------|
| 1 | ProfilePage (6탭) | 단일 컬럼, 탭이 화면 너비 가득 | 좌: 프로필 카드 고정, 우: 탭 콘텐츠 |
| 2 | FeedPage | 단일 컬럼 680px 중앙 | 2컬럼 카드 그리드 (768~1023px) |
| 3 | MeetDetailPage | 탭 전체 너비 | 상단 고정 미트 정보 + 탭 콘텐츠 영역 확대 |
| 4 | PhotoFormPage | 단일 컬럼 | 좌: 이미지 프리뷰, 우: 메타데이터 폼 |
| 5 | GatheringFormPage | 단일 컬럼 | 좌: 기본 정보, 우: 날짜/장소 설정 |

---

### C-2. ProfilePage 태블릿 2컬럼 레이아웃 (P1)

#### 사용자 문제
- 현재 상황: `ProfilePage.jsx`는 768px 이상에서도 단일 컬럼. 태블릿(iPad 820px)에서 아바타, 통계, 7개 탭이 한 컬럼으로 좁게 표시됨.
- Pain Point: 태블릿의 가로 공간을 전혀 활용하지 않아 불필요한 세로 스크롤이 발생한다.

#### 유저 스토리
- As a **iPad 사용 사진작가**, I want **프로필 화면에서 내 정보와 갤러리를 동시에 볼 수 있기를 원한다**, so that **스크롤 없이 한눈에 현황을 파악할 수 있다**.

#### 수용 기준 (AC)
- [ ] AC1: 태블릿(768~1023px): 좌 패널(프로필 카드 + 통계 + 탭 네비) 260px 고정 + 우 패널(탭 콘텐츠) flex-1
- [ ] AC2: 데스크탑(≥1024px): 좌 패널 300px 고정 + 우 패널 flex-1
- [ ] AC3: 모바일(< 768px): 기존 단일 컬럼 유지
- [ ] AC4: 탭 네비게이션을 모바일에서는 수평 스크롤, 태블릿/데스크탑에서는 좌 패널 수직 메뉴로 전환
- [ ] AC5: `mq.tablet` 및 `mq.tabletUp` 토큰 사용 (BP 직접 비교 금지)

#### 기술 트레이드오프
| 옵션 | 장점 | 단점 | 결정 |
|-----|------|------|------|
| CSS Grid | 좌 고정 + 우 유동 정확히 표현 | `<style>` 태그 필요 | ✅ |
| window.innerWidth + state | PhotoDetailPage 기존 방식 | resize 이벤트 누락 가능 | ❌ (mq 우선) |

#### 우선순위: P1
#### 기술 부채 vs 비즈니스 임팩트: 사진작가가 가장 많이 사용하는 화면. iPad에서 작업 효율 직접 개선.

---

### C-3. FeedPage 태블릿 2컬럼 카드 그리드 (P1)

#### 사용자 문제
- 현재 상황: 데스크탑 maxWidth 680px 제한(A-4에서 추가 예정)을 적용해도 태블릿에서는 여전히 단일 컬럼.
- Pain Point: 태블릿 가로 공간에서 피드 카드가 단일 열로 너무 넓게 표시됨.

#### 유저 스토리
- As a **iPad 사용자**, I want **피드 화면에서 두 개의 사진 카드를 나란히 보고 싶다**, so that **같은 시간에 더 많은 콘텐츠를 탐색할 수 있다**.

#### 수용 기준 (AC)
- [ ] AC1: 태블릿(768~1023px): 피드 카드 2컬럼 그리드 (gap: 16px)
- [ ] AC2: 데스크탑(≥1024px): 단일 컬럼 maxWidth 680px 유지 (A-4 결과와 일치)
- [ ] AC3: 모바일(< 768px): 기존 단일 컬럼
- [ ] AC4: 카드 너비 비율 동일, 이미지 종횡비 유지

#### 우선순위: P1
#### 기술 부채 vs 비즈니스 임팩트: 콘텐츠 탐색 효율 증가. GalleryPage의 기존 mq.tablet 패턴 복사로 구현 비용 낮음.

---

### C-4. PhotoFormPage / GatheringFormPage 태블릿 2컬럼 폼 (P2)

#### 사용자 문제
- 현재 상황: 두 폼이 모두 단일 컬럼. iPad에서는 긴 폼을 스크롤해야 하며 이미지 프리뷰와 메타데이터를 번갈아 확인해야 함.

#### 유저 스토리
- As a **iPad 사용 사진작가**, I want **사진 등록 화면에서 이미지 미리보기와 메타데이터 폼을 같은 화면에서 보고 싶다**, so that **업로드 중 수정 사항을 즉시 확인할 수 있다**.

#### 수용 기준 (AC)
- [ ] AC1: `PhotoFormPage` 태블릿(≥768px): 좌 이미지 프리뷰(50%) + 우 메타데이터 폼(50%) 2컬럼
- [ ] AC2: `GatheringFormPage` 태블릿(≥768px): 좌 기본 정보 입력 + 우 날짜/장소/이미지 설정
- [ ] AC3: 모바일(< 768px): 단일 컬럼 순서 유지

#### 우선순위: P2
#### 기술 부채 vs 비즈니스 임팩트: iPad에서 가장 복잡한 입력 화면의 UX 개선. 구현 시 이미지 프리뷰 패널의 sticky 동작을 추가로 고려해야 함.

---

### C-5. 태블릿 반응형 토큰 적용 전략 정의 (P1 — 가이드라인)

현재 태블릿 브레이크포인트 적용이 불균일한 근본 원인은 **"어디에 무슨 레이아웃을 써야 하는가"의 가이드라인 부재**다. 신규 화면 개발 시 아래 전략을 표준으로 정한다.

#### 화면 유형별 태블릿 레이아웃 전략

| 화면 유형 | 모바일(<768) | 태블릿(768~1023) | 데스크탑(≥1024) |
|---------|------------|----------------|--------------|
| **콘텐츠 목록** (피드, 탐색) | 1컬럼 | 2컬럼 그리드 | 2~3컬럼 또는 maxWidth 중앙정렬 |
| **상세 뷰** (사진 상세, 미트 상세) | 단일 스크롤 | 이미지 좌 + 정보 우 분할 | 이미지 좌 + 정보 우 분할 (비율 조정) |
| **폼** (사진 등록, 모임 생성) | 단일 컬럼 | 미리보기 좌 + 입력 우 | 미리보기 좌 + 입력 우 |
| **대시보드** (예약, 납품) | 탭+목록 단일 컬럼 | 목록 좌 + 상세 패널 우 | 목록 좌 + 상세 패널 우 |
| **프로필** | 세로 단일 컬럼 | 사이드 카드 고정 + 콘텐츠 | 사이드 카드 고정 + 콘텐츠 |

#### 수용 기준 (AC) — 가이드라인 문서화
- [ ] AC1: 이 전략표를 `CLAUDE.md`의 디자인 규칙 섹션 또는 `frontend/src/constants/breakpoints.js` 주석에 기록
- [ ] AC2: 신규 페이지 PR 체크리스트에 "태블릿 레이아웃 확인" 항목 추가

#### 우선순위: P1 (가이드라인은 구현 전에 확정)

---

## 우선순위 통합표

| 우선순위 | 항목 | 플랫폼 | 예상 공수 |
|---------|------|--------|---------|
| **P1** | A-1: 공통 Button 컴포넌트 | 웹 | 2~3일 |
| **P1** | A-2: 공통 Input/FormField 컴포넌트 | 웹 | 2~3일 |
| **P1** | A-3: Skeleton 색상 토큰 업데이트 | 웹 | 0.5일 |
| **P1** | A-4: 데스크탑 페이지 maxWidth + 2컬럼 | 웹 | 2~3일 |
| **P1** | B-1: 모바일 Skeleton 로딩 컴포넌트 | 모바일 | 1~2일 |
| **P1** | B-2: Pull-to-refresh 일관화 | 모바일 | 1일 |
| **P1** | B-3: 모바일 EmptyState 컴포넌트 | 모바일 | 1일 |
| **P1** | C-2: ProfilePage 태블릿 2컬럼 | 웹 | 1~2일 |
| **P1** | C-3: FeedPage 태블릿 2컬럼 | 웹 | 0.5일 |
| **P1** | C-5: 태블릿 전략 가이드라인 문서화 | — | 0.5일 |
| **P2** | A-5: hover/focus/active 인터랙션 일관성 | 웹 | 1~2일 |
| **P2** | A-6: 빈상태 컴포넌트 일관화 | 웹 | 1일 |
| **P2** | B-4: 웹-모바일 기능 불균형 해소 1차 | 모바일 | 3~5일 |
| **P2** | B-5: GalleryScreen 레이아웃 단순화 | 모바일 | 1일 |
| **P2** | C-4: PhotoFormPage/GatheringFormPage 태블릿 폼 | 웹 | 1~2일 |

---

## 성공 지표 (KPI)

| 지표 | 현재 | 목표 |
|-----|------|------|
| 주요 비동기 화면 중 Skeleton 적용 비율 | ~30% (13/~40 화면) | 80% 이상 |
| mq.* 사용 페이지 수 | 5개/35개 (14%) | 20개 이상 |
| Button/Input 공통 컴포넌트 적용 화면 수 | 0 | ProfilePage, FeedPage, MeetsPage 3개 이상 |
| Pull-to-refresh 적용 모바일 화면 수 | 4개 | 8개 이상 |
| LCP (웹 Tablet 기준) | 측정 전 | 2.5s 이하 |

---

## 관련 파일

- 프론트엔드 공통 컴포넌트: `frontend/src/components/common/Button.jsx` (신규), `frontend/src/components/common/Input.jsx` (신규), `frontend/src/components/common/Skeleton.jsx` (수정)
- 프론트엔드 페이지: `frontend/src/pages/ProfilePage.jsx`, `frontend/src/pages/FeedPage.jsx`, `frontend/src/pages/MeetsPage.jsx`, `frontend/src/pages/BookingDashboard.jsx`
- 브레이크포인트 토큰: `frontend/src/constants/breakpoints.js`
- 모바일 컴포넌트: `mobile/components/SkeletonCard.js` (신규), `mobile/components/EmptyState.js` (신규)
- 모바일 화면: `mobile/screens/GalleryScreen.js`, `mobile/screens/ProfileScreen.js`, `mobile/screens/FeedScreen.js`
- 기존 로드맵: `DESIGN_PROMPTS/planning/01_FOUNDATION.md`, `DESIGN_PROMPTS/00_ROADMAP.md`
- 선행 멀티플랫폼 기획: `DESIGN_PROMPTS/planning/PLANNING_multiplatform-uiux-improvement.md` (구 AKIRA/Cosmos 시대, 현재 이슈 해소됨)

---

## 구현 착수 전 체크리스트

- [ ] 기존 `DESIGN_PROMPTS/planning/01_FOUNDATION.md`(Button/Input 계획)와 이 문서 상충 여부 재확인 후 01_FOUNDATION.md를 이 스펙으로 업데이트
- [ ] A-1(Button) 구현 전 기존 모든 버튼 inline style 패턴을 grep으로 목록화 → 교체 범위 확정
- [ ] B-1(모바일 Skeleton) 구현 전 `mobile/package.json` 외부 라이브러리 추가 없이 RN Animated API 충분한지 확인
- [ ] C-2(ProfilePage 태블릿) 구현 전 기존 7탭 렌더링 로직이 `mq.tablet` CSS와 충돌하지 않는지 확인
