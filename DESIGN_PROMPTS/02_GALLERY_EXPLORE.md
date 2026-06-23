# 02 — 갤러리 & 탐색 개선

> P0: 갤러리 모바일 반응형 / P1: 뷰토글·정렬·탐색 필터 전체 / P2: 무한스크롤  
> **⚠️ 디자인 방향 업데이트 (2026-06-23)**: Cosmos × Pinterest 다크 에디토리얼 스타일 적용  
> 참조: `31_COSMOS_PINTEREST_DESIGN_SYSTEM.md`  
> - GalleryPage / ExplorePage 배경: `#090909` (Cosmos 순수 블랙)  
> - 카드: 테두리·그림자 없음, 이미지 직접 배치  
> - ExplorePage 검색바: pill 형태 `#1c1c1c`, 카테고리 탭: 수평 스크롤 + 하단 흰선  
> - 어드민/인증 페이지만 glass.js light 유지

**누락 확인 (2026-06-14 재검증):**
- GalleryPage: 뷰 모드 토글(마소닉/리스트), 6가지 정렬 옵션 — 디자인 문서 미반영 → 추가
- ExplorePage: 이미지 비율 필터(5종), 태그 검색, 검색 자동완성 + 히스토리 — 미반영 → 추가

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
컬러: primary '#5b6ef5' primaryLight '#eef0ff' galleryBg '#090909'
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
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱 (Cosmos × Pinterest 다크 에디토리얼)
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)

컬러 시스템 (Cosmos 다크):
  bg '#090909' surface '#0f0f0f' elevated '#161616'
  searchBar '#1c1c1c' divider 'rgba(255,255,255,0.07)'
  text '#ffffff' textSub 'rgba(255,255,255,0.65)' textMuted 'rgba(255,255,255,0.35)'
  primary '#5b6ef5' accent '#a78bfa'
MOOD_COLORS (칩 dot 색상만 사용, 배경은 항상 다크):
  WARM '#FF7043' ENERGETIC '#FFB300' VIBRANT '#FF4081' ROMANTIC '#E91E63'
  NATURAL '#43A047' COOL '#1E88E5' SERENE '#5E35B1' MUTED '#9E9E9E'
  DRAMATIC '#37474F' CLEAN '#90A4AE' MONOCHROME '#607D8B'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

ExplorePage (Cosmos 다크 스타일) 상단 필터/정렬 + 결과 그리드를 만들어주세요 (목 데이터 9개).

상태: search, selectedMood, sortBy('latest'|'popular'|'saved'), debouncedSearch(300ms)

1. Cosmos 검색바 (pill 형태)
   width 100%, padding 0 16px, position sticky top 0
   배경 '#1c1c1c', border-radius 9999px, height 44px
   좌: 🔍 아이콘 (rgba(255,255,255,0.45)), 중: input placeholder "사진·작가·테마 검색"
   우: × 클리어 아이콘 / ⊞ 필터 아이콘 (각각 rgba(255,255,255,0.50))
   포커스 시 배경 '#242424', 외곽선 rgba(255,255,255,0.15)

2. 정렬 드롭다운 (검색바 우측 아이콘 클릭 or 별도 행)
   배경 '#161616', border 'rgba(255,255,255,0.07)', radius 10px
   옵션: 최신순/인기순/저장순 (텍스트 흰색, 활성 항목 primary 색)

3. 카테고리/무드 필터 탭 행 (Cosmos 스타일 수평 스크롤)
   "전체" + 11개 무드 탭
   각 탭: colored dot(5px 원형) + 무드명
   비활성: textMuted, 활성: text '#fff' + 하단 2px 흰색 라인
   gap 20px, scrollbar 숨김

4. 결과 헤더
   "{n}개의 사진" (textMuted, 12px) + 활성 필터 배지 (배경 rgba(255,255,255,0.08))
   [모두 초기화] rgba(255,255,255,0.35) 버튼

5. 마소닉 이미지 그리드 (Cosmos 스타일)
   배경 '#090909', 2컬럼(모바일) → 3컬럼(태블릿) → 4컬럼(데스크탑)
   gap 2px, 카드: 테두리·그림자 없음, border-radius 4px overflow hidden
   각 카드 hover: 하단 오버레이 + 작가명 + 저장 버튼

