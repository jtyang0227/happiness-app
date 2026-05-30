# Claude Design 요청 프롬프트 모음

> 아래 프롬프트를 claude.ai 에서 아티팩트로 요청하세요.
> 생성된 코드를 받으면 개발자에게 공유하면 바로 적용 가능합니다.

---

## 공통 디자인 시스템 컨텍스트 (모든 요청에 앞에 붙일 것)

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary:       '#5b6ef5'   // 메인 블루-퍼플
  primaryDark:   '#4458e0'
  primaryLight:  '#eef0ff'
  accent:        '#a78bfa'   // 연보라
  bg:            '#f5f5fa'
  surface:       '#ffffff'
  border:        '#e2e2ee'
  text:          '#1a1a2e'
  textSecondary: '#5c5c7a'
  textMuted:     '#9090b0'
  danger:        '#e53e3e'
  darkBg:        '#0a0a18'
  darkSurface:   '#12122a'
  galleryBg:     '#0e0e0e'   // 갤러리는 풀 다크

현재 화면 목록:
- /            → GalleryPage (12컬럼 그리드, 다크 배경)
- /explore     → ExplorePage (카드 그리드, 목 데이터)
- /list        → ListPage (행 목록)
- /photo/new   → PhotoFormPage (사진 등록 + Lightroom 보정 패널)
- /photo/:id   → PhotoDetailPage
- /profile     → ProfilePage
- /login       → LoginPage (풀 다크 테마)
- /signup      → SignUpPage

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
```

---

## 요청 1 — 모바일 반응형 헤더 + 하단 탭바

```
[시스템 컨텍스트 붙여넣기]

현재 Header.jsx 코드:
---
[현재 Header.jsx 전체 내용 붙여넣기]
---

요청:
PC(768px 이상)에서는 현재 상단 헤더를 유지하되,
모바일(768px 미만)에서는 상단 헤더를 숨기고 하단 탭바(BottomNav)를 보여주세요.

하단 탭바 스펙:
- 탐색 / 갤러리 / 등록(가운데 강조) / 목록 / 프로필
- 등록 버튼은 primary 색상 원형 + 크게
- 현재 활성 탭은 primary 색상 아이콘 + 레이블
- 배경: 흰색, 상단 border, safe-area 대응 (paddingBottom: 'env(safe-area-inset-bottom)')
- 부드러운 활성 탭 전환 애니메이션

결과물: Header.jsx 수정본 + BottomNav.jsx 신규 컴포넌트 2개
```

---

## 요청 2 — 스켈레톤 로딩 컴포넌트

```
[시스템 컨텍스트 붙여넣기]

요청:
사진 로딩 중에 표시할 스켈레톤 UI 컴포넌트를 만들어주세요.

