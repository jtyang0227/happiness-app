# 26 — 사진 장르 분류 시스템

> 작성일: 2026-06-20  
> 상태: ✅ 구현 완료 (2026-06-20)  
> 관련 기능: PhotoFormPage, ExplorePage, GalleryPage, PortfolioPage, PhotoDetailPage, AdminDashboardPage

---

## 1. 현재 분류 체계 분석

### 1-1. 현재 있는 것

| 분류 기준 | 필드 | 종류 | 결정 주체 |
|----------|------|------|---------|
| 색감 분위기 | `colorMood` | 11종 (WARM, COOL, VIBRANT ...) | 이미지 자동 분석 |
| 화면 비율 | `imageRatio` | 5종 (1:1, 4:3, 16:9 ...) | 작가 선택 |
| 자유 태그 | `PhotoTag` | 무제한 | 작가 입력 |
| 색상 팔레트 | `colorPalette` | 5색 JSON | 이미지 자동 분석 |

### 1-2. 없는 것 — 핵심 공백

> **"이 사진이 무엇을 찍은 사진인가?"** 를 명시하는 체계가 없다.

현재 탐색 페이지(ExplorePage)는 색감(`colorMood`)과 비율로만 필터링된다.  
"인물 사진만 보고 싶다", "웨딩 포트폴리오를 찾고 싶다" 는 요구를 충족할 수 없다.

### 1-3. colorMood vs 장르 — 명확한 역할 분리

```
colorMood  =  "어떤 느낌인가?" (색체학 분위기)
  예) 따뜻함·차분함·생동감·로맨틱

장르(genre)  =  "무엇을 찍었는가?" (촬영 주제/목적)
  예) 웨딩·인물·풍경·건축
```

두 분류 기준은 독립적으로 공존한다.  
웨딩 사진이면서 `ROMANTIC` 무드일 수 있고, 풍경 사진이면서 `DRAMATIC` 무드일 수 있다.

---

## 2. 장르 12종 정의

### 결정 원칙
- 한국 사진작가 실무에서 가장 자주 쓰이는 카테고리
- 너무 세분화(30종+)하면 선택 피로 → 12종으로 제한
- 이모지로 아이콘 대체 (외부 라이브러리 불필요)

### 장르 목록

| 코드 | 이모지 | 한글명 | 영문 | 설명 |
|------|--------|--------|------|------|
| `PORTRAIT` | 👤 | 인물 | Portrait | 사람·표정·분위기 중심 |
| `WEDDING` | 💍 | 웨딩 | Wedding | 결혼식·커플·드레스 |
| `LANDSCAPE` | 🏔 | 풍경 | Landscape | 자연 경관·산·바다 |
| `NATURE` | 🌿 | 자연 | Nature | 동식물·꽃·곤충·숲 |
| `STREET` | 🚶 | 스트리트 | Street | 도시 거리·일상 포착 |
| `ARCHITECTURE` | 🏛 | 건축 | Architecture | 건물 외관·인테리어·공간 |
| `FOOD` | 🍽 | 음식 | Food & Café | 요리·카페·음료 |
| `TRAVEL` | ✈️ | 여행 | Travel | 국내외 여행지·풍물 |
| `FASHION` | 👗 | 패션 | Fashion | 의상·스타일링·뷰티 |
| `LIFESTYLE` | ☀️ | 라이프스타일 | Lifestyle | 일상·감성·스냅 |
| `COMMERCIAL` | 📦 | 상업 | Commercial | 제품·브랜드·광고 |
| `FINE_ART` | 🎨 | 파인아트 | Fine Art | 개념적·추상·예술 |

### 다중 선택 규칙

```
주 장르(primary genre): 1개 필수
서브 장르(sub genres):  최대 2개 선택 (선택 사항)

예) 인물(주) + 패션(서브) + 라이프스타일(서브)
    웨딩(주) + 인물(서브)
```

---

## 3. UX 진입점 5가지

### 3-1. 사진 업로드/편집 (PhotoFormPage)

