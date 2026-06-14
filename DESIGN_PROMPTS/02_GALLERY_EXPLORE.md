# 02 — 갤러리 & 탐색 개선 (반응형 · 정렬 · 무한스크롤)

> P0: 갤러리 모바일 반응형 / P1: 탐색 정렬·필터 / P2: 무한 스크롤

---

## 저장 경로

```
frontend/src/
  hooks/useBreakpoint.js
  hooks/useInfiniteScroll.js
  pages/GalleryPage.jsx      (수정)
  pages/ExplorePage.jsx      (수정)
```

---

## [1] useBreakpoint 훅 + 갤러리 반응형

### 현재 문제

`GalleryPage`의 `columns: '4 200px'` 고정 → 모바일에서 4컬럼이 그대로 표시됨.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryLight '#eef0ff' galleryBg '#0e0e0e'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

두 가지를 만들어주세요.

1. useBreakpoint 훅 (hooks/useBreakpoint.js)
   window.innerWidth 구독, resize 이벤트 리스너 등록 + cleanup
   반환: isMobile(<768) isTablet(768~1023) isDesktop(≥1024) isWide(≥1440) width

2. 반응형 갤러리 마소닉 그리드 데모
   useBreakpoint로 컬럼 수 결정:
     isMobile → 2컬럼 갭 2px
     isTablet → 3컬럼 갭 2px
     isDesktop → 4컬럼 갭 3px
     isWide → 5컬럼 갭 3px
   CSS: columns '{n} 200px', columnGap '{gap}px'
   배경: #0e0e0e
   더미 카드: 20개, 높이는 idx%5 에 따라 160/220/180/260/200px (Math.random 사용 금지)
   좌상단 현재 브레이크포인트 배지: "모바일 2컬럼" 등 primary bg white 텍스트
```

### 통합 방법

```jsx
// GalleryPage.jsx
import { useBreakpoint } from '../hooks/useBreakpoint'
const { isMobile, isTablet, isWide } = useBreakpoint()
const columns = isWide ? 5 : isTablet ? 3 : isMobile ? 2 : 4
const gap = isMobile ? 2 : 3
// style: columns: `${columns} 200px`, columnGap: `${gap}px`
```

---

## [2] 탐색 페이지 정렬 · 필터 UX 개선

### 추가 기능

- 정렬 드롭다운: 최신순 / 인기순 / 저장순
- 검색 결과 수: "N개의 사진"
- 활성 필터 배지 (검색어, 분위기) + 개별 × 삭제
- 검색어 debounce 300ms

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryLight '#eef0ff' bg '#f5f5fa' surface '#fff'
      border '#e2e2ee' text '#1a1a2e' textSecondary '#5c5c7a' textMuted '#9090b0'
MOOD_COLORS:
  WARM {dot:'#FF7043' bg:'#FFF3E0' label:'따뜻함'} ENERGETIC {dot:'#FFB300' bg:'#FFFDE7' label:'활기참'}
  VIBRANT {dot:'#FF4081' bg:'#FFF9C4' label:'생동감'} ROMANTIC {dot:'#E91E63' bg:'#FCE4EC' label:'로맨틱'}
  NATURAL {dot:'#43A047' bg:'#E8F5E9' label:'자연스러움'} COOL {dot:'#1E88E5' bg:'#E3F2FD' label:'시원함'}
  SERENE {dot:'#5E35B1' bg:'#EDE7F6' label:'고요함'} MUTED {dot:'#9E9E9E' bg:'#F5F5F5' label:'차분함'}
  DRAMATIC {dot:'#37474F' bg:'#ECEFF1' label:'드라마틱'} CLEAN {dot:'#90A4AE' bg:'#F8F9FA' label:'깔끔함'}
  MONOCHROME {dot:'#607D8B' bg:'#ECEFF1' label:'흑백'}
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

ExplorePage 상단 필터/정렬 영역 + 결과 그리드를 만들어주세요 (목 데이터 9개).

상태: search, selectedMood, sortBy('latest'|'popular'|'saved'), debouncedSearch(300ms)

1. 검색바 행
   전체 너비 input (좌측 🔍 아이콘, 우측 × 클리어, height 42px, radius 10px)
   + 우측 정렬 드롭다운 (최신순/인기순/저장순, height 42px, radius 8px)
   bg surface, border-bottom 1px, padding 16px 24px sticky top

2. 분위기 필터 칩 행 (가로 스크롤, scrollbar 숨김)
   "전체" 칩 + 11개 분위기 칩
   각 칩: colored dot(6px) + 이름
   비활성: bg surface border '#e2e2ee' color textSecondary
   활성: bg primary border primary color white
   height 32px radius 99px padding 0 12px gap 8px

3. 결과 헤더 행
   좌: "{n}개의 사진" 14px textSecondary
   우: 활성 필터 배지들 (primaryLight bg, primary text, radius 99px, × 버튼)
       [모두 초기화] textMuted 텍스트 버튼

4. 그리드 (auto-fill minmax(260px,1fr), gap 16px)
   목 카드 9개, sortBy에 따라 정렬
   각 카드: 이미지(aspect-ratio 4/3 bg surfaceDim) + 배지 + 제목 + 좋아요수

5. 결과 없음: 🔍 + "검색 결과가 없습니다" + [필터 초기화] 버튼

모바일(375px): 분위기 칩 가로 스크롤, 검색바+드롭다운 세로 스택
```