6. 결과 없음: "검색 결과가 없습니다" (textMuted 중앙)

전체 배경: '#090909', 폰트 색: '#ffffff'
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

---

## [4] GalleryPage 뷰 토글 + 6가지 정렬 (누락 항목 추가)

### 현재 구현된 기능 (디자인 문서에 미반영)

GalleryPage에 이미 구현된 기능:
- **뷰 모드**: 마소닉 그리드 ↔ 리스트 뷰 토글
- **정렬 6가지**: 최신순 / 오래된순 / 좋아요순 / 저장순 / 색상순 / 표시순서

→ 기능은 동작하지만 UI 디자인 일관성이 부족함. 아래 프롬프트로 개선.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱 (Cosmos × Pinterest 다크 에디토리얼)
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)

컬러 시스템 (Cosmos 다크):
  bg '#090909' surface '#0f0f0f' elevated '#161616'
  text '#ffffff' textSub 'rgba(255,255,255,0.65)' textMuted 'rgba(255,255,255,0.35)'
  primary '#5b6ef5' divider 'rgba(255,255,255,0.07)'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

GalleryPage Cosmos 스타일 컨트롤 바를 만들어주세요.

컨트롤 바 구조 (height 44px, bg 'rgba(9,9,9,0.92)', backdrop-filter blur(12px), sticky top 0):
flex row, padding '0 16px', gap 12px, align-items center
border-bottom '1px solid rgba(255,255,255,0.07)'

좌측: 정렬 드롭다운
  현재 정렬명 표시 (13px rgba(255,255,255,0.70)) + ▾ 아이콘
  클릭 시 드롭다운 (배경 '#161616', border 'rgba(255,255,255,0.10)', radius 10px):
    ⏰ 최신순 / 🕰 오래된순 / ❤ 좋아요순 / 🔖 저장순 / 🎨 색상순 / ↕ 표시순서
  선택된 항목: primary 색상 + ✓ 체크마크
  외부 클릭 닫기

중앙 (flex 1): "N개의 사진" (textMuted, 12px 중앙정렬)

우측: 뷰 토글 버튼 그룹
  [▦ 그리드] [☰ 리스트] pill 그룹 (border-radius 8px overflow hidden)
  활성: bg 'rgba(255,255,255,0.12)' color '#fff'
  비활성: bg transparent color 'rgba(255,255,255,0.35)'
  각 버튼 height 32px width 36px