```
장르 선택 섹션을 PhotoForm 메타데이터 패널에 추가

──────────────────────────────────────────────────────────
📌 장르 선택  [주 장르 1개 필수 · 서브 장르 최대 2개]
──────────────────────────────────────────────────────────

[👤 인물] [💍 웨딩] [🏔 풍경] [🌿 자연]
[🚶 스트리트] [🏛 건축] [🍽 음식] [✈️ 여행]
[👗 패션] [☀️ 라이프스타일] [📦 상업] [🎨 파인아트]

주 장르 미선택 시: "장르를 선택해 주세요" 경고 (등록 차단하지 않음, warning만)
```

각 버튼 상태:
```
기본:    border 1px solid border색, bg surface, text textMuted
주 선택: bg primary, color #fff, font-weight 700 — "👤 인물 ✓"
서브 선택: border 2px solid primary, bg primaryLight, color primary
비활성:  opacity 0.4 (주 3개 이상 선택 불가, 서브 3개 이상 선택 불가 시)
```

---

### 3-2. 탐색 페이지 (ExplorePage) — 장르 탭 추가

기존 탐색 페이지에 장르 탭을 **필터 최상단 행**으로 추가한다.

```
┌────────────────────────────────────────────────────────────────┐
│ 🔍 [검색창]                                                    │
├────────────────────────────────────────────────────────────────┤
│ 장르:  [전체] [👤인물] [💍웨딩] [🏔풍경] [🌿자연] [🚶스트리트] →  │  ← 수평 스크롤
│        [🏛건축] [🍽음식] [✈️여행] [👗패션] [☀️라이프] [📦상업] [🎨파인아트]
├────────────────────────────────────────────────────────────────┤
│ 색감:  [전체] [따뜻함] [차가움] [자연] [생동감] ...             │
│ 비율:  [전체] [1:1] [4:3] [3:4] [16:9] [9:16]                │
│ 정렬:  [최신순] [좋아요순] [저장순]                             │
└────────────────────────────────────────────────────────────────┘
```

기존 colorMood·imageRatio 필터와 **AND 조건**으로 결합:
```
장르=PORTRAIT AND colorMood=WARM AND imageRatio=4:3
→ 따뜻한 색감의 4:3 인물 사진만 표시
```

장르 탭 선택 시 URL 반영:
```
/explore?genre=PORTRAIT&colorMood=WARM
```

---

### 3-3. 개인 갤러리 (GalleryPage) — 장르 필터 탭

본인 갤러리에서 장르별로 사진을 필터링한다.

```
툴바 정렬 칩 아래(또는 옆)에 장르 탭 추가:

[전체] [인물] [웨딩] [풍경] ... (해당 작가가 가진 장르만 표시)

예) 이 작가가 인물·웨딩·풍경 사진만 있다면 3개 탭만 표시
```

---

### 3-4. 포트폴리오 페이지 (PortfolioPage) — 장르별 섹션

포트폴리오 sticky 무드 필터가 현재 `colorMood` 기반인데,  
장르 필터를 **추가 옵션**으로 제공한다.

```
Sticky 필터 바:
  [무드별 ↓]  ←→  [장르별 ↓]   ← 드롭다운 또는 탭 전환

장르별 선택 시:
  → 해당 장르 사진만 masonry로 필터 표시
```

방문자가 "이 작가 웨딩 사진만 보고 싶다" 할 때 사용.

---

### 3-5. 사진 상세 (PhotoDetailPage) — 장르 뱃지

```
현재: 무드 배지 (예: VIBRANT)
추가: 장르 뱃지 (예: 👤 인물 · 💍 웨딩)

위치: 제목 아래 무드 배지 옆에 나란히 표시
```

클릭 시 해당 장르 탐색 페이지로 이동:
```
장르 뱃지 클릭 → /explore?genre=PORTRAIT
```

---

## 4. 레이아웃 상세 명세

### 4-1. ExplorePage 장르 탭 컴포넌트