### 통합 방법

```jsx
// ExplorePage.jsx debounce 추가
function useDebounce(value, delay) {
  const [d, setD] = useState(value)
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t) }, [value, delay])
  return d
}
// 정렬
const sorted = useMemo(() => {
  const r = [...filtered]
  if (sortBy === 'popular') r.sort((a,b) => b.likeCount - a.likeCount)
  if (sortBy === 'saved') r.sort((a,b) => b.saveCount - a.saveCount)
  return r
}, [filtered, sortBy])
```

---

## [3] 무한 스크롤 (P2)

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' textMuted '#9090b0' galleryBg '#0e0e0e' surface '#fff'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

두 가지를 만들어주세요.

1. useInfiniteScroll 훅 (hooks/useInfiniteScroll.js)
   Parameters: fetchFn(page)=>Promise<{items,hasMore}>, pageSize(기본 20)
   반환: items, loading, loadingMore, hasMore, error, sentinelRef, retry
   동작: 마운트 시 page 0 로드, sentinelRef IntersectionObserver(threshold 0.1) 감지 → hasMore && !loadingMore 이면 page+1, items concat
   cleanup: observer disconnect

2. 무한 스크롤 갤러리 데모
   더미 100개 사진, fetchFn setTimeout 1000ms 시뮬레이션 (페이지당 12개)
   갤러리 스타일: 검은 배경 masonry 4컬럼
   첫 로드: 스켈레톤 (높이 다른 placeholder 12개)
   추가 로드: 하단 스피너 "더 불러오는 중..." primary색
   완료: "모든 사진을 다 봤습니다 ✓" textMuted 중앙
   에러: "불러오기 실패" + [다시 시도] 버튼
   sentinel: height 1px 그리드 최하단 ref 연결
```

### 통합 방법

```jsx
// GalleryPage.jsx
const { items: photos, loadingMore, hasMore, sentinelRef } = useInfiniteScroll({
  fetchFn: async (page) => {
    const res = await photoApi.getAll({ page, size: 20 })
    return { items: res.content, hasMore: !res.last }
  }
})
// 그리드 후: <div ref={sentinelRef} style={{height:1}} />
// {loadingMore && <Spinner />}
// {!hasMore && photos.length > 0 && <p>모든 사진을 다 봤습니다 ✓</p>}
```

> **주의**: 백엔드 `GET /api/photos?page=0&size=20` 페이지네이션 지원이 선행되어야 함.  
> 백엔드 미지원 시 훅만 구현해두고 연결은 보류.

---

## 완료 체크리스트

- [ ] useBreakpoint.js 생성 + GalleryPage 컬럼 동적 적용
- [ ] 모바일 2컬럼 / 태블릿 3컬럼 확인
- [ ] ExplorePage 정렬 드롭다운 추가
- [ ] 검색어 debounce 300ms
- [ ] 활성 필터 배지 + 초기화
- [ ] useInfiniteScroll.js 생성 (P2)
- [ ] GalleryPage 무한 스크롤 연결 (P2, 백엔드 지원 후)
- [ ] ExplorePage 무한 스크롤 연결 (필터 변경 시 page 초기화 주의)
