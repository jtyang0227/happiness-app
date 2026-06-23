# 08 — 컬러 팔레트 추출 + 사진 상세 페이지 강화

> P1: 컬러 팔레트 컴포넌트 · 이전/다음 네비게이션 · 공유 버튼  
> P2: 전체화면 뷰어 · 관련 사진 · 시리즈 컨텍스트 배지 · 인쇄 모드

---

## 저장 경로

```
frontend/src/
  hooks/useColorExtraction.js          (신규 — Canvas K-means 색상 추출)
  components/photo/ColorPalette.jsx    (신규 — 5색 팔레트 표시)
  components/photo/PhotoViewer.jsx     (신규 — 전체화면 뷰어)
  components/photo/RelatedPhotos.jsx   (신규 — 관련 사진 추천)
  components/photo/SeriesBadge.jsx     (신규 — 시리즈 컨텍스트 배지)
  pages/PhotoDetailPage.jsx            (수정 — 위 컴포넌트 통합)
```

---

## 기획 배경

현재 `PhotoDetailPage`는 이미지·좋아요/저장·EXIF·댓글 정도만 있다.  
포트폴리오 앱으로서 **작가의 색채 감각을 보여주는 팔레트**, **몰입 감상을 위한 전체화면**, **포트폴리오 내 연결성(시리즈·관련작)**이 빠져 있다.

---

## [1] 대표 컬러 팔레트 — useColorExtraction + ColorPalette

### 추출 알고리즘

```
1. <img> → hidden <canvas> (200×200 리사이즈)
2. getImageData() 로 픽셀 데이터 취득
3. 40×40 간격으로 25개 샘플 픽셀 추출 (속도 최적화)
4. 단순 K-means 5회 반복으로 5개 클러스터 센트로이드 선정
5. 각 센트로이드 → #RRGGBB hex 변환 반환
6. 명도 기준 정렬 (어두운 → 밝은 순)
```

**저장 정책:** 프론트에서 추출 → `PUT /api/photos/:id` 수정 시 `dominantColors` 필드로 함께 저장. 상세 조회 시 `photo.dominantColors` 배열로 반환.

**백엔드 추가 작업:**
```sql
ALTER TABLE photos ADD COLUMN IF NOT EXISTS dominant_colors VARCHAR(200);
-- 예시 값: '["#1a1a2e","#4a0e8f","#e8b4b8","#f5e6ca","#ffffff"]'
```

---

### claude.ai 아티팩트 프롬프트 — useColorExtraction

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 hooks, Canvas API, 외부 라이브러리 없음
규칙: export default 함수형 훅 1개만 반환

useColorExtraction 커스텀 훅을 만들어주세요.

시그니처: useColorExtraction(imageUrl)
반환: { colors: string[], loading: boolean, error: string|null }

colors: HEX 색상 5개 배열 (예: ['#1a1a2e', '#4a0e8f', ...])
        이미지 로드 전 = [] / 로드 실패 = [] + error

동작:
  1. imageUrl 변경 시 Image 객체 생성 + crossOrigin='anonymous' 설정
  2. onload: hidden Canvas(200×200)에 drawImage
  3. getImageData() → Uint8ClampedArray
  4. 40px 간격으로 픽셀 샘플링 (25개 × RGB)
  5. simple K-means (k=5, 10회 반복)으로 클러스터링
  6. 센트로이드 5개를 명도(0.299R+0.587G+0.114B) 오름차순 정렬
  7. '#RRGGBB' hex 변환 후 colors 업데이트
  8. 동일 imageUrl 재요청 시 캐싱 (useRef Map)