스켈레톤 스펙:
- GallerySkeleton: 다크 배경(#0e0e0e)에 12컬럼 그리드, 카드 3~6개, 
  shimmer 애니메이션 (CSS @keyframes shimmer)
- ListSkeleton: 행 목록 5개, 각 행에 썸네일 + 제목 + 뱃지 자리
- shimmer 색상: #1a1a1a → #2a2a2a → #1a1a1a 반복
- 애니메이션 주기: 1.4s

결과물: SkeletonLoader.jsx (GallerySkeleton, ListSkeleton export)
```

---

## 요청 3 — 갤러리 검색/필터 드로어

```
[시스템 컨텍스트 붙여넣기]

요청:
갤러리 페이지 상단 툴바에 검색 + 필터 기능을 추가해주세요.

스펙:
- 검색창: 제목으로 실시간 필터링, 다크 스타일 입력창
- 색상 무드 필터 칩: WARM / ENERGETIC / NATURAL / COOL / SERENE / ROMANTIC / VIBRANT / MUTED / DRAMATIC / CLEAN / MONOCHROME
  각 칩은 mood.dot 색상 + 선택 시 배경 강조
- 필터 버튼 클릭 → 부드럽게 펼쳐지는 드로어 (height 애니메이션)
- 필터 적용 중이면 툴바에 활성 필터 수 뱃지 표시
- 초기화 버튼

결과물: GalleryFilterBar.jsx
```

---

## 요청 4 — 프로필 페이지 리디자인

```
[시스템 컨텍스트 붙여넣기]

현재 ProfilePage.jsx:
---
[현재 ProfilePage.jsx 전체 내용 붙여넣기]
---

요청:
프로필 페이지를 SNS 스타일로 리디자인해주세요.

스펙:
- 상단 커버 이미지 영역 (그라데이션 배경, height 160px)
- 아바타 원형 (64px, 이름 이니셜, 커버 이미지 위에 겹쳐서 표시)
- 이름 / 프로필명(@handle) / 인스타그램 링크 표시
- 통계 행: 등록한 사진 수 / 좋아요 받은 수 / 저장됨
- 편집 버튼 → 인라인 폼으로 전환 (별도 페이지 이동 없이)
- 라이트 테마 (bg: '#f5f5fa')
- 로그아웃 버튼은 하단에 텍스트 링크 스타일로

결과물: ProfilePage.jsx 수정본
```

---

## 요청 5 — 사진 상세 페이지 (전용 페이지)

```
[시스템 컨텍스트 붙여넣기]

요청:
현재 모달 방식의 사진 상세를 전용 페이지(/photo/:id)로 만들어주세요.

스펙:
- 좌측: 사진 (최대 60vw, 다크 배경)
- 우측: 메타 정보 패널 (흰색 패드)
  - 작성자 아바타 + 이름 + 날짜
  - 제목 + 설명
  - 색상 무드 뱃지
  - 좋아요 ♥ / 저장 ★ / 공유 버튼
  - 보정 프리셋 정보 (적용된 조정값 요약: 노출 +0.5 / 비네팅 -30 등)
- 모바일: 사진 상단, 정보 하단으로 세로 스택
- 뒤로가기: 브라우저 히스토리 back

결과물: PhotoDetailPage.jsx 수정본
```

---

## 요청 6 — 온보딩 / 빈 화면 상태

```
[시스템 컨텍스트 붙여넣기]

요청:
갤러리에 사진이 없을 때 보여줄 온보딩 빈 상태 화면을 만들어주세요.

스펙:
- 다크 배경 (#0e0e0e)
- 중앙에 큰 카메라 이모지 또는 별(✦) 애니메이션 (float 위아래)
- "아직 등록된 사진이 없습니다" + 서브텍스트 "첫 번째 작품을 올려보세요"
- "사진 등록하기" CTA 버튼 (primary 색상, 크게)
- 하단에 힌트 카드 3개 (그리드):
  1. 📸 Lightroom 수준의 보정 — 노출·커브·채널 조정
  2. 🎨 색상 무드 태그 — 감성으로 분류
  3. 💾 보정 프리셋 — 저장하고 다른 사진에 재사용

결과물: EmptyGallery.jsx
```

---

## 요청 7 — 토스트 알림 시스템 업그레이드

```
[시스템 컨텍스트 붙여넣기]

현재 Toast.jsx:
---
[현재 Toast.jsx 전체 내용 붙여넣기]
---

요청:
토스트 알림을 업그레이드해주세요.

스펙:
- 위치: 오른쪽 상단 (position: fixed, top: 80px, right: 20px)
- 타입: success(초록) / error(빨강) / warning(노랑) / info(파랑)
- 각 타입별 이모지 아이콘 + 왼쪽 컬러 바
- 여러 개 동시에 스택으로 쌓임 (최대 3개)
- 등장: 오른쪽에서 슬라이드 인
- 퇴장: 오른쪽으로 페이드 아웃
- 수동 닫기 × 버튼
- 자동 닫힘: success 2.5s / error 4s / warning 3s

결과물: Toast.jsx 수정본 + useToast.js 훅
```

---

## 요청 8 — 사진 등록 폼 UX 개선

```
[시스템 컨텍스트 붙여넣기]

요청:
PhotoFormPage의 이미지 업로드 드롭존을 개선해주세요.

스펙:
- 드래그 오버 시: 테두리 primary 색상, 배경 연보라 틴트, 부드러운 scale(1.01)
- 드래그 앤 드롭 실제 동작 (onDragOver, onDrop 이벤트)
- 업로드 후 썸네일 미리보기 위에 오버레이 버튼: [변경] [제거]
- 파일 크기 / 해상도 표시 (예: "4.2MB · 3024×4032")
- 지원하지 않는 파일 드롭 시: 빨간 테두리 + 에러 메시지 shake 애니메이션

결과물: ImageDropZone.jsx (PhotoFormPage에서 교체 가능한 컴포넌트)
```

---

## 사용법

1. claude.ai 열기
2. 위 프롬프트에서 원하는 요청 복사
3. 맨 위 **[시스템 컨텍스트]** 블록을 먼저 붙여넣고, 그 아래에 실제 요청 붙여넣기
4. 현재 코드 붙여넣기가 필요한 부분은 실제 파일 내용으로 교체
5. 생성된 코드 → 개발자에게 전달 → 즉시 적용

---

> 우선순위 추천: 요청 1(모바일 반응형) → 요청 3(갤러리 필터) → 요청 4(프로필) → 나머지