```
GenreTabBar 컴포넌트
  - overflow-x: auto, scrollbar-width: none (모바일 수평 스크롤)
  - 각 탭: padding 8px 16px, border-radius 24px, white-space: nowrap
  - 선택 탭: bg primary, color #fff, box-shadow 0 2px 8px rgba(91,110,245,0.3)
  - 미선택: bg surfaceDim, color textSecondary
  - hover: bg primaryLight, color primary
  - 이모지 + 이름 (예: "👤 인물")
```

### 4-2. PhotoForm 장르 선택 그리드

```
장르 선택 그리드:
  display: grid
  grid-template-columns: repeat(4, 1fr)  /* 4열 */
  gap: 8px

  @media max-width 600px:
    grid-template-columns: repeat(3, 1fr)  /* 모바일 3열 */

각 버튼:
  padding: 10px 6px
  border-radius: 12px
  font-size: 13px
  display: flex, flexDirection: column, alignItems: center, gap: 4px
  이모지: 20px
  이름: 12px

주 장르 선택 방식: 첫 번째 클릭 = 주 선택 (primary bg)
서브 장르: 이미 주 선택된 것 이외 추가 클릭 = 서브 선택 (outline)
같은 것 재클릭: 선택 해제
```

### 4-3. 갤러리 장르 필터 탭

```
위치: 기존 정렬 칩 아래 두 번째 행 (또는 정렬 행과 같은 행에 ... 더보기)

해당 작가 사진에 실제로 있는 장르만 동적으로 표시:
  const genresInGallery = [...new Set(photos.map(p => p.genre).filter(Boolean))]

"전체" 탭: 항상 표시 (genre 필터 없음)
장르 탭: genresInGallery 기반으로 렌더링
```

---

## 5. 데이터 모델 변경

### 5-1. Photo 엔티티 신규 컬럼

```sql
-- 주 장르 컬럼
ALTER TABLE photos ADD COLUMN IF NOT EXISTS genre VARCHAR(20);

-- 서브 장르 (최대 2개) — JSON 배열 문자열로 저장
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sub_genres VARCHAR(60);
-- 예) '["FASHION","LIFESTYLE"]'

-- 인덱스 (탐색 필터 최적화)
CREATE INDEX IF NOT EXISTS idx_photos_genre ON photos(genre);
```

**서브 장르 저장 방식**: JSON 배열 문자열 `'["FASHION","LIFESTYLE"]'`  
→ 파싱 비용이 거의 없고, 추가 조인 테이블 불필요

### 5-2. Photo.java 엔티티 추가

```java
/** 촬영 장르 (PORTRAIT/WEDDING/LANDSCAPE/NATURE/STREET/ARCHITECTURE/FOOD/TRAVEL/FASHION/LIFESTYLE/COMMERCIAL/FINE_ART) */
@Column(name = "genre", length = 20)
private String genre;

/** 서브 장르 목록 (JSON 배열 문자열, 최대 2개) */
@Column(name = "sub_genres", length = 60)
private String subGenres;
```

### 5-3. PhotoResponse DTO 추가

```java
private String genre;
private List<String> subGenres;  // JSON 파싱 후 List로 반환

// fromEntity에서:
.genre(photo.getGenre())
.subGenres(parseSubGenres(photo.getSubGenres()))  // JSON → List
```

### 5-4. PhotoRepository 검색 쿼리 수정

```java
// 기존 JPQL에 genre 조건 추가
@Query("""
  SELECT p FROM Photo p
  WHERE (:keyword IS NULL OR :keyword = '' OR p.title LIKE %:keyword% OR p.description LIKE %:keyword%)
  AND (:colorMood IS NULL OR :colorMood = '' OR p.colorMood = :colorMood)
  AND (:memberId IS NULL OR p.memberId = :memberId)
  AND (:imageRatio IS NULL OR :imageRatio = '' OR p.imageRatio = :imageRatio)
  AND (:genre IS NULL OR :genre = '' OR p.genre = :genre)
""")
List<Photo> search(
  @Param("keyword") String keyword,
  @Param("colorMood") String colorMood,
  @Param("memberId") Long memberId,
  @Param("imageRatio") String imageRatio,
  @Param("genre") String genre,    // ← 추가
  Sort sort
);
```

