# 25 — 매거진 면·판 레이아웃 시스템

> 작성일: 2026-06-20  
> 상태: ✅ 구현 완료 (2026-06-20)  
> 관련 기능: GalleryPage, PhotoDetailPage, SeriesPage, PortfolioPage

---

## 1. 배경 및 목적

### 문제 정의

현재 사진 표시 방식은 **격자(그리드)** 와 **목록** 뿐이다.  
이는 Instagram이나 Unsplash와 동일한 패턴으로, **사진작가의 이야기(서사)** 를 전달하지 못한다.

VSCO·Vogue·Format.com 같은 레퍼런스를 보면, 프로 포트폴리오는  
사진 한 장을 단순히 "표시"하는 것이 아니라 **편집 디자인** 으로 감상자에게 전달한다.

### 솔루션 키워드: **면(面)과 판(版)**

```
판 (版) — 레이아웃 틀: "이 사진을 어떤 구조로 보여줄까?"
면 (面) — 표시 단위: "한 화면(페이지)에 무엇을 담을까?"
```

- **판** = 인쇄에서 활판(活版)의 개념. 사진+글의 배치 구조를 결정하는 **레이아웃 템플릿**
- **면** = 신문/잡지에서 1면·2면의 그 '면'. 판이 렌더링된 **하나의 화면 단위**

### 기대 효과

| 현재 | 도입 후 |
|------|--------|
| 모든 사진이 같은 격자 안에 | 사진마다 어울리는 레이아웃으로 노출 |
| 이미지만 전달 | 이미지 + 텍스트 + 여백으로 서사 전달 |
| 포트폴리오 = 사진 목록 | 포트폴리오 = 편집된 매거진 |
| 일반 갤러리 앱과 차별화 없음 | "Format.com 같은 전문 포트폴리오" |

---

## 2. 핵심 개념 상세 정의

### 2-1. 판 (版) — Layout Template

사진 1장(또는 2-3장)과 텍스트를 어떻게 배치할지 결정하는 틀.  
작가가 사진 업로드/편집 시 선택한다. 총 **7종**.

```
판 코드          한글명        영문명
────────────────────────────────────
FULL_BLEED      전면판        Full Bleed
SPLIT           2분할판       Split
EDITORIAL       편집판        Editorial
TRIPTYCH        3면판         Triptych
FEATURE         화보판        Feature Story
PORTRAIT_FOCUS  인물판        Portrait Focus
FILM_STRIP      필름판        Film Strip
```

### 2-2. 면 (面) — Page/Spread Unit

판이 실제로 렌더링된 하나의 화면. 사용자가 매거진 뷰어에서 보는 단위.

- 매거진 뷰어에서 면들을 순서대로 탐색한다 (← → 또는 스크롤)
- 시리즈 = 여러 면이 묶인 "한 호(號)" 의 매거진
- 포트폴리오 = 작가의 전체 면 컬렉션

### 2-3. 면의 구성 요소

```
┌─────────────────────────────────────────┐
│  ① 사진 영역    ③ 캡션(선택)            │
│  (판 타입에     ④ 에디토리얼 텍스트(선택) │  ← 한 개의 면
│   따라 배치)   ⑤ 작가·날짜             │
│  ② 여백 (판    ⑥ 면 번호 (선택)         │
│   마다 다름)                            │
└─────────────────────────────────────────┘
```

---

## 3. 판 타입 7종 상세 명세

### 판 01 — 전면판 (FULL_BLEED)

