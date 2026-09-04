# DESIGN_PROMPT — 태블릿/아이패드 반응형 레이아웃
> Feature 38-C1~C5 | 2026-09-04 | Toss 디자인 시스템

기획 원문: `DESIGN_PROMPTS/planning/PLAN_38_MULTIPLATFORM_UX_V2.md` — 섹션 C-1 ~ C-5

---

## 시스템 컨텍스트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템 (Toss 디자인 시스템, 2026-08-29~):
  primary:       '#3182F6'
  primaryDark:   '#1B64DA'
  primaryLight:  '#E8F3FF'
  accent:        '#4E9FFF'
  bg:            '#F2F4F6'
  surface:       '#ffffff'
  border:        '#E5E8EB'
  text:          '#191F28'
  textSecondary: '#4E5968'
  textMuted:     '#8B95A1'
  danger:        '#F04452'
  darkBg:        '#111417'
  darkSurface:   '#1A1E22'
  galleryBg:     '#111417'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- backdrop-filter/blur, 브랜드 컬러 tint된 그림자, 그라디언트 오브 장식 금지 — 플랫 서페이스만 사용
- 그림자는 중립 회색(rgba(0,0,0,0.04~0.12))만 사용

브레이크포인트 토큰 (frontend/src/constants/breakpoints.js):
  mq.mobile     @media (max-width: 767px)
  mq.tablet     @media (min-width: 768px) and (max-width: 1023px)
  mq.tabletUp   @media (min-width: 768px)
  mq.desktop    @media (min-width: 1024px)
  BP = { sm:480, md:768, lg:1024, xl:1280 }
```

---

## C-5. 태블릿 레이아웃 전략 가이드라인 (구현 착수 전 확정)

> 이 전략표는 `DESIGN_PROMPTS/planning/PLAN_38_MULTIPLATFORM_UX_V2.md` 섹션 C-5의 요구사항이다.
> 신규 화면 개발 PR 체크리스트에 "태블릿 레이아웃 전략 준수 여부" 항목을 추가해야 한다.

### 화면 유형별 3단계 레이아웃 전략

| 화면 유형           | 대표 화면                          | 모바일 (<768px)      | 태블릿 (768~1023px)              | 데스크탑 (≥1024px)                  |
|--------------------|------------------------------------|---------------------|----------------------------------|--------------------------------------|
| **콘텐츠 목록**     | FeedPage, GatheringsPage           | 단일 컬럼           | 2컬럼 그리드 (gap 16px)           | 2~3컬럼 또는 maxWidth 중앙정렬       |
| **사진 갤러리**     | GalleryPage, ExplorePage           | 2컬럼 그리드        | 3컬럼 그리드 (이미 적용 완료)     | 4컬럼 또는 masonry                   |
| **상세 뷰**         | PhotoDetailPage, MeetDetailPage    | 단일 세로 스크롤     | 이미지 좌 50% + 정보 우 50%       | 이미지 좌 58% + 정보 우 42%          |
| **폼 입력**         | PhotoFormPage, GatheringFormPage   | 단일 컬럼           | 미리보기 좌 50% + 입력 우 50%     | 미리보기 좌 50% + 입력 우 50%        |
| **대시보드/목록+상세** | BookingDashboard, MeetsPage     | 단일 컬럼 탭+목록   | 단일 컬럼 (목록이 넓게)           | 목록 좌(320~360px) + 상세 패널 우    |
| **프로필**          | ProfilePage                        | 단일 세로 컬럼      | 사이드 카드(260px) + 탭 콘텐츠   | 사이드 카드(300px) + 탭 콘텐츠       |

### 구현 규칙

1. **mq 토큰 필수 사용**: `mq.tablet`, `mq.tabletUp`, `mq.desktop` 사용. `window.innerWidth` 직접 비교로 state 관리하면 resize 이벤트 누락과 SSR 불일치 위험이 있으므로 CSS `<style>` 태그 방식 사용.
2. **`<style>` 태그 주입 패턴**: 기존 `GalleryPage.jsx`의 `.gallery-grid` 클래스 방식 참조.
3. **BP 직접 숫자 금지**: `window.innerWidth < 1024` 대신 CSS `@media` 사용. `PhotoDetailPage`의 `BP.md`/`BP.lg` 직접 비교는 레거시 방식으로 신규 화면에서 금지.
4. **모바일 회귀 방지**: 태블릿/데스크탑 레이아웃 추가 시 `<768px` 기존 동작을 바꾸지 않는다.

### `<style>` 태그 주입 패턴 표준 예시

```javascript
// 컴포넌트 내부에서 사용하는 패턴
const LAYOUT_CSS = `
  .profile-layout {
    display: flex;
    flex-direction: column;
  }
  @media (min-width: 768px) {
    .profile-layout {
      flex-direction: row;
      height: calc(100vh - 60px);
    }
    .profile-sidebar {
      width: 260px;
      flex-shrink: 0;
      border-right: 1px solid #E5E8EB;
      overflow-y: auto;
    }
    .profile-content {
      flex: 1;
      overflow-y: auto;
    }
  }
  @media (min-width: 1024px) {
    .profile-sidebar { width: 300px; }
  }
`;