---

## 6. API 변경

### 6-1. GET /api/photos — genre 파라미터 추가

```
GET /api/photos?genre=PORTRAIT&colorMood=WARM&sortBy=createdAt&order=desc

파라미터:
  genre (선택) — 장르 코드 (PORTRAIT/WEDDING/LANDSCAPE ...)
  subGenres (선택) — 서브 장르 포함 검색 여부 (true/false, 기본 false)
```

### 6-2. PUT /api/photos/:id — genre 수정 허용

```
Body: {
  genre: "PORTRAIT",
  subGenres: ["FASHION", "LIFESTYLE"]  // 선택, 최대 2개
}
```

### 6-3. GET /api/photos/genres/stats — 장르별 통계 (신규)

```
GET /api/photos/genres/stats?memberId=1  (선택)

응답:
{
  "status": "success",
  "data": [
    { "genre": "PORTRAIT", "count": 42 },
    { "genre": "WEDDING",  "count": 18 },
    { "genre": "LANDSCAPE","count": 7  }
  ]
}

용도: 어드민 대시보드 통계 차트, 포트폴리오 장르 탭 동적 생성
```

### 6-4. frontend/services/api.js 수정

```javascript
// photoApi.search에 genre 파라미터 추가
search: ({ keyword, colorMood, memberId, imageRatio, genre, sortBy = 'createdAt', order = 'desc' } = {}) =>
  apiClient.get('/photos', {
    params: {
      ...(keyword    ? { keyword }    : {}),
      ...(colorMood  ? { colorMood }  : {}),
      ...(memberId   ? { memberId }   : {}),
      ...(imageRatio ? { imageRatio } : {}),
      ...(genre      ? { genre }      : {}),  // ← 추가
      sortBy, order,
    },
  }),

// 장르 통계 신규
getGenreStats: (memberId) =>
  apiClient.get('/photos/genres/stats', { params: memberId ? { memberId } : {} }),
```

---

## 7. 자동 장르 추천 (AutoTagService 확장)

기존 `AutoTagService`가 제목·설명·무드에서 태그를 추출한다.  
같은 방식으로 **장르도 자동 추천**한다.

### 키워드 → 장르 매핑 테이블

```java
private static final Map<String, String> GENRE_KEYWORDS = Map.ofEntries(
  // 인물
  Map.entry("인물", "PORTRAIT"), Map.entry("portrait", "PORTRAIT"),
  Map.entry("사람", "PORTRAIT"), Map.entry("얼굴", "PORTRAIT"),
  // 웨딩
  Map.entry("웨딩", "WEDDING"), Map.entry("wedding", "WEDDING"),
  Map.entry("결혼", "WEDDING"), Map.entry("신부", "WEDDING"), Map.entry("신랑", "WEDDING"),
  // 풍경
  Map.entry("풍경", "LANDSCAPE"), Map.entry("landscape", "LANDSCAPE"),
  Map.entry("산", "LANDSCAPE"), Map.entry("바다", "LANDSCAPE"), Map.entry("하늘", "LANDSCAPE"),
  // 자연
  Map.entry("꽃", "NATURE"), Map.entry("나무", "NATURE"), Map.entry("동물", "NATURE"),
  // 스트리트
  Map.entry("거리", "STREET"), Map.entry("street", "STREET"), Map.entry("도시", "STREET"),
  // 건축
  Map.entry("건물", "ARCHITECTURE"), Map.entry("건축", "ARCHITECTURE"),
  // 음식
  Map.entry("음식", "FOOD"), Map.entry("카페", "FOOD"), Map.entry("커피", "FOOD"),
  // 여행
  Map.entry("여행", "TRAVEL"), Map.entry("travel", "TRAVEL"),
  // 패션
  Map.entry("패션", "FASHION"), Map.entry("fashion", "FASHION"), Map.entry("의상", "FASHION"),
  // 라이프스타일
  Map.entry("일상", "LIFESTYLE"), Map.entry("라이프", "LIFESTYLE"),
  // 상업
  Map.entry("제품", "COMMERCIAL"), Map.entry("브랜드", "COMMERCIAL"),
  // 파인아트
  Map.entry("추상", "FINE_ART"), Map.entry("예술", "FINE_ART")
);

public String suggestGenre(String title, String description) {
  String combined = ((title != null ? title : "") + " " + (description != null ? description : "")).toLowerCase();
  return GENRE_KEYWORDS.entrySet().stream()
    .filter(e -> combined.contains(e.getKey()))
    .map(Map.Entry::getValue)
    .findFirst()
    .orElse(null);  // 매칭 없으면 null (사용자가 직접 선택)
}
```