```
사용 목적: 강렬한 풍경, 웅장한 건축, 분위기 사진
이미지 크기: 100vw × 100vh (또는 100%)
텍스트 위치: 이미지 위 오버레이 (하단 그라디언트 + 흰 텍스트)

┌──────────────────────────────────┐
│                                  │
│          [  이미지  ]             │
│        (화면 가득 채움)           │
│                                  │
│_________________________________ │
│  제목 · 작가 · 날짜 (흰색 오버레이) │
└──────────────────────────────────┘

텍스트 레이어:
  - position: absolute, bottom:0, left:0, right:0
  - background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)
  - padding: 40px 48px
  - 제목: 32px, font-weight 700, color #fff
  - 부제목: 16px, color rgba(255,255,255,0.7)
  - 작가·날짜: 13px, color rgba(255,255,255,0.5)
```

---

### 판 02 — 2분할판 (SPLIT)

```
사용 목적: 이야기가 있는 인물, 여행, 일상 사진 — 글로 맥락 전달
비율: 이미지 58% | 텍스트 42% (기본) / 역분할 선택 가능

┌──────────────────────┬───────────────────┐
│                      │  큰 제목           │
│                      │  (28px, bold)      │
│   [  이미지  ]        │                   │
│                      │  본문 텍스트        │
│   (58% 너비,         │  (최대 4줄,         │
│    전체 높이)         │   16px, 줄간격 1.8) │
│                      │                   │
│                      │  ─────────────     │
│                      │  작가 · 날짜       │
└──────────────────────┴───────────────────┘

모바일: 세로 스택 (이미지 → 텍스트)
역분할: image_right=true 시 텍스트 좌·이미지 우
```

---

### 판 03 — 편집판 (EDITORIAL)

```
사용 목적: 사진집 스타일, 작품 소개, 시리즈 대표 사진
구성: 메인 이미지 (70%) + 우측 사이드바 (30%)

┌───────────────────────────┬──────────────┐
│                           │  ● 작가 아바타 │
│                           │  작가명       │
│                           │  날짜        │
│   [  메인 이미지  ]        │  ────────── │
│   (70%, 전체 높이,         │              │
│    왼쪽 정렬)              │  제목 (22px)  │
│                           │              │
│                           │  에디토리얼   │
│                           │  텍스트      │
│                           │  (14px, 이탤릭│
│                           │   가능)      │
│                           │  ────────── │
│                           │  # 태그칩    │
│                           │  ♡ 좋아요    │
└───────────────────────────┴──────────────┘

사이드바 배경: surface (#ffffff) + border-right
```

---

### 판 04 — 3면판 (TRIPTYCH)

```
사용 목적: 시리즈 3연작, before/during/after, 동일 주제 3장
구성: 같은 높이의 사진 3장을 나란히

┌──────────────┬──────────────┬──────────────┐
│              │              │              │
│  [사진 1]    │  [사진 2]    │  [사진 3]    │
│              │              │              │
│  캡션1 (선택) │  캡션2 (선택) │  캡션3 (선택) │
└──────────────┴──────────────┴──────────────┘

공통 제목: 세 사진 위 중앙 (18px, letter-spacing 2px, 대문자)
공통 높이: 55vh (또는 aspect-ratio 기반 균일 높이)

모바일: 1열 세로 스크롤 (각 사진 전체 너비)
연결 사진: photoIds[0,1,2] 모두 같은 면에 묶임
```

---

### 판 05 — 화보판 (FEATURE)

```
사용 목적: 화보 촬영, 이벤트 리포트, 여러 장으로 이야기 전달
구성: 대표 사진 (large) + 보조 사진 2-3장 (소형)

┌─────────────────────────┬──────────────────┐
│                         │                  │
│   [대표 사진]            │   [보조 사진 1]  │
│   (60% 너비, 65vh)       │                  │
│                         ├──────────────────┤
│                         │   [보조 사진 2]  │
│   대표 제목              │                  │
│   (24px, bold)          ├──────────────────┤
│   캡션 텍스트            │   [보조 사진 3]  │
└─────────────────────────┴──────────────────┘

우측 보조 사진: 3개 × flex 1 (균등 높이)
보조 사진 없으면: 우측 빈 공간 = 배경색 또는 텍스트 블록

연결 사진: photoIds[0] 대표, [1-3] 보조
```

