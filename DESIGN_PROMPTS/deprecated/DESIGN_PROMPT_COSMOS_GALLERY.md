# Claude 디자인 프롬프트 — Cosmos × Happiness 갤러리 UI

> 이 파일의 프롬프트를 Claude.ai에서 아티팩트 요청에 사용하세요.

---

## 프롬프트 A — 다크 갤러리 홈 (GalleryPage 재설계)

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
레퍼런스: Cosmos 앱 (curated dark editorial photo discovery)
기술 스택: React 18 SPA, React Router v6, inline style
아이콘: 이모지 또는 유니코드 기호만 사용

디자인 방향:
- 배경: 순수 블랙 (#090909), 이미지 온리 포커스
- 마소닉 그리드: 2컬럼(모바일) → 3컬럼(태블릿) → 4컬럼(데스크탑)
- 카드: 테두리·그림자 없음, 8px 라운드, 호버 시 오버레이 페이드
- 호버 오버레이: 하단 그라디언트 + 작가명 + "저장" 버튼
- Header 없음 (하단 BottomNav만 사용)

현재 컬러 시스템:
  bg:            '#090909'
  surface:       '#0f0f0f'
  primary:       '#5b6ef5'
  text:          '#ffffff'
  textSub:       'rgba(255,255,255,0.65)'
  textMuted:     'rgba(255,255,255,0.35)'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- 모바일 퍼스트

[요청]
Cosmos 앱 스타일의 다크 마소닉 갤러리 홈페이지를 만들어주세요.

포함 요소:
1. 상단 얇은 헤더바: 좌측 "Happiness" 로고(흰색 소문자), 우측 알림 아이콘
2. 검색바: pill 형태, #1c1c1c 배경, "사진 검색..." placeholder
3. 카테고리 탭: 수평 스크롤, [전체·인물·풍경·웨딩·길거리·건축·음식·여행], 활성=하단 흰선+흰텍스트
4. 마소닉 그리드: 2컬럼, 각 이미지 카드는 aspect-ratio 자동(이미지 원본 비율)
5. 각 카드 호버: 하단 그라디언트 오버레이 + 작가명(@handle) + "저장" 버튼(우상단)
6. 더보기 로드 버튼: 하단 중앙, 흰색 아웃라인 버튼

더미 사진 데이터: placeholder 이미지 6-8장 사용
전체 높이: 100vh, overflow-y: scroll
```

---

## 프롬프트 B — CosmosBoardCard (시리즈/보드 카드)

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
레퍼런스: Cosmos 앱의 보드 카드 디자인 + Pinterest 보드 스타일
기술 스택: React 18 SPA, inline style

[요청]
Cosmos 앱 스타일의 보드/시리즈 카드 컴포넌트를 만들어주세요.

컴포넌트명: CosmosBoardCard
props: { title, handle, verified, count, thumbnails: [url1, url2, url3] }

레이아웃:
- 배경: #0f0f0f, 라운드: 12px, 테두리: 없음
- 상단 썸네일 영역 (높이 160px):
  - 왼쪽 50%: thumbnails[0] (전체 높이)
  - 오른쪽 50% 상단: thumbnails[1] (50%)
  - 오른쪽 50% 하단: thumbnails[2] (50%)
  - 이미지 사이 간격: 2px
- 하단 메타 (padding: 12px):
  - 줄1: 제목 (15px, #fff, 700weight)
  - 줄2: @handle (12px, rgba(255,255,255,0.55)) + ✓ 뱃지 (인증 시) + "· N elements"
- 호버: 약한 스케일업 (scale 1.01) + 커서 pointer

검은 배경 (배경 #090909) 위에 3x2 그리드로 여러 카드를 보여주는 데모 페이지
```

---

## 프롬프트 C — Cosmos 스타일 검색/탐색 페이지

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
레퍼런스: Cosmos 앱 탐색 화면
기술 스택: React 18 SPA, inline style

[요청]
Cosmos 스타일의 탐색(Explore) 페이지를 만들어주세요.

레이아웃 (위에서 아래):
1. 검색바 (pill, #1c1c1c 배경)
   - 좌: 🔍 아이콘
   - 중: placeholder "사진·작가·테마 검색"
   - 우: ⊞ 필터 아이콘 버튼
2. 카테고리 탭 수평 스크롤 (Featured · Shop · 인물 · 풍경 · 건축 · 웨딩 · 여행)
3. 추천 보드 섹션 헤더 ("큐레이션 보드")
4. 보드 카드 2컬럼 그리드 (CosmosBoardCard 스타일)
5. 구분선 (rgba(255,255,255,0.06))
6. 인기 사진 섹션 헤더 ("지금 인기")
7. 마소닉 이미지 그리드

전체: 다크 배경(#090909), 흰 텍스트 계층, 패딩 16px
모바일 전용 (max-width 430px 기준)
```

---

## 프롬프트 D — 프리미엄 에디터 우측 패널

```
[시스템 컨텍스트]
앱 이름: Happiness 이미지 에디터
레퍼런스: Capture One / Lightroom 다크 에디터 스타일
기술 스택: React 18, inline style

현재 패널 배경: #0a0a16
색상:
  panelBg:   '#0a0a16'
  sectionBg: '#0e0e1e'
  text:       'rgba(230,230,255,0.90)'
  textSub:    'rgba(140,140,180,0.55)'
  accent:     '#7080ff'
  accentGlow: 'rgba(112,128,255,0.35)'

[요청]
Capture One 스타일의 프리미엄 에디터 우측 보정 패널을 만들어주세요.

포함 요소:
1. 패널 헤더: "사진 보정" + "초기화" 버튼 (오른쪽, 흐린 보라색)
2. 히스토그램 영역 (가상): 80px 높이, 어두운 배경, 무지개 그라디언트 바
3. 보정 섹션들 (아코디언):
   - 기본 보정: 노출·대비·하이라이트·그림자·흰색·검정 (각 슬라이더)
   - 화이트밸런스: 온도·색조 슬라이더
   - 색상: 바이브런스·채도
   - 톤 커브: (제목만, 실제 캔버스는 생략)
4. 슬라이더 디자인:
   - 트랙: rgba(255,255,255,0.07), 2px 높이
   - 활성 채움: linear-gradient(90deg, #7060ff, #a090ff)
   - thumb: 원형 흰색 6px
5. 섹션 헤더: 10px 대문자, rgba(130,130,170,0.65), 우측 ▼ 아이콘
6. 하단: "내보내기" 버튼 (그라디언트 #5b6ef5 → #7c5cfc, 전체 너비)

전체 패널: 폭 286px, 높이 100vh, overflow-y scroll
```

---

## 프롬프트 E — Cosmos 스타일 PhotoCard (이미지 카드)

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
레퍼런스: Cosmos 앱 이미지 카드 + Pinterest Pin 카드
기술 스택: React 18, inline style

[요청]
Cosmos/Pinterest 스타일의 이미지 카드 컴포넌트를 만들어주세요.

컴포넌트명: CosmosPhotoCard
props: { imageUrl, title, authorName, authorHandle, likes, isSaved }

기본 상태:
- 이미지만 표시 (border 없음, shadow 없음)
- border-radius: 8px
- overflow: hidden
- cursor: pointer

호버 상태 (CSS + inline state):
- 이미지: scale(1.02), transition 0.3s ease
- 하단 오버레이: linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 50%)
  - 작가명: @handle, 12px, 흰색
  - 좋아요 수: ♡ N, 12px, rgba(255,255,255,0.70)
- 우상단 "저장" 버튼:
  - 흰색 pill 버튼 (패딩 5px 12px, 11px 텍스트, 검은 텍스트)
  - saved 상태: 빨간 배경 (#ff4d6d), 흰 텍스트

5개 카드를 2컬럼 마소닉 그리드로 배치한 데모 페이지 (배경 #090909)
```
