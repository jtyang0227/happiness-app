# 31 — Cosmos × Pinterest 디자인 시스템 — Happiness 앱 전체 적용

> 작성일: 2026-06-23  
> 영감: Cosmos(curated dark editorial grid app) + Pinterest(visual discovery, masonry, boards)  
> 대체 대상: iOS 26 Liquid Glass 디자인 시스템 (21/22/23번 파일 deprecated)  
> 적용 범위: Happiness 앱 전체 페이지 (갤러리·탐색·포트폴리오·에디터·어드민)

---

## 1. Cosmos 앱 UI 분석

### 스크린샷 분석 결과

| 요소 | 디자인 |
|------|--------|
| 배경 | 순수 블랙 `#000000` / `#090909` |
| 헤더 | 상단 상태바 + "☆ COSMOS" 중앙 로고, 모두 흰 텍스트 |
| 검색바 | 둥근 pill 형태, 어두운 회색 배경 (`#1a1a1a`), 흰 텍스트 |
| 카테고리 탭 | 수평 스크롤, 활성 탭 = 밑줄 인디케이터, 흰/회색 구분 |
| 보드 카드 | 3개 이미지 콜라주 + 타이틀 + @handle + 인증 배지 + 요소 수 |
| 이미지 그리드 | 마소닉 편집 그리드 (대형 + 소형 혼합) |
| 하단 네비 | 아이콘 3개 (홈/탐색/프로필), 극도로 미니멀 |
| 그림자/보더 | 없음 — 이미지가 배경에 직접 얹힘 |
| 타이포 | SF Pro / 시스템 폰트, 작고 정확한 크기 |
| 인증 배지 | 파란 체크 원형 뱃지 (작은 점) |

### 핵심 철학

- **이미지 퍼스트**: UI 요소 최소화, 콘텐츠 최대 노출
- **에디토리얼 그리드**: 규칙 없는 자유 마소닉, 편집적 구성
- **다크 온리**: 이미지 색감을 최대로 살리는 순수 블랙 배경
- **보드 시스템**: 개인 큐레이션 컬렉션(보드) 중심 UX
- **발견 중심**: 검색 + 카테고리 필터가 탐색의 핵심

---

## 2. Pinterest 참고 요소

| 요소 | 적용 |
|------|------|
| 마소닉 그리드 | 2–4 컬럼 이미지 그리드, 높이 가변 |
| 저장/핀 버튼 | 이미지 hover 시 우상단 "저장" 버튼 등장 |
| 보드 | 시리즈 = 보드 (다중 이미지 컬렉션) |
| 무한 스크롤 | 끊김 없는 콘텐츠 로드 |
| 검색 + 태그 | 키워드 + 시각적 태그 필터 |
| 프로필 | 보드 그리드 + 팔로워 통계 |

---

## 3. Happiness 디자인 토큰 (Cosmos 스타일)

### 3-1. 색상 시스템

```javascript
// constants/cosmosColors.js — 신규 추가
export const COSMOS = {
  // ── 다크 서피스 계층 ──
  bg:          '#090909',   // 앱 최상위 배경 (순수 블랙에 가깝게)
  surface:     '#0f0f0f',   // 카드, 패널
  elevated:    '#161616',   // 팝업, 모달 배경
  search:      '#1c1c1c',   // 검색바, 인풋 배경
  divider:     'rgba(255,255,255,0.07)',  // 구분선
  overlay:     'rgba(0,0,0,0.75)',        // 이미지 오버레이

  // ── 텍스트 계층 ──
  text:        '#ffffff',   // 주요 텍스트
  textSub:     'rgba(255,255,255,0.65)', // 보조 텍스트
  textMuted:   'rgba(255,255,255,0.35)', // 힌트, 라벨
  textDisabled:'rgba(255,255,255,0.20)', // 비활성

  // ── 브랜드 ──
  primary:     '#5b6ef5',   // 기존 브랜드 프라이머리 유지
  primaryGlow: 'rgba(91,110,245,0.35)',
  accent:      '#a78bfa',   // 보라 액센트
  verified:    '#4a90ff',   // 인증 배지

  // ── 상태 ──
  success:  '#2dce78',
  danger:   '#ff4d6d',
  warning:  '#fbbf24',

  // ── 그라디언트 ──
  gradPrimary:  'linear-gradient(135deg, #5b6ef5 0%, #7c5cfc 100%)',
  gradDark:     'linear-gradient(180deg, rgba(9,9,9,0) 0%, rgba(9,9,9,0.95) 100%)',
  gradOverlay:  'linear-gradient(0deg, rgba(0,0,0,0.70) 0%, transparent 50%)',
};
```