---

### 판 06 — 인물판 (PORTRAIT_FOCUS)

```
사용 목적: 세로 비율 인물 사진, 작가 셀프 포트레이트, 모델 촬영
구성: 사진 중앙 배치 + 좌우 여백 (마치 미술관 전시처럼)

┌─────────────────────────────────────────────┐
│                                             │
│   [배경색/패턴 영역 (좌측 15%)]              │
│                 ┌────────────────┐          │
│                 │                │          │
│                 │  [세로 사진]    │          │
│                 │  (중앙 70%,    │          │
│                 │   aspect 3:4)  │          │
│                 │                │          │
│                 └────────────────┘          │
│   [배경색/패턴 영역 (우측 15%)]              │
│                                             │
│         제목 · 캡션 (중앙 정렬)              │
│                                             │
└─────────────────────────────────────────────┘

배경 옵션: 단색(작가 지정) / 사진 colorMood 기반 자동 색상 / blur 확대 배경
```

---

### 판 07 — 필름판 (FILM_STRIP)

```
사용 목적: 순간 포착 시리즈, 연속 동작, 여행 일기, 시간 순 스토리
구성: 필름 스트립처럼 가로 스크롤로 사진들을 나란히

┌─────────────────────────────────────────────────── →
│ ■□■□■□  필름 퍼포레이션 (상단)
│ [사진1] [사진2] [사진3] [사진4] [사진5]
│ ■□■□■□  필름 퍼포레이션 (하단)
│
│  제목   캡션1  캡션2  캡션3  캡션4  캡션5
└──────────────────────────────────────────────────

필름 느낌:
  - 배경: #1a1a1a (다크)
  - 퍼포레이션: 등간격 □ 패턴 (border-radius 2px, rgba(255,255,255,0.2))
  - 사진 프레임: 고정 높이 260px, aspect-ratio 유지, object-fit contain
  - 프레임 간격: 12px
  - 가로 스크롤: overflow-x auto, snap-type x mandatory
  
  각 프레임에 마운트 번호 표시 (01, 02, 03...)
  
모바일: 수평 스와이프 (터치 스크롤)
```

---

## 4. UX 진입점 3가지

### 진입점 A — 갤러리 매거진 뷰 모드

```
갤러리 툴바에 ⊟ 매거진 뷰 버튼 추가 (기존: ▦ ⊞ ☰ → ▦ ⊞ ☰ ⊟)
```

- 매거진 뷰 선택 시 사진들이 각자의 판 타입으로 순서대로 표시
- 스크롤로 면을 하나씩 이동 (snap scrolling)
- 판이 지정되지 않은 사진은 기본값 `EDITORIAL` 판 적용
- 각 면 우상단에 판 이름 작게 표시 (반투명 뱃지)

```
──────────────── [ 면 1 / 8 ] ────────────────
┌───────────────────────────────────────────┐
│           전면판으로 표시된 사진 1          │
└───────────────────────────────────────────┘
──────────────── [ 면 2 / 8 ] ────────────────
┌───────────────────────────────────────────┐
│   2분할판으로 표시된 사진 2   │  텍스트    │
└───────────────────────────────────────────┘
──────────────── [ 면 3 / 8 ] ────────────────
┌──────────┬──────────┬──────────────────────┐
│  3면판   │           │                      │
└──────────┴──────────┴──────────────────────┘
```

---

### 진입점 B — 사진 상세 페이지 내 "매거진으로 보기"

```
현재 PhotoDetailPage 액션 버튼 영역에 [□ 매거진 뷰] 버튼 추가
```

- 클릭 시 해당 사진의 판 타입으로 전체화면 렌더링
- 같은 작가의 이전/다음 사진도 각각의 판으로 이동 가능
- Escape로 닫기
- 인쇄 버튼: 현재 면을 A4 비율로 인쇄 최적화

---