**UI 연동**: 제목·설명 입력 후 자동 추천된 장르를 연한 배경으로 제안:
```
💡 AI 추천 장르: [👤 인물] — 제목 기반 추천  [적용] [무시]
```

---

## 8. 어드민 연동

### AdminDashboardPage — 장르별 통계 카드 추가

```
기존 통계 카드: 전체 사진 수 | 전체 회원 수 | 미읽음 문의
추가: 장르별 사진 분포 차트 (도넛 또는 가로 바 차트)

Chart 방식: Canvas API (외부 라이브러리 없음)
  → 각 장르 비율을 arc로 그리는 간단한 도넛 차트

또는 단순 목록:
  👤 인물    ████████░░  82장 (38%)
  💍 웨딩    █████░░░░░  51장 (24%)
  🏔 풍경    ███░░░░░░░  29장 (13%)
  ...
```

---

## 9. 컴포넌트 목록

| 컴포넌트 | 위치 | 역할 |
|---------|------|------|
| `GenreTabBar` | `components/common/` | 장르 탭 수평 스크롤 목록 (ExplorePage/GalleryPage 공용) |
| `GenreSelector` | `components/photo/` | 업로드 시 주·서브 장르 선택 그리드 |
| `GenreBadge` | `components/photo/` | 단일 장르 배지 (PhotoDetailPage, PhotoCard) |
| `GenreStats` | `components/admin/` | 어드민 장르 통계 목록 |

### GenreTabBar Props

```javascript
GenreTabBar({
  genres: string[],        // 표시할 장르 목록 (전체 12개 or 동적)
  selected: string,        // 현재 선택 장르
  onChange: (genre) => void,
  showAll?: boolean,       // "전체" 탭 표시 여부 (기본 true)
  counts?: { [genre]: number },  // 선택 사항: 각 장르 사진 수 표시
})
```

### GenreSelector Props

```javascript
GenreSelector({
  primaryGenre: string | null,
  subGenres: string[],
  onChangePrimary: (genre) => void,
  onChangeSubGenres: (genres) => void,
  suggestedGenre?: string,  // AI 추천 장르
})
```

---

## 10. colors.js 추가 상수

```javascript
// constants/colors.js에 추가
export const GENRE_META = {
  PORTRAIT:     { emoji: '👤', label: '인물',        color: '#8B5CF6' },
  WEDDING:      { emoji: '💍', label: '웨딩',        color: '#EC4899' },
  LANDSCAPE:    { emoji: '🏔', label: '풍경',        color: '#3B82F6' },
  NATURE:       { emoji: '🌿', label: '자연',        color: '#10B981' },
  STREET:       { emoji: '🚶', label: '스트리트',     color: '#6B7280' },
  ARCHITECTURE: { emoji: '🏛', label: '건축',        color: '#F59E0B' },
  FOOD:         { emoji: '🍽', label: '음식',        color: '#EF4444' },
  TRAVEL:       { emoji: '✈️', label: '여행',        color: '#06B6D4' },
  FASHION:      { emoji: '👗', label: '패션',        color: '#A855F7' },
  LIFESTYLE:    { emoji: '☀️', label: '라이프스타일', color: '#F97316' },
  COMMERCIAL:   { emoji: '📦', label: '상업',        color: '#64748B' },
  FINE_ART:     { emoji: '🎨', label: '파인아트',    color: '#84CC16' },
};

export const GENRE_LIST = Object.entries(GENRE_META).map(([code, meta]) => ({
  code, ...meta,
}));
```