return (
  <>
    <style>{LAYOUT_CSS}</style>
    <div className="profile-layout">
      <aside className="profile-sidebar">...</aside>
      <main className="profile-content">...</main>
    </div>
  </>
);
```

---

## C-2. ProfilePage 태블릿 2컬럼 레이아웃

### 와이어프레임

```
모바일 (<768px) — 기존 유지
┌────────────────────────────────┐
│  [아바타] 이름 @프로필명        │
│  팔로워 124  팔로잉 38  사진 47 │
│  ─ 내 작품 ─ 저장함 ─ 시리즈 ─ │  ← 수평 스크롤 탭
│  ─ 분석 ── 예약 ─── 설정 ──   │
│  [사진 그리드 ...]              │
└────────────────────────────────┘

태블릿 (768~1023px)
┌──────────────────────────────────────────────────────────────────────┐
│  ┌── 260px ────────────────┐  │  ┌── flex-1 ──────────────────────┐  │
│  │                         │  │  │                                │  │
│  │  [아바타 80px]           │  │  │  [탭 콘텐츠 — 내 작품]         │  │
│  │  이름 (18px 600)         │  │  │                                │  │
│  │  @프로필명 (13px muted)  │  │  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐    │  │
│  │                         │  │  │  │사진│ │사진│ │사진│ │사진│   │  │
│  │  ─ 통계 ─               │  │  │  └───┘ └───┘ └───┘ └───┘    │  │
│  │  사진 47 / 팔로워 124    │  │  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐    │  │
│  │  팔로잉 38               │  │  │  │사진│ │사진│ │사진│ │사진│   │  │
│  │                         │  │  │  └───┘ └───┘ └───┘ └───┘    │  │
│  │  ──── 수직 탭 메뉴 ─── │  │  │                                │  │
│  │  > 내 작품  (활성)       │  │  │                                │  │
│  │    저장함                │  │  │                                │  │
│  │    시리즈                │  │  │                                │  │
│  │    분석 📊               │  │  │                                │  │
│  │    예약 📅               │  │  │                                │  │
│  │    설정                  │  │  │                                │  │
│  │                         │  │  │                                │  │
│  └─────────────────────────┘  │  └────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
  좌 사이드바 260px              구분선 1px           우 콘텐츠 flex-1

데스크탑 (≥1024px)
  좌 사이드바 300px + 우 콘텐츠 flex-1 (나머지 동일)
```

### 레이아웃 CSS 스펙

```css
/* 모바일 기본 */
.profile-layout {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 60px);
}
.profile-sidebar {
  padding: 20px 16px;
  background: #ffffff;
  border-bottom: 1px solid #E5E8EB;
}
.profile-content {
  flex: 1;
  background: #F2F4F6;
  padding: 16px;
}

/* 태블릿 이상 */
@media (min-width: 768px) {
  .profile-layout {
    flex-direction: row;
    height: calc(100vh - 60px);
  }
  .profile-sidebar {
    width: 260px;
    flex-shrink: 0;
    border-bottom: none;
    border-right: 1px solid #E5E8EB;
    overflow-y: auto;
    padding: 28px 20px;
  }
  .profile-content {
    overflow-y: auto;
    padding: 28px 24px;
  }
}