### 진입점 C — 시리즈 매거진 모드 "한 호(號) 보기"

```
SeriesPage → 시리즈 카드에 [▷ 매거진으로 보기] 버튼 추가
```

- 시리즈 = 하나의 "잡지 호 (issue)"
- 시리즈 커버 이미지 → 전면판으로 첫 면 구성
- 이후 사진들 → 각 사진의 판 타입으로 면 구성
- 시리즈 제목이 매거진 제목처럼 표시
- 면 넘기기 애니메이션 (slide 또는 fade)

---

## 5. 전체 화면 매거진 뷰어 UX 흐름

```
┌─────────────────────────────────────────────────────────────┐
│  상단바 (56px, 반투명)                                       │
│  ← 닫기  │  시리즈명 / "매거진 뷰"  │  [목차 ☰] [공유 ↗] [인쇄 🖨] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    [현재 면 렌더링]                           │
│                   (판 타입에 따라)                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  하단바 (48px)                                              │
│  ◁  [면 섬네일 스크롤 ─────────────────────────────]  ▷    │
│     [●] [○] [○] [○] [○]  (도트 인디케이터, 최대 7개)       │
│            면 2 / 8                                         │
└─────────────────────────────────────────────────────────────┘
```

### 네비게이션 방식

| 인터페이스 | 동작 |
|-----------|------|
| ← → 버튼 | 이전/다음 면 이동 |
| 키보드 ← → | 이전/다음 면 |
| 스와이프 (모바일) | 좌우 스와이프로 면 이동 |
| 하단 섬네일 클릭 | 해당 면으로 직이동 |
| 키보드 Escape | 뷰어 닫기 |
| 스크롤 휠 | 다음/이전 면 (snap) |

### 목차 (TOC) 패널

```
☰ 목차 버튼 클릭 시 좌측에서 슬라이드인 (240px):

┌─────────────────────────────┐
│  ✕  목차                    │
├─────────────────────────────┤
│  [섬네일] 면 1 — 전면판      │
│  [섬네일] 면 2 — 2분할판  ●  │ ← 현재 면 강조
│  [섬네일] 면 3 — 3면판       │
│  [섬네일] 면 4 — 화보판      │
│  ...                       │
└─────────────────────────────┘
```

---

## 6. 판 선택 UI — 사진 업로드/편집 시

### PhotoFormPage에 판 선택 섹션 추가

```
판 (레이아웃 스타일) 선택
──────────────────────────────────────────
[전면판]  [2분할판]  [편집판]  [3면판]  [화보판]  [인물판]  [필름판]

각 버튼: 80×60px 미니 프리뷰 이미지 + 한글 이름

선택된 판: primary 보더 + 체크 아이콘 ✓
```

**3면판/화보판/필름판 선택 시**: 추가 사진 선택 UI 노출
```
+ 연결 사진 선택 (최대 2장)   [사진1 썸네일 ✕] [사진2 썸네일 ✕] [+ 추가]
→ 현재 포트폴리오에서 선택 or 새로 업로드
```

---

## 7. 컴포넌트 아키텍처

```
MagazineViewer (전체화면 래퍼)
  ├── MagazineTopBar (닫기·목차·공유·인쇄)
  ├── MagazineTOC (사이드 패널)
  ├── MagazineSpread (현재 면 렌더러)
  │     ├── FullBleedSpread
  │     ├── SplitSpread
  │     ├── EditorialSpread
  │     ├── TriptychSpread
  │     ├── FeatureSpread
  │     ├── PortraitFocusSpread
  │     └── FilmStripSpread
  ├── MagazineBottomBar (섬네일·도트·면 번호)
  └── MagazineNavArrows (이전·다음 화살표)

PanSelector (판 선택 UI, PhotoForm 내 사용)
MagazineViewToggle (갤러리 툴바 버튼)
MagazineSpreadPreview (갤러리 뷰에서 인라인 렌더)
```