### 3-2. 타이포그래피

```javascript
export const COSMOS_TYPE = {
  // 앱 로고
  logo: { fontSize: 16, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' },

  // 섹션 헤딩
  h1:  { fontSize: 22, fontWeight: 700, lineHeight: 1.2 },
  h2:  { fontSize: 18, fontWeight: 700, lineHeight: 1.25 },
  h3:  { fontSize: 15, fontWeight: 700, lineHeight: 1.3 },

  // 본문
  body:  { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
  bodyS: { fontSize: 12, fontWeight: 400, lineHeight: 1.5 },

  // 라벨
  label:  { fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' },
  labelS: { fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' },

  // 메타 (작가명, 카운트 등)
  meta:   { fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)' },
  handle: { fontSize: 12, fontWeight: 600 },
};
```

### 3-3. 간격 / 라운딩

```javascript
export const COSMOS_SPACE = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40,
};

export const COSMOS_RADIUS = {
  sm: 6, md: 10, lg: 16, xl: 24, full: 9999,
};
```

---

## 4. 컴포넌트 스펙

### 4-1. CosmosBoardCard (보드/시리즈 카드)

```
┌────────────────────────────────┐
│ [img1] [img2]                  │
│ [  img3 (wide)  ]              │
├────────────────────────────────┤
│ Board Title                    │
│ @handle ✓  ·  537 elements     │
└────────────────────────────────┘
```

- 상단: 3개 이미지 그리드 (1열: 50/50, 2열: 전체 너비)
- 배경: `#0f0f0f`, 테두리: 없음
- 제목: 15px, 흰색, 700weight
- 핸들: 12px, `rgba(255,255,255,0.55)` + 인증 배지
- 요소 수: "N elements" 형식

### 4-2. CosmosPhotoCard (이미지 카드)

- 마소닉 그리드에서 사용
- 이미지만 표시 (텍스트 없음, 기본 상태)
- Hover 시:
  - 우상단: "저장" 버튼 (흰색 pill, 12px)
  - 하단: 작가명 오버레이 페이드인
  - 희미한 스케일업 (`scale(1.01)`)
- 클릭: 상세 페이지

### 4-3. CosmosSearchBar

```
[🔍 Try 'scandinavian furniture'  ···]
```

- 배경: `#1c1c1c`, 라운드: `9999px`
- 왼쪽: 🔍 아이콘
- 오른쪽: 시각적 검색 아이콘 (점 3개 원형)
- 포커스 시: `#242424` 배경 + 흰색 테두리 `rgba(255,255,255,0.15)`

### 4-4. CosmosTabBar (카테고리 필터)

- 수평 스크롤 (스크롤바 없음)
- 탭: `{ label }` 텍스트만
- 활성: 하단 2px 흰색 라인 + 흰 텍스트
- 비활성: `rgba(255,255,255,0.45)` 텍스트
- 간격: `gap: 24px`

### 4-5. CosmosBottomNav

```
[🏠 홈]  [🔍 탐색]  [👤 프로필]
```

- 배경: `rgba(9,9,9,0.96)` + `backdrop-filter: blur(20px)`
- 높이: 54px + safe-area-inset-bottom
- 아이콘 크기: 22px (유니코드)
- 활성: 흰색 + 상단 2px 액센트 라인
- 비활성: `rgba(255,255,255,0.35)`

### 4-6. CosmosHeader

```
9:01  🔔    ☆ COSMOS    📶 LTE 48
```

- 배경: `#090909` (앱 배경과 동일, 경계 없음)
- 로고: 중앙 정렬, 대문자, `letter-spacing: 0.12em`
- 높이: 44px (iOS 기준)

---

## 5. 페이지별 적용 스펙

### 5-1. GalleryPage (갤러리) ← 최우선

**현재** → Glass 다크 배경 + 글래스 카드
**변경** → 순수 블랙 + 테두리 없는 마소닉

```
배경: #090909
헤더: 없음 (BottomNav만 사용)
그리드:
  - 모바일(≤768): 2컬럼 마소닉
  - 태블릿(769-1200): 3컬럼
  - 데스크탑(>1200): 4컬럼
  - packRows() 알고리즘 유지 (gridColSpan)
카드: 테두리 없음, 둥근 모서리 8px, 호버 오버레이 페이드
빈 상태: 흰 텍스트 중앙 EmptyState
```