/* 데스크탑 */
@media (min-width: 1024px) {
  .profile-sidebar {
    width: 300px;
    padding: 32px 24px;
  }
  .profile-content {
    padding: 32px 32px;
  }
}
```

### 수직 탭 메뉴 스펙 (태블릿/데스크탑)

```
                                  모바일 (수평)     태블릿/데스크탑 (수직)
탭 항목 레이아웃:
  display                         flex (row)        flex (column)
  gap                             0 (scroll)        4px
  탭 아이템 padding               10px 16px         10px 14px
  탭 아이템 borderRadius          0 (언더라인)       8px
  활성 탭 bg (수직)               —                 #E8F3FF
  활성 탭 color                   #3182F6           #3182F6
  활성 탭 fontWeight              700               600
  수평 탭 활성 border             bottom 2px solid #3182F6  —
  비활성 color                    #8B95A1           #4E5968
  아이템 fontSize                 14px              14px
  아이콘                          없음              왼쪽 이모지 16px
```

### 사이드바 프로필 카드 스펙

| 요소               | 스타일                                                |
|--------------------|-------------------------------------------------------|
| 아바타             | 80px × 80px, borderRadius 50%, bg `#E5E8EB`           |
| 이름               | fontSize 18px, fontWeight 700, color `#191F28`, marginTop 12px |
| 프로필명           | fontSize 13px, color `#8B95A1`, marginTop 4px         |
| 팔로우 버튼 (본인 아닐 때) | secondary variant, size md, marginTop 16px   |
| 통계 구분선        | borderTop 1px solid `#E5E8EB`, marginTop 20px, paddingTop 16px |
| 통계 행            | display flex, gap 0 (각 항목 flex-1, 중앙 정렬)       |
| 통계 숫자 fontSize | 16px, fontWeight 700, color `#191F28`                 |
| 통계 라벨 fontSize | 11px, color `#8B95A1`, marginTop 2px                  |
| 통계 항목 간 구분선| borderRight 1px solid `#E5E8EB` (마지막 제외)         |

---

## C-3. FeedPage 태블릿 2컬럼 카드 그리드

### 와이어프레임

```
모바일 (<768px)           태블릿 (768~1023px)           데스크탑 (≥1024px)
┌─────────────────┐      ┌───────────┐ ┌───────────┐    ┌──────────────────┐
│  [피드 카드]     │      │ [피드 카드]│ │[피드 카드]│    │  maxWidth 680px  │
│   (100% 너비)   │      │  (50%~)   │ │  (50%~)  │    │  단일 컬럼 중앙  │
│  [피드 카드]     │      ├───────────┤ ├───────────┤    │  [피드 카드]     │
│  [피드 카드]     │      │ [피드 카드]│ │[피드 카드]│    │  [피드 카드]     │
└─────────────────┘      └───────────┘ └───────────┘    └──────────────────┘
```

### CSS 스펙

```css
/* 모바일: 단일 컬럼 */
.feed-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 0 16px;
}

/* 태블릿: 2컬럼 그리드 */
@media (min-width: 768px) and (max-width: 1023px) {
  .feed-grid {
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 0 20px;
    max-width: none;
  }
}

/* 데스크탑: 단일 컬럼 maxWidth (A-4 스펙 적용) */
@media (min-width: 1024px) {
  .feed-grid {
    grid-template-columns: 1fr;
    max-width: 680px;
    margin: 0 auto;
    padding: 0 0;
    gap: 16px;
  }
}
```

### 태블릿 카드 이미지 비율

태블릿 2컬럼에서 카드 너비는 약 `(뷰포트 너비 - 40px - 16px) / 2`. 이미지는 `aspect-ratio: 4/3`
또는 `aspect-ratio: 16/9` 중 원본 비율을 유지하는 방식을 사용한다.

```javascript
// 이미지 컨테이너 inline style
{
  width: '100%',
  aspectRatio: '4/3',    // 또는 원본 이미지 비율
  objectFit: 'cover',
  display: 'block',
}
```

카드 hover/active 상태 및 폰트 스펙은 `DESIGN_PROMPT_desktop-layout.md`의 FeedPage 섹션과 동일하다.

---

## C-4. PhotoFormPage / GatheringFormPage 태블릿 2컬럼 폼