### MagazineViewer Props

```typescript
interface MagazineViewerProps {
  photos: Photo[];           // 표시할 사진 배열
  initialIndex?: number;     // 시작 면 번호 (기본 0)
  title?: string;            // 매거진 제목 (시리즈명 등)
  onClose: () => void;       // 닫기 콜백
}
```

### MagazineSpread Props

```typescript
interface MagazineSpreadProps {
  photo: Photo;              // 메인 사진
  supportPhotos?: Photo[];   // 보조 사진 (3면판/화보판)
  pageNumber?: number;       // 면 번호
  totalPages?: number;       // 전체 면 수
}
```

### Photo 객체 신규 필드 (기존 Photo 확장)

```typescript
// Photo 객체에 추가
panType?: 'FULL_BLEED' | 'SPLIT' | 'EDITORIAL' | 'TRIPTYCH' | 'FEATURE' | 'PORTRAIT_FOCUS' | 'FILM_STRIP';
magazineCaption?: string;    // 에디토리얼 전용 캡션 (기존 description과 별도)
imageRight?: boolean;        // 2분할판: 이미지를 우측에 배치 여부
supportPhotoIds?: number[];  // 3면판/화보판/필름판: 연결 사진 ID 목록
```

---

## 8. 데이터 모델 변경

### 8-1. Photo 엔티티 신규 컬럼

```sql
-- 운영 DB 마이그레이션
ALTER TABLE photos ADD COLUMN IF NOT EXISTS pan_type VARCHAR(20) DEFAULT 'EDITORIAL';
ALTER TABLE photos ADD COLUMN IF NOT EXISTS magazine_caption TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS image_right BOOLEAN DEFAULT FALSE;

-- 연결 사진 (3면판/화보판/필름판) — 별도 테이블
CREATE TABLE IF NOT EXISTS photo_support_links (
  id BIGSERIAL PRIMARY KEY,
  main_photo_id BIGINT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  support_photo_id BIGINT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (main_photo_id, support_photo_id)
);
CREATE INDEX IF NOT EXISTS idx_psl_main ON photo_support_links(main_photo_id);
```

### 8-2. Photo Entity (Spring Boot)

```java
// Photo.java에 추가
@Column(name = "pan_type", length = 20)
private String panType = "EDITORIAL";

@Column(name = "magazine_caption", columnDefinition = "TEXT")
private String magazineCaption;

@Column(name = "image_right")
private Boolean imageRight = false;
```

### 8-3. API 변경

```
GET /api/photos/:id
  → 기존 응답에 panType, magazineCaption, imageRight, supportPhotoIds 추가

PUT /api/photos/:id
  → Body에 panType, magazineCaption, imageRight, supportPhotoIds 허용

GET /api/photos/:id/support-photos
  → 연결 사진 목록 반환 [{ id, imageUrl, thumbnailUrl, title }]

PUT /api/photos/:id/support-photos
  → Body: [{ photoId, sortOrder }] — 연결 사진 일괄 설정
```

---

## 9. 트랜지션 애니메이션

### 면 전환 애니메이션 3종 (선택 가능)

| 이름 | 동작 | CSS |
|------|------|-----|
| **슬라이드** (기본) | 좌우 슬라이드 이동 | `transform: translateX(±100%)`, 0.35s ease |
| **페이드** | 부드럽게 전환 | `opacity 0 → 1`, 0.25s ease-in-out |
| **컷** | 즉시 전환 | transition none (신속 탐색용) |

```javascript
// 애니메이션 상태 관리
const [direction, setDirection] = useState('next'); // 'next' | 'prev'
const [transitioning, setTransitioning] = useState(false);

// next: 현재 면 leftExit, 새 면 rightEnter
// prev: 현재 면 rightExit, 새 면 leftEnter
```

---

## 10. 접근성 및 반응형

### 반응형 분기