예외처리: CORS 오류 시 error 상태 설정, colors = []
```

---

### claude.ai 아티팩트 프롬프트 — ColorPalette 컴포넌트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호
컬러: primary '#5b6ef5' text '#0f0f1a' textMuted '#8888bb' surface '#ffffff'
      border '#e5e5ed' darkSurface '#0f0f0f' darkBorder 'rgba(255,255,255,0.07)' darkText '#e8e8f0'
규칙: export default 함수형 컴포넌트 1개, style inline object, 외부 라이브러리 없음, 한국어 UI

ColorPalette 컴포넌트를 만들어주세요.

Props:
- colors: string[]  (HEX 5개. 빈 배열이면 스켈레톤 표시)
- loading: boolean
- theme: 'light'|'dark'  (기본 'light')
- onColorCopy?: (hex: string) => void

레이아웃:
  섹션 타이틀: "대표 색상" 13px 500 textSecondary + 오른쪽 "클릭하여 복사" 11px textMuted
  색상 바: flex row, gap 6px
    각 색상 칩:
      - 크기: flex 1, height 44px, border-radius 10px
      - 배경: colors[i]
      - hover: 위로 translateY(-3px) + scale(1.04)
      - 클릭: navigator.clipboard.writeText(hex) + 2초간 ✓ 오버레이 표시
      - 하단 HEX 텍스트: 11px, 색상 대비에 따라 white/black 자동 (밝기 판별)

로딩 상태(loading=true):
  5개 칩 자리에 shimmer 애니메이션 (linear-gradient 1.5s)

빈 상태(colors=[]):
  "색상 추출 실패" textMuted 12px 중앙

접근성:
  각 칩에 aria-label="색상 {hex} 복사" + role="button" + tabIndex 0 + onKeyDown Enter

데모: 임의 5색 + loading 상태 나란히 표시
```

---

## [2] 이전/다음 사진 네비게이션

### 동작

- `GET /api/photos?memberId=` 로 해당 작가 사진 전체 목록 캐싱
- 현재 `photoId` 기준으로 prev/next id 계산
- 좌우 Arrow 버튼 (고정 위치, 이미지 중앙 양쪽)
- 키보드: `←` `→` 키 이벤트
- URL 변경: `navigate(\`/photo/\${id}\`)`

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style
컬러: galleryBg '#090909' surface '#ffffff' text '#0f0f1a' textMuted '#8888bb'
      primary '#5b6ef5'
규칙: export default 함수형 컴포넌트, style inline object, 외부 라이브러리 없음

PhotoNavigation 컴포넌트를 만들어주세요.

Props:
- currentId: number
- photoList: { id: number }[]  (순서 배열, 비어있으면 버튼 숨김)
- onNavigate: (id: number) => void

UI:
  이전 버튼: 이미지 좌측 세로 중앙, position absolute, left -20px
    원형 42px, rgba(0,0,0,0.45) bg, border '1px solid rgba(255,255,255,0.15)'
    내용: ‹ (유니코드 ‹), color #fff, fontSize 22px
    hover: rgba(0,0,0,0.7) bg + scale(1.06)
  다음 버튼: 우측, right -20px, 동일 스타일, › (›)

  첫 번째 사진이면 이전 버튼 opacity 0.3 + pointerEvents none
  마지막 사진이면 다음 버튼 동일

  키보드:
    useEffect → window.addEventListener('keydown')
    ArrowLeft: prevId 이동 / ArrowRight: nextId 이동
    unmount 시 removeEventListener

  position: relative wrapper 필요 (부모에서 설정)
```

---

## [3] 공유 버튼 (URL 복사)

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18, inline style
컬러: primary '#5b6ef5' primaryLight '#eef0ff' text '#0f0f1a' textMuted '#8888bb'
      surface '#fff' border '#e5e5ed'

ShareButton 컴포넌트를 만들어주세요.

Props:
- url?: string  (미지정이면 window.location.href 사용)
- title?: string  (사진 제목, Web Share API용)
- theme: 'light'|'dark'

UI:
  버튼: 40px 높이, border-radius 10px, border '1.5px solid border'
        아이콘 ↗ + "공유" 텍스트, fontSize 14px
        hover: primaryLight bg

  동작:
    1. navigator.share({ title, url }) 지원 시 → Web Share API 호출
    2. 미지원 시 → navigator.clipboard.writeText(url)
    3. 성공: 버튼 내용 "✓ 복사됨" 으로 2초 변경 후 원복
    4. 실패: 버튼 내용 "✗ 실패" 1.5초 표시

dark theme: bg 'rgba(255,255,255,0.07)', color '#e8e8f0', border 'rgba(255,255,255,0.15)'

데모: light / dark 나란히 + 복사 성공 상태 미리보기
```