### PhotoFormPage 와이어프레임

```
모바일 (<768px)
┌─────────────────────────────────┐
│  [이미지 프리뷰 / 업로드 영역]   │  ← 100% 너비
│  ─────────────────────────────  │
│  제목 *                         │
│  ┌──────────────────────────┐   │
│  │ 사진 제목 입력           │   │
│  └──────────────────────────┘   │
│  설명                           │
│  ┌──────────────────────────┐   │
│  │ 사진 설명 입력           │   │
│  └──────────────────────────┘   │
│  ... (나머지 폼 필드)            │
│  [등록하기] 버튼                 │
└─────────────────────────────────┘

태블릿 이상 (≥768px)
┌──────────────────────────────────────────────────────────────────────┐
│  ┌── 50% ──────────────────────────┐  │  ┌── 50% ─────────────────┐  │
│  │                                 │  │  │                         │  │
│  │  [이미지 프리뷰]                 │  │  │  제목 *                 │  │
│  │                                 │  │  │  ┌─────────────────┐   │  │
│  │  (sticky: 스크롤해도 고정)       │  │  │  │ 사진 제목 입력  │   │  │
│  │                                 │  │  │  └─────────────────┘   │  │
│  │  [이미지 선택/변경] 버튼         │  │  │  설명                   │  │
│  │                                 │  │  │  ┌─────────────────┐   │  │
│  │                                 │  │  │  │ 설명 텍스트     │   │  │
│  │                                 │  │  │  │                 │   │  │
│  │                                 │  │  │  └─────────────────┘   │  │
│  │                                 │  │  │  장르 / 무드 / 태그...  │  │
│  │                                 │  │  │                         │  │
│  │                                 │  │  │  [등록하기] 버튼        │  │
│  └─────────────────────────────────┘  │  └─────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### PhotoFormPage CSS 스펙

```css
/* 모바일: 단일 컬럼 */
.photo-form-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px;
}
.photo-preview-panel {
  /* 업로드 영역: 전체 너비 */
}

/* 태블릿 이상: 2컬럼 */
@media (min-width: 768px) {
  .photo-form-layout {
    flex-direction: row;
    align-items: flex-start;
    gap: 0;
    padding: 0;
    height: calc(100vh - 60px);
  }
  .photo-preview-panel {
    width: 50%;
    flex-shrink: 0;
    position: sticky;
    top: 60px;                    /* 헤더 높이 */
    height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #F5F6F8;          /* surfaceDim */
    border-right: 1px solid #E5E8EB;
    padding: 32px 24px;
  }
  .photo-form-panel {
    width: 50%;
    overflow-y: auto;
    height: calc(100vh - 60px);
    padding: 32px 28px;
    background: #ffffff;
  }
}
```

### GatheringFormPage 와이어프레임

```
태블릿 이상 (≥768px)
┌──────────────────────────────────────────────────────────────────────┐
│  ┌── 50% ──────────────────────────┐  │  ┌── 50% ─────────────────┐  │
│  │  기본 정보 입력                  │  │  │  날짜/장소/이미지 설정  │  │
│  │                                 │  │  │                         │  │
│  │  모임 제목 *                    │  │  │  시작 일시 *            │  │
│  │  ┌─────────────────────────┐   │  │  │  ┌─────────────────┐   │  │
│  │  │ 예: 한강 인물 촬영 모임  │   │  │  │  │ 2026-12-10T14:00│   │  │
│  │  └─────────────────────────┘   │  │  │  └─────────────────┘   │  │
│  │                                 │  │  │                         │  │
│  │  장소 *                         │  │  │  종료 일시 *            │  │
│  │  ┌─────────────────────────┐   │  │  │  ┌─────────────────┐   │  │
│  │  │ 한강 반포 지구          │   │  │  │  │ 2026-12-10T18:00│   │  │
│  │  └─────────────────────────┘   │  │  │  └─────────────────┘   │  │
│  │                                 │  │  │                         │  │
│  │  모집 인원 *                    │  │  │  모집 마감 일시 *       │  │
│  │  ┌──────────┐                  │  │  │  ┌─────────────────┐   │  │
│  │  │   10     │                  │  │  │  │ 2026-12-08T23:59│   │  │
│  │  └──────────┘                  │  │  │  └─────────────────┘   │  │
│  │                                 │  │  │                         │  │
│  │  모임 설명                      │  │  │  썸네일 이미지          │  │
│  │  ┌─────────────────────────┐   │  │  │  [드래그&드롭 업로드]   │  │
│  │  │ (여러 줄 텍스트)         │   │  │  │                         │  │
│  │  └─────────────────────────┘   │  │  │                         │  │
│  │                                 │  │  │  해시태그               │  │
│  │  [모임 만들기] 버튼             │  │  │  ┌─────────────────┐   │  │
│  │                                 │  │  │  │ #인물 #한강...  │   │  │
│  └─────────────────────────────────┘  │  └─────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### GatheringFormPage CSS 스펙