| 브레이크포인트 | 판별 변환 |
|--------------|---------|
| ≥1024px | 모든 판 원래 디자인 |
| 768~1023px | 2분할판 → 60/40, 화보판 보조사진 2개로 제한 |
| <768px | 2분할판·편집판 → 세로 스택, 3면판 → 1열 세로, 전면판 유지 |
| <480px | 필름판 → 1장씩 전체 너비 snap |

### 접근성

```
- 각 면: role="article", aria-label="면 {n} / {total}, {판이름}"
- 네비게이션 버튼: aria-label="이전 면" / "다음 면"
- 이미지: alt 텍스트 필수 (photo.title 또는 "사진")
- 키보드: Tab으로 면 내 링크/버튼 접근 가능
- 고대비 모드: 텍스트 오버레이 배경 강화 (rgba → 0.9 이상)
```

---

## 11. 스프린트 계획

### Sprint 1 — 코어 뷰어 (2주)
| 작업 | 파일 | 예상 시간 |
|------|------|---------|
| `MagazineViewer` 컴포넌트 (래퍼 + 네비게이션) | `MagazineViewer.jsx` | 6h |
| `FullBleedSpread` + `EditorialSpread` (2종 먼저) | `spreads/` 폴더 | 4h |
| `MagazineTopBar` + `MagazineBottomBar` | 각 컴포넌트 | 3h |
| PhotoDetailPage에 "매거진으로 보기" 버튼 추가 | `PhotoDetailPage.jsx` | 1h |
| 슬라이드 트랜지션 애니메이션 | `MagazineViewer.jsx` | 2h |

### Sprint 2 — 판 확장 + 갤러리 통합 (2주)
| 작업 | 파일 | 예상 시간 |
|------|------|---------|
| 나머지 판 5종 (`SplitSpread`, `TriptychSpread` 등) | `spreads/` | 8h |
| `GalleryPage` 매거진 뷰 모드 추가 (⊟ 버튼) | `GalleryPage.jsx` | 3h |
| `MagazineTOC` 목차 패널 | `MagazineTOC.jsx` | 2h |
| `PanSelector` UI (PhotoFormPage에 삽입) | `PanSelector.jsx` | 3h |
| `MagazineSpreadPreview` (미니 프리뷰) | `MagazineSpreadPreview.jsx` | 2h |

### Sprint 3 — 연결 사진 + 시리즈 통합 (1주)
| 작업 | 파일 | 예상 시간 |
|------|------|---------|
| Backend: `pan_type` 컬럼 + API 확장 | `Photo.java`, `PhotoController.java` | 2h |
| Backend: `photo_support_links` 테이블 + API | 신규 `PhotoSupportLinkController.java` | 3h |
| 시리즈 매거진 모드 ("한 호 보기") | `SeriesPage.jsx` | 3h |
| Frontend: 연결 사진 선택 UI (PhotoForm) | `PhotoFormPage.jsx` | 2h |

---

## 12. 수용 기준 (Acceptance Criteria)

### AC-01. 판 선택
- [ ] 사진 업로드/편집 시 7종 판 선택 UI가 표시된다
- [ ] 선택한 판이 저장되고 다음 방문 시에도 유지된다
- [ ] 3면판/화보판/필름판 선택 시 연결 사진 추가 UI가 노출된다

### AC-02. 매거진 뷰어 (기본)
- [ ] PhotoDetailPage에서 "매거진으로 보기" 클릭 시 전체화면 뷰어가 열린다
- [ ] 해당 사진이 지정된 판 타입으로 올바르게 렌더링된다
- [ ] 이전/다음 버튼으로 같은 작가의 다른 사진(면)으로 이동한다
- [ ] ESC 키 또는 닫기 버튼으로 뷰어가 닫힌다
- [ ] 슬라이드 트랜지션 애니메이션이 부드럽다