---

## 11. 반응형 설계

| 화면 | GenreTabBar | GenreSelector |
|------|------------|---------------|
| ≥1024px | 탭 전체 1행 표시 | 4열 그리드 |
| 768~1023px | 수평 스크롤 | 4열 그리드 |
| <768px | 수평 스크롤 (스크롤바 숨김) | 3열 그리드 |
| <480px | 수평 스크롤, 이모지만 표시 (글자 숨김) | 3열 그리드 |

모바일 스크롤 힌트: 우측에 페이드 그라디언트로 더 있음을 표시

---

## 12. 마이그레이션 전략

### 기존 데이터 처리

기존 사진들은 `genre = null` 상태로 시작.

**옵션 A (권장) — 소극적 점진적**: 기존 사진은 분류 없음, 새로 업로드/편집 시에만 선택  
**옵션 B — 적극적 일괄**: AutoTagService 기반으로 기존 사진 장르 자동 배치 (오류 가능성 있음)

권장은 **옵션 A**. 탐색 결과에서 `genre=null` 사진은 "분류 없음" 으로 처리하거나 "전체" 탭에서만 표시.

---

## 13. 스프린트 계획

### Sprint 1 — 기반 (1주)

| 작업 | 파일 | 예상 시간 |
|------|------|---------|
| DB 컬럼 추가 + Photo 엔티티 수정 | `Photo.java`, SQL migration | 1h |
| PhotoRepository `genre` 파라미터 추가 | `PhotoRepository.java` | 1h |
| PhotoController `genre` 파라미터 파싱 | `PhotoController.java` | 1h |
| `GENRE_META` 상수 추가 | `constants/colors.js` | 0.5h |
| `GenreSelector` 컴포넌트 구현 | `GenreSelector.jsx` | 3h |
| PhotoFormPage에 GenreSelector 삽입 | `PhotoFormPage.jsx` | 1h |
| api.js `genre` 파라미터 추가 | `services/api.js` | 0.5h |

### Sprint 2 — 탐색·갤러리 통합 (1주)

| 작업 | 파일 | 예상 시간 |
|------|------|---------|
| `GenreTabBar` 컴포넌트 구현 | `GenreTabBar.jsx` | 2h |
| ExplorePage 장르 탭 행 추가 | `ExplorePage.jsx` | 2h |
| GalleryPage 장르 필터 탭 추가 | `GalleryPage.jsx` | 2h |
| `GenreBadge` 컴포넌트 구현 | `GenreBadge.jsx` | 1h |
| PhotoDetailPage 장르 뱃지 추가 | `PhotoDetailPage.jsx` | 1h |
| URL params 연동 (`/explore?genre=PORTRAIT`) | `ExplorePage.jsx` | 1h |

### Sprint 3 — 고도화 (1주)

| 작업 | 파일 | 예상 시간 |
|------|------|---------|
| AutoTagService `suggestGenre()` 추가 | `AutoTagService.java` | 2h |
| AI 장르 추천 UI (PhotoForm) | `PhotoFormPage.jsx` | 1h |
| 장르 통계 API `GET /photos/genres/stats` | `PhotoController.java` | 1.5h |
| AdminDashboardPage 장르 통계 추가 | `AdminDashboardPage.jsx` | 2h |
| PortfolioPage 장르 필터 연동 | `PortfolioPage.jsx` | 1.5h |

---

## 14. 수용 기준 (Acceptance Criteria)

### AC-01. 장르 선택 (업로드)
- [ ] PhotoFormPage에 12종 장르 선택 UI가 표시된다
- [ ] 주 장르 1개를 primary 스타일로 선택할 수 있다
- [ ] 서브 장르를 최대 2개 추가 선택할 수 있다
- [ ] 선택한 장르가 저장되고 수정 시 유지된다
- [ ] AI 추천 장르가 표시되고 "적용" 클릭 시 자동 선택된다 (Sprint 3)