### 5-2. ExplorePage (탐색)

```
배경: #090909
상단: CosmosSearchBar (pill 검색창)
카테고리: CosmosTabBar (장르 + 무드 필터)
그리드: 마소닉 이미지 그리드 (높이 가변)
보드 섹션: CosmosBoardCard × N (시리즈/컬렉션)
```

### 5-3. SeriesPage (시리즈 = 보드)

```
레이아웃: Pinterest 보드 그리드 (2컬럼)
카드: CosmosBoardCard
  - 썸네일 3개 이미지 미리보기
  - 시리즈 제목 + 사진 수
```

### 5-4. ProfilePage (프로필)

**Hero 섹션**:
```
80vh 풀블리드 커버 이미지
하단 그라디언트 오버레이
작가명 + 팔로워/팔로잉 통계
```

**탭 → 통계 바**:
```
[내 작품] [저장함] [보드] [정보]
```

**작품 그리드**: 마소닉

### 5-5. ImageEditorPage (편집기) — 이미 업그레이드됨

- 배경: `#080810` (짙은 네이비-블랙)
- 패널: `#0c0c18`
- 톤 커브: 프리미엄 다크 (이미 개선)

---

## 6. 인터랙션 스펙

### 이미지 카드 Hover

```css
/* 이미지 */
transform: scale(1.01);
transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);

/* 하단 메타 오버레이 */
opacity: 0 → 1;
transition: opacity 0.25s ease;

/* 저장 버튼 */
opacity: 0 → 1;
transform: translateY(4px) → translateY(0);
transition: all 0.2s ease;
```

### 탭 전환

```css
border-bottom: 2px solid #fff;
transition: border-color 0.2s ease;
```

### 이미지 로드

```
1. 회색 플레이스홀더 (blur 배경)
2. 이미지 로드 완료 시 fade-in
transition: opacity 0.4s ease;
```

---

## 7. 다크 모드 전용 설계 이유

Cosmos처럼 Happiness도 **다크 온리** 방향으로:

1. **사진 집중**: 어두운 배경이 이미지 색감 극대화
2. **에디토리얼 무드**: 고급 포토 갤러리 = 다크 테마
3. **배터리 절약**: OLED 기기에서 유리
4. **일관성**: 에디터(이미 다크)와 통일

> 단, 어드민 패널(`/admin/**`)은 glass('strong') 라이트 테마 유지 (운영 편의성)

---

## 8. 마이그레이션 우선순위

| 순서 | 페이지/컴포넌트 | 난이도 | 임팩트 |
|------|---------------|--------|--------|
| 1 | GalleryPage 배경 + 카드 호버 | 낮음 | 높음 |
| 2 | Header → Cosmos 스타일 | 낮음 | 높음 |
| 3 | ExplorePage 검색바 + 탭 | 중간 | 높음 |
| 4 | PhotoCard 호버 오버레이 | 낮음 | 높음 |
| 5 | SeriesPage → 보드 그리드 | 중간 | 중간 |
| 6 | ProfilePage 다크 재설계 | 높음 | 중간 |
| 7 | PortfolioPage 다크 에디토리얼 | 높음 | 중간 |

---

## 9. 기존 iOS Liquid Glass 파일 처리

| 파일 | 상태 |
|------|------|
| `21_IOS26_LIQUID_GLASS_DESIGN.md` | **DEPRECATED** — Cosmos로 대체 |
| `22_IOS26_LIQUID_GLASS_REDESIGN.md` | **DEPRECATED** — Cosmos로 대체 |
| `23_IOS26_LIQUID_GLASS_V2.md` | **DEPRECATED** — Cosmos로 대체 |
| `constants/glass.js` | **유지** — 어드민 패널, 로그인/회원가입 페이지에서 계속 사용 |

> `glass.js`의 dark 계열 variants(dark, darkBare)는 에디터 UI에서 계속 사용.  
> light 계열은 어드민/인증 페이지에서만 유지.

---

## 10. 구현 CSS 커스텀 속성

```css
/* global 추가 (index.css 또는 App.jsx style 태그) */
:root {
  --cosmos-bg:      #090909;
  --cosmos-surface: #0f0f0f;
  --cosmos-elevated: #161616;
  --cosmos-text:    #ffffff;
  --cosmos-text-sub: rgba(255,255,255,0.65);
  --cosmos-primary: #5b6ef5;
  --cosmos-border:  rgba(255,255,255,0.07);
}

/* 스크롤바 스타일 (다크) */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
```
