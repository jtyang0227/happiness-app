# 12 — PhotoDetailPage 강화 (컬러팔레트·전체화면·네비게이션·공유·관련사진)

> 구현 완료일: 2026-06-18  
> 관련 파일: `PhotoDetailPage.jsx`, `ColorPalette.jsx`, `PhotoViewer.jsx`, `PhotoNavigation.jsx`, `ShareButton.jsx`, `RelatedPhotos.jsx`, `useColorExtraction.js`

---

## 배경 및 목적

기존 PhotoDetailPage는 이미지·좋아요/저장·EXIF·댓글만 있었다.  
포트폴리오 앱으로서 **작가의 색채 감각**, **몰입 감상(전체화면)**, **포트폴리오 연결성(이전/다음·관련사진)** 을 추가해 전문 사진 감상 경험을 제공한다.

---

## 레이아웃 구조 (데스크탑: 좌58% 이미지 + 우42% 정보)

```
┌─────────────────────────────┬──────────────────────────────┐
│  사진 영역 (58%)             │  정보 영역 (42%, 스크롤)       │
│                             │                              │
│  ┌─────────────────────┐   │  작가 아바타 + 이름 + 날짜      │
│  │                     │   │  [수정] [삭제] (소유자만)       │
│  │    이미지             │   │                              │
│  │  (클릭→전체화면)      │   │  제목 (20px bold)            │
│  │                     │   │  무드 배지                    │
│  └─────────────────────┘   │  설명 텍스트                  │
│                             │                              │
│  ← ‹ 이전  다음 › →         │  [♡ 좋아요] [☆ 저장]         │
│  (PhotoNavigation 오버레이)  │  [↗ 공유]   [🖨️ 인쇄]       │
│                             │                              │
│  "클릭하여 전체화면" 힌트      │  # 태그 칩                   │
│                             │                              │
│                             │  ─── 대표 색상 ───            │
│                             │  ■ ■ ■ ■ ■  (5색 팔레트)   │
│                             │                              │
│                             │  보정 설정 카드               │
│                             │                              │
│                             │  관련 사진 (3열 그리드, 6장)   │
│                             │                              │
│                             │  ─── 댓글 ───               │
└─────────────────────────────┴──────────────────────────────┘
```

---

## 컴포넌트 명세

### useColorExtraction (훅)

```
시그니처: useColorExtraction(imageUrl)
반환: { colors: string[], loading: boolean, error: string|null }

알고리즘:
  1. Image 객체 생성, crossOrigin='anonymous'
  2. Canvas 200×200 에 drawImage
  3. getImageData() → 10px 간격 샘플링 (25×25 = 최대 625개 픽셀)
  4. K-means k=5, 10회 반복
  5. 명도(0.299R + 0.587G + 0.114B) 오름차순 정렬
  6. '#RRGGBB' hex 반환
  캐싱: useRef Map (동일 imageUrl 재요청 시 즉시 반환)
  에러: CORS 실패 시 error 설정, colors=[]
```

### ColorPalette 컴포넌트

```
Props: { colors, loading, theme='light', onColorCopy }

UI:
  헤더: "대표 색상" (13px) + "클릭하여 복사" (11px, right)
  색상 바: flex row, 5개 칩
    각 칩:
      - flex 1, height 44px, border-radius 10px
      - hover: translateY(-3px) scale(1.04)
      - 클릭: clipboard.writeText(hex) + 2초간 ✓ 오버레이
      - 텍스트 색: 밝기(>128) → 검정 / 어두움 → 흰색 자동
  로딩: 5개 shimmer 칩
  에러/빈 상태: "색상 추출 실패" 텍스트

접근성: role="button", tabIndex=0, aria-label="색상 {hex} 복사"
```

### PhotoViewer 컴포넌트 (전체화면)

```
Props: { isOpen, imageUrl, title, onClose, onPrev, onNext, hasPrev, hasNext }

UI:
  오버레이: position fixed, inset 0, rgba(0,0,0,0.96), z-index 1000
  상단바 (56px):
    좌: 사진 제목 (14px)
    우: ✕ 닫기 버튼 (36px 원형)
  이미지: max 95vw × 88vh, object-fit contain, cursor zoom-out
  이전/다음 버튼: position absolute, 50% transform
    50px 원형, rgba(255,255,255,0.18)
    ‹ / ›, hasPrev/hasNext=false → opacity 0.2

키보드: Escape→닫기, ←→ 네비게이션
body overflow: hidden (마운트 시), 복원 (언마운트 시)
배경 클릭: e.target === overlay → onClose
애니메이션: opacity 0→1 (0.15s)
```

### PhotoNavigation 컴포넌트

```
Props: { currentId, photoList, onNavigate }

UI:
  이전 버튼: position absolute, left:-20px, top:50%
  다음 버튼: position absolute, right:-20px, top:50%
  42px 원형, rgba(0,0,0,0.45) bg
  ‹ / ›, 22px
  hasPrev/hasNext=false → opacity 0.3, pointerEvents none

키보드: ArrowLeft/Right → onNavigate (window 이벤트)
photoList 빈 배열 → null 반환
```

### ShareButton 컴포넌트

```
Props: { url, title, theme='light' }

동작:
  1. navigator.share() 지원 시 → Web Share API
  2. 미지원 시 → clipboard.writeText(url)
  3. 성공: "✓ 복사됨" 2초 표시
  4. 실패: "✗ 실패" 1.5초 표시
  기본: "↗ 공유"

dark theme: rgba(255,255,255,0.07) bg, #e8e8f0 color
```

### RelatedPhotos 컴포넌트

```
Props: { photos, onPhotoClick }
photos.length === 0 → null 반환

그리드: repeat(3, 1fr), gap 8px
  @media max-width 480px: repeat(2, 1fr)

각 카드:
  aspect-ratio 1/1, border-radius 10px
  hover: 이미지 scale(1.06) + 하단 gradient overlay + 제목 표시
  transition: 0.25~0.3s
```

---

## 인쇄 CSS

```css
@media print {
  header, nav, .no-print, .comments-section { display: none !important; }
  body { background: #fff !important; }
}
```

---

[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱  
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)  
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary: '#5b6ef5', primaryLight: '#eef0ff', accent: '#a78bfa'
  bg: '#f5f5fa', surface: '#ffffff', border: '#e2e2ee'
  text: '#1a1a2e', textSecondary: '#5c5c7a', textMuted: '#9090b0'
  danger: '#e53e3e', galleryBg: '#090909', surface: '#0f0f0f'

규칙:
- export default 함수형 컴포넌트
- style은 inline object 사용
- 외부 라이브러리 import 없음
- 한국어 UI 텍스트