```css
@media (min-width: 768px) {
  .gathering-form-layout {
    display: flex;
    flex-direction: row;
    gap: 0;
    height: calc(100vh - 60px);
  }
  .gathering-basic-panel {
    width: 50%;
    overflow-y: auto;
    padding: 32px 28px;
    background: #ffffff;
    border-right: 1px solid #E5E8EB;
  }
  .gathering-datetime-panel {
    width: 50%;
    overflow-y: auto;
    padding: 32px 28px;
    background: #F5F6F8;
  }
}
```

---

## C-1. 현황 요약 및 진단 (참고)

현재 `frontend/src/constants/breakpoints.js`에 토큰이 정의되어 있으나 실제 사용은 극히 제한적이다.
태블릿(768~1023px) 구간에서 제대로 된 레이아웃 분기를 하는 화면은 `GalleryPage`와 `ExplorePage` 2개뿐이다.

이 문서의 C-2, C-3, C-4 스펙을 구현하면 다음과 같이 커버리지가 향상된다:

| 화면        | 이전                | 이후                        |
|-------------|--------------------|-----------------------------|
| GalleryPage | ✅ 이미 3컬럼       | 유지                        |
| ExplorePage | ✅ 이미 3컬럼       | 유지                        |
| FeedPage    | ❌ 단일 컬럼        | ✅ 2컬럼 (C-3)              |
| ProfilePage | ❌ 단일 컬럼        | ✅ 사이드바 (C-2)           |
| PhotoFormPage| ❌ 단일 컬럼       | ✅ 2컬럼 폼 (C-4)           |
| GatheringFormPage | ❌ 단일 컬럼  | ✅ 2컬럼 폼 (C-4)           |

---

## 반응형 구현 시 공통 주의사항

### 이미 구현된 (수정 금지) 화면

- `GalleryPage.jsx` — `mq.tablet` 3컬럼 마소닉: 변경하지 않는다.
- `ExplorePage.jsx` — `mq.tablet` 3컬럼: 변경하지 않는다.
- `Header.jsx` — `mq.tabletUp` PC/모바일 분기: 변경하지 않는다.
- `AdminLayout.jsx` — `mq.tabletUp` 사이드바 분기: 변경하지 않는다.

### sticky 패널 구현 시 주의

PhotoFormPage의 이미지 프리뷰 패널이 `position: sticky`를 사용할 때:
- 부모 컨테이너 `overflow: hidden`이 있으면 sticky가 동작하지 않는다.
- 우 패널(폼)만 `overflow-y: auto`를 가져야 한다.
- 전체 레이아웃 높이를 `height: calc(100vh - 60px)`로 고정해야 sticky가 의미있다.

---

## Claude.ai 아티팩트 요청 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지/유니코드만 사용

컬러 토큰 (Toss 디자인 시스템):
  primary:      '#3182F6'
  primaryLight: '#E8F3FF'
  bg:           '#F2F4F6'
  surface:      '#ffffff'
  surfaceDim:   '#F5F6F8'
  border:       '#E5E8EB'
  text:         '#191F28'
  textSecondary:'#4E5968'
  textMuted:    '#8B95A1'

규칙: export default 컴포넌트 1개, inline style, 외부 라이브러리 없음, 한국어 UI,
blur/glassmorphism 금지, 그림자는 rgba(0,0,0,0.04~0.12)만.