데모:
- 다크 갤러리 배경 (#090909) 위에 컨트롤 바 표시
- 정렬 드롭다운 열린 상태 (드롭다운 패널 '#161616')
- 그리드 / 리스트 각 뷰 모드 미리보기 (더미 카드 6개, 카드 테두리 없음)
  리스트 뷰: 썸네일(72×72 radius 6px) | 제목+설명 | 무드배지+좋아요수
  카드 배경: '#0f0f0f'
```

---

## [5] ExplorePage 확장 필터 (누락 항목 추가)

### 현재 구현된 기능 (디자인 문서에 미반영)

- **이미지 비율 필터**: 1:1 / 4:3 / 3:4 / 16:9 / 9:16 + 전체
- **태그 검색**: 태그 입력 후 Enter → 칩 추가, 여러 태그 AND 검색
- **자동완성**: 검색어 입력 시 제목 제안 드롭다운 (photoApi.getSuggestions)
- **검색 히스토리**: localStorage에 최근 5개 저장

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱 (Cosmos × Pinterest 다크 에디토리얼)
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)

컬러 시스템 (Cosmos 다크):
  bg '#090909' surface '#0f0f0f' elevated '#161616' searchBar '#1c1c1c'
  divider 'rgba(255,255,255,0.07)'
  text '#ffffff' textSub 'rgba(255,255,255,0.65)' textMuted 'rgba(255,255,255,0.35)'
  primary '#5b6ef5' accent '#a78bfa'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

ExplorePage의 Cosmos 스타일 고급 검색 UI를 만들어주세요.

상태:
- keyword: string, debouncedKeyword(300ms)
- suggestions: string[] (자동완성 목록)
- searchHistory: string[] (localStorage, max 5)
- showSuggestions: boolean
- colorMood: string
- imageRatio: '' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16'
- tags: string[] (현재 선택된 태그들)
- tagInput: string

1. Cosmos 검색바 (자동완성 포함)
   position relative 컨테이너, padding 12px 16px
   input: pill 형태(radius 9999px, bg '#1c1c1c', height 44px)
   좌: 🔍 아이콘 (rgba(255,255,255,0.45))
   우: 검색어 있을 때 × 클리어, 없을 때 🕐 히스토리 아이콘 (rgba(255,255,255,0.35))
   포커스 시 bg '#242424', outline 'rgba(255,255,255,0.15)'

   자동완성 드롭다운 (showSuggestions=true):
     position absolute, width 100%, bg '#161616', border 'rgba(255,255,255,0.07)', radius 12px
     z-index 200, max-height 240px overflow-y auto
     검색어 있을 때: suggestions 항목 (hover bg 'rgba(255,255,255,0.06)', 텍스트 흰색)
     검색어 없을 때: "최근 검색" 라벨(textMuted) + history 목록 + [전체 삭제] 버튼
     각 히스토리 항목: 🕐 아이콘(textMuted) + 텍스트(textSub) + × 삭제

2. 카테고리/무드 탭 행 (Cosmos 스타일)
   수평 스크롤, scrollbar 숨김, gap 20px, padding 0 16px 8px
   "전체" + 11개 무드 탭
   비활성: textMuted + 좌측 colored dot 5px 원형
   활성: text '#fff' + 하단 2px solid '#fff' 라인

3. 이미지 비율 필터 (신규, 다크 스타일)
   padding 0 16px, flex row gap 8px
   "비율" 라벨(textMuted 11px) + 6개 버튼
   각 버튼: bg 'rgba(255,255,255,0.06)' border 'rgba(255,255,255,0.07)' radius 6px, 텍스트 textSub
   활성: bg 'rgba(91,110,245,0.20)' border primary color '#fff'
   height 32px

4. 태그 검색 (신규, 다크 스타일)
   "#" prefix + input(bg 'rgba(255,255,255,0.05)' radius 8px) + 선택된 태그 칩들
   태그 칩: bg 'rgba(91,110,245,0.15)' color primary, × 삭제, radius 99px
   Enter 시 tags 배열 추가

5. 활성 필터 요약 행
   "{N}개의 사진" (textMuted 12px) + 배지들 (bg 'rgba(255,255,255,0.08)' color textSub, radius 99px)
   [전체 초기화] (textMuted 버튼)

전체 배경: '#090909', 폰트: '#ffffff' 계열
데모: 검색어+무드+비율+태그 설정된 상태 vs 초기 상태 비교
```

### 통합 방법

```jsx
// ExplorePage.jsx 상태 추가
const [imageRatio, setImageRatio] = useState('')
const [tags, setTags] = useState([])
const [tagInput, setTagInput] = useState('')
const [searchHistory, setSearchHistory] = useState(
  () => JSON.parse(localStorage.getItem('search_history') || '[]')
)

// 검색 실행 시 히스토리 저장
const saveHistory = (keyword) => {
  const next = [keyword, ...searchHistory.filter(h => h !== keyword)].slice(0, 5)
  setSearchHistory(next)
  localStorage.setItem('search_history', JSON.stringify(next))
}

// API 호출 시 imageRatio, tags 파라미터 추가
const result = await photoApi.search({ keyword, colorMood, imageRatio, tags: tags.join(','), sortBy, order })
```

---

## 완료 체크리스트

- [ ] useBreakpoint.js 생성 + GalleryPage 컬럼 동적 적용
- [ ] 모바일 2컬럼 / 태블릿 3컬럼 확인
- [ ] GalleryPage 뷰 토글 (마소닉↔리스트) UI 개선
- [ ] GalleryPage 정렬 드롭다운 (6가지) UI 개선
- [ ] ExplorePage 정렬 + 활성 필터 배지 + debounce 300ms
- [ ] ExplorePage 이미지 비율 필터 추가
- [ ] ExplorePage 태그 검색 칩 추가
- [ ] 검색 자동완성 드롭다운 (getSuggestions)
- [ ] 검색 히스토리 (localStorage, max 5)
- [ ] useInfiniteScroll.js 생성 (P2)
- [ ] GalleryPage 무한 스크롤 연결 (P2, 백엔드 페이지네이션 지원 후)
- [ ] ExplorePage 무한 스크롤 연결 (필터 변경 시 page 초기화 주의)