---

## [4] 전체화면 뷰어 (PhotoViewer)

### 동작

- 이미지 클릭 → 전체화면 오버레이 (z-index 1000)
- 배경: #000, 이미지 object-fit: contain, 최대 95vw × 90vh
- ESC 키 또는 배경 클릭으로 닫기
- 이전/다음 네비게이션 포함 (좌우 버튼)
- 좌상단 ✕ 닫기 버튼
- 우하단 다운로드 버튼 (선택적)

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style
규칙: export default 함수형 컴포넌트, style inline object, 외부 라이브러리 없음

PhotoViewer 전체화면 오버레이 컴포넌트를 만들어주세요.

Props:
- isOpen: boolean
- imageUrl: string
- title: string
- onClose: () => void
- onPrev?: () => void
- onNext?: () => void
- hasPrev?: boolean
- hasNext?: boolean

UI:
  오버레이:
    position fixed, inset 0, bg rgba(0,0,0,0.96), z-index 1000
    display flex, alignItems center, justifyContent center
    isOpen=false → return null

  이미지:
    max-width 95vw, max-height 88vh, object-fit contain
    cursor zoom-out (클릭 시 닫기)

  상단 바 (position absolute, top 0, 좌우 padding 16px, height 56px):
    좌: 제목 14px color rgba(255,255,255,0.8)
    우: 닫기 버튼 ✕ 36px 원형 rgba(255,255,255,0.15)

  이전/다음 버튼 (position absolute, top 50%, transform translateY(-50%)):
    이전: left 12px / 다음: right 12px
    50px 원형 rgba(255,255,255,0.2)
    ‹ / › 28px 흰색
    hasPrev/hasNext=false → opacity 0.2 pointerEvents none

  키보드 이벤트 (useEffect):
    Escape → onClose / ArrowLeft → onPrev / ArrowRight → onNext

  배경 클릭 닫기 (e.target === overlay element 확인)

  mount 시 body overflow hidden, unmount 시 복원

@keyframes fadeIn: opacity 0→1, duration 0.15s
```

---

## [5] 관련 사진 추천 (RelatedPhotos)

### 추천 로직

- 현재 사진의 `colorMood` 기준으로 `GET /api/photos?colorMood=&order=desc&limit=6` 호출
- 현재 사진 제외, 최대 6개 표시
- 각 카드: 정사각형 썸네일 + hover 시 제목 오버레이

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style
컬러: bg '#f7f7fb' surface '#fff' text '#0f0f1a' textMuted '#8888bb'
      border '#e5e5ed' primary '#5b6ef5'
규칙: export default 함수형 컴포넌트, style inline object, 외부 라이브러리 없음, 한국어 UI

RelatedPhotos 컴포넌트를 만들어주세요.

Props:
- photos: { id, imageUrl, title }[]  (최대 6개, 부모에서 API 호출 후 전달)
- onPhotoClick: (id: number) => void

UI:
  섹션 타이틀: "관련 사진" 14px 600 text
  그리드: display grid, grid-template-columns repeat(3, 1fr) (모바일: 2컬럼), gap 8px

  각 카드:
    aspect-ratio 1/1, border-radius 10px, overflow hidden, cursor pointer
    이미지: object-fit cover, width 100%, height 100%
    hover:
      이미지 scale(1.06) transition 0.3s
      하단 gradient overlay rgba(0,0,0,0) → rgba(0,0,0,0.7)
      제목: 하단 고정, 12px, color #fff, padding 8px
      transition 0.25s

  빈 상태 (photos.length === 0):
    표시하지 않음 (return null)

  로딩 상태 없음 (부모에서 photos 전달 전 렌더 안 함)

데모: 임의 6장 사진 그리드 + hover 상태 미리보기
```