### AC-03. 갤러리 매거진 뷰
- [ ] 툴바에 매거진 뷰 토글 버튼이 추가된다
- [ ] 매거진 뷰에서 사진들이 각 판 타입으로 순서대로 표시된다
- [ ] snap scrolling으로 면 단위 이동이 된다

### AC-04. 반응형
- [ ] 모바일(768px 미만)에서 2분할판이 세로 스택으로 변환된다
- [ ] 필름판이 모바일에서 터치 스와이프로 동작한다

### AC-05. 시리즈 매거진 모드
- [ ] 시리즈 페이지에서 "매거진으로 보기" 버튼으로 시리즈 전체를 매거진으로 감상한다
- [ ] 시리즈 제목이 매거진 헤더에 표시된다
- [ ] 면 번호와 전체 면 수가 하단에 표시된다

---

## 13. 레퍼런스 사이트 분석

| 사이트 | 참고할 점 |
|-------|---------|
| **Format.com** | 판 타입 템플릿 선택 UI, 에디토리얼 레이아웃 |
| **Vogue.com** | 전면판 + 텍스트 오버레이, 화보판 구성 |
| **Magnum Photos** | 편집판 — 사진 70% + 설명 30% |
| **Behance** | 프로젝트를 여러 이미지 조합으로 스토리 전달 |
| **Cargo** | 미니멀 + 여백 강조 (인물판 참고) |
| **VSCO** | 필름판 감성 (필름 퍼포레이션, 어두운 배경) |

---

## 14. Claude.ai 아티팩트 프롬프트 (시각 목업용)

```
아래 스펙으로 "매거진 면·판 뷰어" React 컴포넌트 목업을 만들어줘.

[요구사항]
1. 전체화면 매거진 뷰어 (MagazineViewer)
   - 상단바: "← 닫기" | 중앙: "작가명 / 시리즈명" | 우측: "목차 ☰ 공유 ↗ 인쇄 🖨"
   - 중앙 콘텐츠: 현재 선택된 판 타입 렌더링
   - 하단바: "◁" | 섬네일 5개 수평 스크롤 | "▷" | "면 2 / 8"

2. 판 타입 샘플 3종 탭으로 전환:
   탭① 전면판: 사진 100% + 하단 그라디언트 + 제목/작가 오버레이
   탭② 편집판: 사진 70%(좌) + 사이드바 30%(우, 제목/캡션/태그/좋아요)
   탭③ 2분할판: 사진 58%(좌) + 텍스트 42%(우, 큰 제목+본문+작가)

3. 면 전환 버튼: 슬라이드 애니메이션으로 이전/다음 이동

4. 판 선택 UI (PhotoForm에서 사용):
   7개 버튼 그리드 (80×60px 미니 프리뷰) — 전면판/2분할판/편집판/3면판/화보판/인물판/필름판
   선택 시 primary 보더 + ✓ 아이콘

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
  bg: '#090909', surface: '#0f0f0f', border: 'rgba(255,255,255,0.07)'
  text: '#e8e8f0', textSub: '#8080b0'
  galleryBg: '#090909'

규칙:
- export default 함수형 컴포넌트 1개
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- useState로 판 타입 전환, 슬라이드 트랜지션 구현
```

---

## 15. 향후 확장 아이디어 (V2)

| 기능 | 설명 |
|------|------|
| **판 커스터마이징** | 비율·여백·폰트를 작가가 직접 수치 조정 |
| **AI 판 추천** | 사진의 구도·비율·무드를 분석해 최적 판 자동 제안 |
| **매거진 표지 디자인** | 시리즈의 첫 면을 잡지 표지처럼 꾸미는 전용 에디터 |
| **매거진 PDF 내보내기** | 시리즈 전체를 PDF로 다운로드 (A4/A5 비율) |
| **임베드 코드** | 외부 사이트에 매거진 뷰어를 iFrame으로 삽입 |
| **협업 편집** | 여러 작가가 한 시리즈를 공동 편집 |