### AC-02. 탐색 페이지 필터
- [ ] ExplorePage 최상단에 장르 탭이 수평 스크롤로 표시된다
- [ ] 장르 탭 선택 시 해당 장르 사진만 표시된다
- [ ] 장르 + colorMood + imageRatio 복합 필터가 AND 조건으로 동작한다
- [ ] URL에 genre 파라미터가 반영되고 새로고침 후에도 유지된다

### AC-03. 갤러리 페이지
- [ ] 개인 갤러리에서 본인 사진에 있는 장르만 탭으로 표시된다
- [ ] "전체" 탭 선택 시 모든 사진이 표시된다

### AC-04. 사진 상세
- [ ] 사진 상세 페이지에서 장르 뱃지가 무드 뱃지 옆에 표시된다
- [ ] 장르 뱃지 클릭 시 해당 장르 탐색 페이지로 이동한다

### AC-05. 어드민
- [ ] AdminDashboardPage에 장르별 사진 수 통계가 표시된다

---

## 15. Claude.ai 아티팩트 프롬프트 (시각 목업용)

```
아래 스펙으로 "사진 장르 분류 시스템" React 컴포넌트 목업을 만들어줘.

[요구사항]

1. GenreTabBar 컴포넌트
   - 수평 스크롤 탭 바
   - "전체" + 12개 장르 탭 (이모지+이름)
   - 선택 탭: primary 배경, 흰색 텍스트
   - 미선택: surfaceDim 배경, textSecondary
   - 오른쪽 페이드 그라디언트 (더 있음 힌트)

2. GenreSelector 컴포넌트 (PhotoForm용)
   - 12개 장르 4열 그리드
   - 주 장르: primary 배경 + ✓
   - 서브 장르: primary 테두리 + primaryLight 배경
   - 비선택: 기본 테두리 + surface 배경
   - AI 추천 배너: "💡 AI 추천: 👤 인물 — [적용] [무시]"

3. 탐색 페이지(ExplorePage) 상단 레이아웃
   - 검색창 (full width)
   - GenreTabBar (장르 1행)
   - colorMood 칩 (기존과 동일)
   - 2열 사진 그리드 미리보기 (placeholder)

4. 사진 상세 장르 뱃지 샘플
   - 🏔 풍경 (solid 뱃지)
   - ☀️ 라이프스타일 (outline 뱃지, 서브 장르)

[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary: '#5b6ef5', primaryDark: '#4458e0', primaryLight: '#eef0ff'
  accent: '#a78bfa'
  bg: '#f7f7fb', surface: '#ffffff', surfaceDim: '#ededf4', border: '#e5e5ed'
  text: '#0f0f1a', textSecondary: '#5555aa', textMuted: '#8888bb'
  danger: '#e53e3e', success: '#22c55e'
  darkBg: '#0a0a18', darkSurface: '#12122a'
  galleryBg: '#0e0e0e'

규칙:
- export default 함수형 컴포넌트 1개
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- useState로 선택 상태 관리
```

---

## 16. 기존 분류 체계와의 관계 정리

```
Photo 분류 레이어:
  
  Layer 1 — 무엇을 찍었나?    → genre (장르 12종)           ← 이번 추가
  Layer 2 — 어떤 느낌인가?    → colorMood (색감 무드 11종)  ← 기존
  Layer 3 — 어떤 비율인가?    → imageRatio (5종)            ← 기존
  Layer 4 — 어떤 키워드?      → tags (자유 태그)            ← 기존
  Layer 5 — 어떤 그룹인가?    → Series (시리즈)             ← 기존

탐색 가능 조합 예시:
  [👤 인물] + [ROMANTIC 로맨틱] + [4:3]
  → 로맨틱한 색감의 4:3 인물 사진
  
  [💍 웨딩] + [WARM 따뜻함]
  → 따뜻한 색감의 웨딩 사진
  
  [🏔 풍경] + [DRAMATIC 극적임] + [16:9]
  → 극적인 16:9 풍경 사진
```