---

## [6] 시리즈 컨텍스트 배지 (SeriesBadge)

### 동작

- 현재 사진이 속한 시리즈 목록 조회: `GET /api/series?memberId=` 후 클라이언트 필터
- 속한 시리즈가 있으면 배지 표시
- 클릭 시 PortfolioPage의 시리즈 탭으로 이동

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18, React Router v6, inline style
컬러: primary '#5b6ef5' primaryLight '#eef0ff' text '#0f0f1a' accent '#a78bfa'
      darkSurface '#0f0f0f' darkBorder 'rgba(255,255,255,0.07)' darkText '#e8e8f0'
규칙: export default 함수형 컴포넌트, 외부 라이브러리 없음, 한국어 UI

SeriesBadge 컴포넌트를 만들어주세요.

Props:
- series: { id: number, title: string }[]  (빈 배열이면 null 반환)
- portfolioUrl?: string  (클릭 시 이동 경로)
- theme: 'light'|'dark'

UI:
  타이틀: "📚 수록된 시리즈" 12px textMuted
  배지 목록 (flex wrap gap 6px):
    각 배지: height 26px, border-radius 13px, padding 0 10px
    배경: primaryLight / dark: rgba(91,110,245,0.15)
    텍스트: primary '#5b6ef5', fontSize 12px, fontWeight 600
    hover: primary bg, color #fff
    클릭: Link 또는 onNavigate 호출

series.length === 0 → return null
series 한 개만 있으면 배지 하나, 여러 개면 모두 표시 (최대 3개, 초과 시 "+N" 배지)

데모: 시리즈 2개 포함 / 0개(숨김) 상태 비교
```

---

## [7] 인쇄 모드 (포트폴리오 PDF 내보내기)

### 동작

- "🖨️ 인쇄" 버튼 클릭 → `window.print()`
- `@media print` CSS: 헤더/댓글/버튼 숨기고 이미지+메타+EXIF+팔레트만 출력

### 통합 방법

`PhotoDetailPage.jsx`에 `<style>` 태그로 print CSS 삽입:

```jsx
<style>{`
  @media print {
    header, nav, .no-print, .comments-section { display: none !important; }
    body { background: #fff !important; }
    .photo-detail-image { max-width: 100%; height: auto; }
    .photo-meta { break-inside: avoid; }
  }
`}</style>
```

인쇄 버튼은 정보 섹션 하단에 `no-print` 클래스 없이 배치.

---

## PhotoDetailPage 통합 구조

```jsx
// 사진 정보 섹션 내 배치 순서
1. 작가 정보 (아바타 + 이름 + 날짜)
2. 제목 + 무드 배지
3. 설명 텍스트
4. [좋아요] [저장] [ShareButton] [🖨️ 인쇄]
5. SeriesBadge (속한 시리즈)
6. ColorPalette (5색 팔레트) ← 신규
7. EXIF 메타데이터 카드
8. 태그 칩 목록
9. RelatedPhotos (관련 사진 6개) ← 신규
10. CommentsSection

// 이미지 섹션
<PhotoViewer> 래핑 (클릭 시 전체화면)
<PhotoNavigation> 오버레이 (좌우 이전/다음)
```

---

## 백엔드 추가 작업

### Photo 엔티티 필드 추가

```java
@Column(name = "dominant_colors", length = 200)
private String dominantColors;  // JSON 배열 문자열: '["#1a1a2e","#4a0e8f",...]'
```

### PhotoResponse 필드 추가

```java
private List<String> dominantColors;  // JSON 파싱 후 반환

// fromEntity() 내부:
.dominantColors(entity.getDominantColors() != null
    ? List.of(entity.getDominantColors().replaceAll("[\\[\\]\"]", "").split(","))
    : List.of())
```

### 운영 DB 마이그레이션

```sql
ALTER TABLE photos ADD COLUMN IF NOT EXISTS dominant_colors VARCHAR(200);
```