다음 3가지 태블릿 레이아웃을 탭 전환으로 데모하는 컴포넌트를 만들어줘.
데모 너비는 900px (iPad 가로 근사값)로 설정한다.

── 탭 1: ProfilePage 태블릿 2컬럼 ──
전체 높이 640px, display flex, flexDirection row.

좌 사이드바 (260px):
  bg #ffffff, borderRight 1px solid #E5E8EB, padding 28px 20px
  아바타: 80px 원형(bg #E5E8EB)
  이름: "김민준", fontSize 18px, fontWeight 700, marginTop 12px
  프로필명: "@photographer_min", fontSize 13px, color #8B95A1, marginTop 4px
  통계 영역 (marginTop 20px, borderTop 1px solid #E5E8EB, paddingTop 16px):
    3개 항목 (사진/팔로워/팔로잉) flex row:
    각 항목 flex-1, textAlign center
    숫자 16px fontWeight 700, 라벨 11px color #8B95A1
    항목 간 borderRight 1px solid #E5E8EB (마지막 제외)
  수직 탭 메뉴 (marginTop 24px):
    6개 항목: 내 작품(활성) / 저장함 / 시리즈 / 분석 📊 / 예약 📅 / 설정
    각 항목 padding 10px 14px, borderRadius 8px, fontSize 14px
    활성: bg #E8F3FF, color #3182F6, fontWeight 600
    비활성: color #4E5968, hover bg #F2F4F6

우 콘텐츠 (flex-1):
  bg #F2F4F6, padding 28px 24px
  4컬럼 사진 그리드 (gap 8px):
    8개 사진 placeholder (각 bg #E5E8EB, aspectRatio 1, borderRadius 8px)

── 탭 2: FeedPage 태블릿 2컬럼 ──
전체 높이 640px, 너비 900px.

<style> 태그로 반응형 정의:
  .feed-grid-demo { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 20px; }

피드 카드 4개 (2컬럼 × 2행):
  각 카드: bg #ffffff, borderRadius 12px, border 1px solid #E5E8EB
  헤더: padding 12px 16px, 아바타(32px 원형 bg #E5E8EB) + 이름(14px 600) + 날짜(12px #8B95A1)
  이미지: width 100%, aspectRatio 4/3, bg #E5E8EB (placeholder)
  액션 바: padding 10px 16px, ♡ 12  💬 3 텍스트 (fontSize 13px, color #8B95A1)
  텍스트: padding 12px 16px, 제목(15px 600 #191F28) + 설명(13px #4E5968 2줄)

── 탭 3: PhotoFormPage 태블릿 2컬럼 폼 ──
전체 높이 640px, display flex.

좌 이미지 패널 (50%):
  bg #F5F6F8, borderRight 1px solid #E5E8EB
  padding 40px 32px, display flex, flexDirection column, alignItems center, justifyContent center
  이미지 placeholder: 260px × 200px, bg #E5E8EB, borderRadius 12px, border 2px dashed #B0B8C1
  중앙에 이모지 📷 (32px) + "이미지를 선택하세요" (14px #8B95A1)
  "이미지 선택" 버튼: marginTop 16px, secondary variant 스타일(border 1px solid #3182F6, color #3182F6, padding 9px 18px, borderRadius 8px)

우 폼 패널 (50%):
  bg #ffffff, padding 32px 28px, overflowY auto
  FormField 예시 4개:
    1. "제목 *" + input (placeholder "사진 제목을 입력하세요")
    2. "설명" + textarea 3줄 (placeholder "사진 설명...")
    3. "장르" + select placeholder div (bg #F2F4F6, color #8B95A1 "장르 선택")
    4. "컬러무드" + select placeholder div
  [등록하기] 버튼: 하단 오른쪽 정렬, primary variant(bg #3182F6, color #fff, padding 10px 20px, borderRadius 8px)

각 폼 필드:
  레이블 fontSize 13px, fontWeight 500, color #191F28, marginBottom 6px
  input/div height 40px, border 1px solid #E5E8EB, borderRadius 8px, padding 0 12px, fontSize 14px

탭 전환 버튼: 상단 탭바 (ProfilePage / FeedPage 2컬럼 / PhotoForm 2컬럼 폼)
활성 탭: color #3182F6, borderBottom 2px solid #3182F6
```
