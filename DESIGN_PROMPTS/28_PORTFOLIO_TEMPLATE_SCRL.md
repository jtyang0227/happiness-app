# 28 — 포트폴리오 템플릿 시스템 (SCRL 참조)

> **참조 앱**: SCRL (스크롤 기반 포토 스토리텔링 앱)  
> **목표**: 작가가 자신의 `/portfolio/:profileName` 페이지를 8가지 시각 템플릿으로 커스터마이즈할 수 있는 시스템  
> **신규 라우트**: `/portfolio/:profileName/edit` (템플릿 에디터, 로그인 필요)  
> 최초 작성: 2026-06-21

---

## 1. 기획 배경 — SCRL에서 배우는 것

### SCRL의 핵심 철학

SCRL은 "한 번에 한 장" 원칙으로 스크롤에 몰입감을 준다.

| SCRL 특징 | 핵심 개념 |
|-----------|---------|
| 풀스크린 단일 사진 스크롤 | 사진이 뷰포트를 100% 채움 |
| 섹션 단위 스냅 스크롤 | 한 번의 스크롤 = 다음 사진으로 이동 |
| 최소 UI 크롬 | 제목/날짜만, 네비게이션 없음 |
| 순서 있는 내러티브 | 사진 배열이 이야기 흐름 |
| 텍스트 슬라이드 | 사진 사이에 제목/설명 슬라이드 삽입 |
| 모바일 스와이프 우선 | 터치 제스처가 primary 인터랙션 |
| 어두운 배경 | 사진에 집중, 갤러리 미술관 느낌 |

### 현재 Happiness 포트폴리오 한계

| 현황 | 문제 |
|------|------|
| 단일 레이아웃(Masonry) | 작가 개성 표현 불가 |
| 스크롤해도 레이아웃 동일 | 스토리텔링 리듬감 없음 |
| 템플릿 선택 없음 | 모든 작가 포트폴리오가 같아 보임 |
| 섹션 구성 불가 | Hero → 작품 → Footer 고정 구조 |
| 배경색/타이포 변경 불가 | 작가 브랜딩 반영 불가 |

---

## 2. 서비스 개요

### 용어 정의

| 용어 | 정의 |
|------|------|
| **템플릿 (Template)** | 포트폴리오 전체 레이아웃·분위기를 정의하는 스킨 |
| **섹션 (Section)** | 템플릿 안에서 내용을 구성하는 블록 단위 |
| **슬라이드 (Slide)** | SCRL 스타일 템플릿에서 사진 1장 = 슬라이드 1개 |
| **패널 (Panel)** | 분할 레이아웃에서 좌/우로 나뉜 영역 |
| **피스 (Piece)** | 잡지형에서 페이지 내 사진 배치 단위 |

---

## 3. 8가지 포트폴리오 템플릿

### 3-1. SCRL (스크롤 시네마틱) — 핵심

```
┌─────────────────────────────┐
│                             │
│         [사진 1장]           │  ← 100vh 풀스크린
│                             │
│  제목 ·············· 01/12  │  ← 하단 오버레이
└─────────────────────────────┘
         ↕ 스냅 스크롤
┌─────────────────────────────┐
│                             │
│         [사진 2장]           │
│                             │
│  제목 ·············· 02/12  │
└─────────────────────────────┘
```

**특징**
- 사진 한 장 = 100vh, 스냅 스크롤로 전환
- 배경 항상 `#000` (이미지 letterbox)
- 좌하단: 사진 제목 (opacity 0 → 1, hover/정지 시)
- 우하단: `01 / 12` 진행 표시
- 텍스트 슬라이드 삽입 가능 (작가 글/인용구)
- 키보드 ↑↓ / 마우스 휠 / 터치 스와이프 지원
- 사진 수: 최대 50장

**컴포넌트**: `TemplateScrl.jsx`

---

### 3-2. EDITORIAL (에디토리얼 — 기존 강화)

```
┌──────────────────────────────────────────────────────────┐
│  ████████████████████████████████████████  HERO 80vh     │
│  작가 이름 (56px, white)                                  │
│  "Portrait · Fashion · Editorial"                         │
└──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ████████████████  │  ████  │  ████  │  ████  │  ████  │  ← 피처 섹션
│      (대표사진)     │  사진2  │  사진3  │  사진4  │  사진5  │
│      (60% 폭)      │  (각 10%) 균등 분배                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ────────── TEXT BREAK ──────────────────────────────   │
│        "빛과 그림자 사이의 이야기"  (40px, italic)         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Masonry 갤러리 (4→3→2컬럼)                              │
└─────────────────────────────────────────────────────────┘
```

**특징**
- 기존 PortfolioPage 개선판 (배경/폰트/무드 필터 커스터마이즈)
- 피처 섹션: 대표 사진 1장 + 서브 4장 자동 선택
- TEXT BREAK: 작가가 직접 인용구 입력
- 배경색: 화이트 / 다크 / 커스텀 3종

**컴포넌트**: `TemplateEditorial.jsx`

---

### 3-3. FILM (필름 스트립)

```
┌─────────────────────────────────────────────────────────┐
│  필름 홀 ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●     │  ← 상단 필름 홀
├──────┬──────┬──────┬──────┬──────┬──────┬──────────────┤
│      │      │      │      │      │      │               │
│ [사진]│ [사진]│ [사진]│ [사진]│ [사진]│ [사진]│  → 가로 스크롤│
│      │      │      │      │      │      │               │
│ 001  │ 002  │ 003  │ 004  │ 005  │ 006  │               │  ← 프레임 번호
├──────┴──────┴──────┴──────┴──────┴──────┴──────────────┤
│  필름 홀 ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●     │  ← 하단 필름 홀
└─────────────────────────────────────────────────────────┘

    클릭 시 → 풀스크린 단독 뷰
```

**특징**
- 전체 배경 `#1a1208` (필름 색)
- 사진 크기 고정 `280 × 200px` (가로 스크롤)
- 상하 필름 홀 줄 (`●` 반복, monospace)
- 프레임 번호 하단 표시: `001`, `002`...
- 사진 클릭 → 확대 오버레이
- 모바일: 터치 수평 스와이프

**컴포넌트**: `TemplateFilm.jsx`

---

### 3-4. SPLIT (스플릿 내러티브)

```
┌───────────────────┬───────────────────┐
│                   │                   │
│     [사진 1]       │   제목 (32px)     │  ← 사진 좌 / 텍스트 우
│                   │   설명 (16px)     │
│                   │   날짜 · 장르     │
└───────────────────┴───────────────────┘
┌───────────────────┬───────────────────┐
│   제목 (32px)     │                   │
│   설명 (16px)     │     [사진 2]       │  ← 텍스트 좌 / 사진 우 (교대)
│   날짜 · 장르     │                   │
└───────────────────┴───────────────────┘
┌───────────────────┬───────────────────┐
│                   │                   │
│     [사진 3]       │   제목 (32px)     │
│                   │   ...             │
└───────────────────┴───────────────────┘
```

**특징**
- 50:50 분할 (모바일: 세로 적층)
- 좌/우 교대 배치 (zigzag)
- 텍스트 패널: 배경색 변경 가능 (라이트/다크/프라이머리)
- 스크롤 시 사진 fade-in + 텍스트 slide-in 애니메이션
- 사진당 description 개별 입력 가능

**컴포넌트**: `TemplateSplit.jsx`

---

### 3-5. MOSAIC (다이나믹 모자이크)

```
┌────┬──────────┬────┬────┐
│    │          │    │    │  ← 행 1 (가중치: 1:2:1:1)
│ A  │    B     │ C  │ D  │
│    │ (피처)    │    │    │
├────┴────┬─────┴────┤    │
│         │          │    │  ← 행 2
│    E    │    F     │    │
│         │          │    │
├─────────┴──┬───────┴────┤
│            │            │  ← 행 3 (50:50)
│     G      │     H      │
└────────────┴────────────┘
```

**특징**
- 각 행의 사진 비율은 원본 aspect ratio 반영
- 피처 사진 1장 (2배 크기)은 작가가 수동 지정
- 갭 `2px`, 사진 hover → 어두운 오버레이 + 제목
- 배경 `#000` 또는 `#f5f5f5` (라이트/다크)
- 반응형: 모바일 2컬럼으로 자동 축소

**컴포넌트**: `TemplateMosaic.jsx`

---

### 3-6. MAGAZINE (매거진 — 25번 파일 연계)

```
┌─────────────────────────────────────────────────────────┐
│  VOL.03  HAPPINESS PORTFOLIO  JUNE 2026  ──────────── │  ← 헤더 바
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  (70%)  │
│                                                          │  ← 커버 스프레드
│        SEONGJIN PHOTO                                    │
│        "2026 봄 컬렉션"                                   │
└──────────────────────────────────────────────────────────┘

┌────────────┬────────────────────────────────────────────┐
│            │  ████████████  │  ████████  │              │  ← 3단 레이아웃
│  ███████   │               │            │  기사 텍스트   │
│  (세로사진)  │               │            │  (더미)       │
└────────────┴────────────────────────────────────────────┘
```

**특징**
- 잡지 헤더 바: `VOL.{N}  {작가이름}  {날짜}` 고정
- 페이지 단위로 스크롤 (섹션 스냅 선택 가능)
- 25번 기획의 판(版) 7종 선택 가능 (FULL_BLEED, SPLIT, EDITORIAL 등)
- 대표 시리즈를 각 "잡지 챕터"로 구성

**컴포넌트**: `TemplateMagazine.jsx` (25번 MagazineViewer 재사용)

---

### 3-7. MINIMAL (미니멀 타이포)

```
              seongjin.

  Photographer based in Seoul.
  Portrait · Commercial · Fine Art

  ─────────────────────────────


  [사진] [사진] [사진]   ← 정방형 3열 그리드
  [사진] [사진] [사진]   (클릭 → 확대)
  [사진] [사진] [사진]

  ─────────────────────────────

       Let's work together →
```

**특징**
- 폰트 크기 최소화, 여백 최대화
- 그리드 열 수: 2~4 (설정 가능)
- 정방형 크롭 (object-fit: cover, 1:1 aspect-ratio)
- 텍스트 전부 소문자, serif/sans-serif 선택
- 배경: 순백 `#ffffff` 또는 크림 `#f9f6f0`
- 사진 title/caption 숨김 (hover 시에만 표시)

**컴포넌트**: `TemplateMinimal.jsx`

---

### 3-8. DARK ROOM (다크룸 갤러리)

```
┌─────────────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████████████│  ← 배경 #0a0a0a
│                                                         │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│   │          │  │          │  │          │            │
│   │  [사진]   │  │  [사진]   │  │  [사진]   │            │
│   │          │  │          │  │          │            │
│   └──────────┘  └──────────┘  └──────────┘            │
│   ○ WARM ━━━━━  ○ NATURAL ━   ○ COOL ━━━━━━━          │  ← 무드 스포트라이트
│                                                         │
│   ┌───────────────────────┐                             │
│   │       [피처사진]        │   ← 클릭된 사진 강조         │
│   └───────────────────────┘                             │
└─────────────────────────────────────────────────────────┘
```

**특징**
- 전체 배경 `#080808`, 텍스트 `#cccccc`
- 사진 위에 스포트라이트 효과 (radial-gradient)
- 클릭한 사진 → 아래 피처 영역에 확대 표시
- colorMood 필터가 작동하면 해당 무드 사진들이 자연스럽게 그룹화
- 무드별 색 라벨 (WARM=주황, COOL=파랑 등)
- 갤러리·미술관 분위기

**컴포넌트**: `TemplateDarkRoom.jsx`

---

## 4. 템플릿 에디터 UI

### 4-1. 진입 경로

```
ProfilePage → [포트폴리오 설정] 탭
  → "템플릿 변경" 버튼
  → /portfolio/:profileName/edit  (로그인한 본인만)

또는

PortfolioPage (본인 접속 시)
  → 우상단 ✏️ 편집 모드 버튼 (기존 로그인 감지 로직과 동일)
```

### 4-2. 에디터 레이아웃

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← 포트폴리오로 돌아가기          ✨ 서진의 포트폴리오 편집           [저장] [미리보기]│
├───────────────┬──────────────────────────────────────────────────────┤
│               │                                                      │
│  [왼쪽 패널]   │                   미리보기 영역                        │
│  320px 고정   │                   (실시간 반영)                         │
│               │                                                      │
│  ┌──────────┐ │                                                      │
│  │ 1. 템플릿  │ │                                                      │
│  │  선택    │ │                                                      │
│  └──────────┘ │                                                      │
│               │                                                      │
│  ┌──────────┐ │                                                      │
│  │ 2. 섹션   │ │                                                      │
│  │  구성    │ │                                                      │
│  └──────────┘ │                                                      │
│               │                                                      │
│  ┌──────────┐ │                                                      │
│  │ 3. 스타일  │ │                                                      │
│  │  설정    │ │                                                      │
│  └──────────┘ │                                                      │
│               │                                                      │
│  ┌──────────┐ │                                                      │
│  │ 4. 사진   │ │                                                      │
│  │  순서    │ │                                                      │
│  └──────────┘ │                                                      │
│               │                                                      │
└───────────────┴──────────────────────────────────────────────────────┘
```

### 4-3. 패널 1 — 템플릿 선택

```
┌─────────────────────────┐
│  템플릿 선택              │
│                         │
│  ┌─────┐  ┌─────┐       │
│  │▌▌▌▌│  │━━━━│       │
│  │SCRL │  │EDIT │       │  ← 썸네일 미리보기 카드
│  └─────┘  └─────┘       │
│  ✓ 스크롤     에디토리얼   │
│                         │
│  ┌─────┐  ┌─────┐       │
│  │▐▐▐▐│  │▪▪▪▪│       │
│  │FILM │  │SPLT │       │
│  └─────┘  └─────┘       │
│   필름      스플릿         │
│                         │
│  ┌─────┐  ┌─────┐       │
│  │▦▦▦▦│  │═════│       │
│  │MZAK │  │MGZN │       │
│  └─────┘  └─────┘       │
│   모자이크    매거진        │
│                         │
│  ┌─────┐  ┌─────┐       │
│  │  ·  │  │░░░░│       │
│  │MIN  │  │DRKR │       │
│  └─────┘  └─────┘       │
│   미니멀    다크룸         │
└─────────────────────────┘
```

- 현재 선택 카드: 테두리 `2px solid primary`, 체크 배지
- 카드 hover: scale(1.03), box-shadow

### 4-4. 패널 2 — 섹션 구성 (SCRL 템플릿 예시)

```
┌─────────────────────────┐
│  섹션 구성  [+ 섹션 추가]  │
│                         │
│  ⠿ Hero (커버)          │  ← 드래그 핸들 ⠿
│     [배경 사진 선택 ▾]   │
│                         │
│  ⠿ 📸 사진 슬라이드       │
│     • 봄 컬렉션 (12장)   │
│     [사진 변경]           │
│                         │
│  ⠿ 📝 텍스트 슬라이드      │
│     "빛과 그림자의..."    │
│     [텍스트 편집]          │
│                         │
│  ⠿ 📸 사진 슬라이드       │
│     • 인물 시리즈 (8장)   │
│     [사진 변경]           │
│                         │
│  ⠿ 📞 Footer CTA        │
│     [문의하기 버튼]        │
│                         │
└─────────────────────────┘
```

섹션 타입:
| 타입 | 아이콘 | 내용 |
|------|--------|------|
| `HERO` | 🖼️ | 커버 이미지 + 작가명 |
| `PHOTO_SLIDE` | 📸 | 사진 묶음 (시리즈 선택 가능) |
| `TEXT_SLIDE` | 📝 | 인용구 / 작가 글 |
| `DIVIDER` | ─── | 구분선 + 챕터 제목 |
| `SERIES_CARD` | 📁 | 시리즈 카드 그리드 |
| `INQUIRY_CTA` | 📞 | 문의 버튼 섹션 |
| `STATS` | 📊 | 통계 바 |

### 4-5. 패널 3 — 스타일 설정

```
┌─────────────────────────┐
│  스타일 설정              │
│                         │
│  배경 테마               │
│  ○ 다크 (기본)            │
│  ○ 라이트                │
│  ○ 크림 (#f9f6f0)        │
│  ○ 커스텀 ───────────    │
│     [색상 HEX 입력]       │
│                         │
│  폰트 스타일              │
│  ○ Modern (기본)          │
│  ○ Serif (고전적)         │
│  ○ Mono (미니멀)          │
│                         │
│  사진 간격               │
│  [──●──────] 4px        │
│                         │
│  오버레이 강도             │
│  [────●───] 60%         │
│                         │
│  스냅 스크롤              │
│  [ON / off]             │
│                         │
└─────────────────────────┘
```

### 4-6. 패널 4 — 사진 순서 (SCRL 모드)

```
┌─────────────────────────┐
│  사진 순서               │
│  (드래그로 순서 변경)      │
│                         │
│  ⠿ [썸] 봄 컬렉션 1    │
│  ⠿ [썸] 봄 컬렉션 2    │
│  ⠿ [썸] 인물 1         │
│  ⠿ [텍스트 슬라이드]    │
│  ⠿ [썸] 인물 2         │
│  ⠿ [썸] 야경 1         │
│                         │
│  [전체 사진으로 초기화]    │
└─────────────────────────┘
```

---

## 5. 미리보기 시스템

### 5-1. 실시간 미리보기 (에디터 우측)

- 에디터 우측 패널: 실제 `/portfolio/:profileName` 렌더링
- iframe으로 포트폴리오 페이지 삽입 (scale: 0.6 축소)
- 스타일 변경 → postMessage로 iframe에 실시간 반영
- 단, 스냅 스크롤 등 인터랙션은 preview iframe 내에서 완전 동작

```
┌───────────────────────────────────────────┐
│ [모바일] [태블릿] [데스크톱] 뷰포트 전환 탭 │
├───────────────────────────────────────────┤
│                                           │
│    ┌─────────────────────────────────┐    │
│    │  [축소된 포트폴리오 미리보기]       │    │
│    │   scale(0.6) iframe             │    │
│    │                                 │    │
│    │                                 │    │
│    └─────────────────────────────────┘    │
│                                           │
└───────────────────────────────────────────┘
```

### 5-2. 전체 화면 미리보기

- "미리보기" 버튼 클릭 → 새 탭 `?preview=true` 쿼리로 포트폴리오 열기
- preview=true 시 편집 버튼 숨김, 저장되지 않은 설정은 sessionStorage 경유

---

## 6. 공개 포트폴리오 URL 동작

### 템플릿별 렌더링 분기

```jsx
// PortfolioPage.jsx 내부
function PortfolioContent({ template, photos, member, sections, style }) {
  switch (template) {
    case 'SCRL':       return <TemplateScrl       {...props} />;
    case 'EDITORIAL':  return <TemplateEditorial  {...props} />;
    case 'FILM':       return <TemplateFilm       {...props} />;
    case 'SPLIT':      return <TemplateSplit      {...props} />;
    case 'MOSAIC':     return <TemplateMosaic     {...props} />;
    case 'MAGAZINE':   return <TemplateMagazine   {...props} />;
    case 'MINIMAL':    return <TemplateMinimal    {...props} />;
    case 'DARK_ROOM':  return <TemplateDarkRoom   {...props} />;
    default:           return <TemplateEditorial  {...props} />;
  }
}
```

### SCRL 템플릿 스냅 스크롤 구현

```jsx
// TemplateScrl.jsx 핵심 구조
const [current, setCurrent] = useState(0);

// CSS scroll-snap (성능 우선)
const containerStyle = {
  height: '100vh',
  overflowY: 'scroll',
  scrollSnapType: 'y mandatory',
  scrollBehavior: 'smooth',
};

const slideStyle = {
  height: '100vh',
  scrollSnapAlign: 'start',
  position: 'relative',
  background: '#000',
};

// IntersectionObserver로 현재 슬라이드 추적
useEffect(() => {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setCurrent(Number(e.target.dataset.index));
      });
    },
    { threshold: 0.5 }
  );
  // ...
}, []);
```

---

## 7. 데이터 모델

### 7-1. Member 엔티티 추가 컬럼

```sql
-- 포트폴리오 템플릿 설정 (운영 DB 마이그레이션)
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS portfolio_template    VARCHAR(20)  DEFAULT 'EDITORIAL',
  ADD COLUMN IF NOT EXISTS portfolio_style_json  TEXT,         -- JSON: 배경색, 폰트, 간격 등
  ADD COLUMN IF NOT EXISTS portfolio_sections_json TEXT;        -- JSON: 섹션 구성 배열

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_members_portfolio_template ON members(portfolio_template);
```

### 7-2. portfolio_style_json 스키마

```json
{
  "theme": "dark",
  "bgColor": "#000000",
  "font": "modern",
  "gap": 4,
  "overlayIntensity": 0.6,
  "snapScroll": true,
  "accentColor": "#5b6ef5"
}
```

### 7-3. portfolio_sections_json 스키마

```json
[
  {
    "id": "sec-1",
    "type": "HERO",
    "coverPhotoId": 42,
    "title": "서진",
    "subtitle": "Portrait · Fashion · Fine Art"
  },
  {
    "id": "sec-2",
    "type": "PHOTO_SLIDE",
    "seriesId": 7,
    "photoIds": [1, 2, 3, 4, 5],
    "label": "봄 컬렉션"
  },
  {
    "id": "sec-3",
    "type": "TEXT_SLIDE",
    "text": "빛과 그림자 사이, 그 순간을 포착합니다.",
    "align": "center"
  },
  {
    "id": "sec-4",
    "type": "INQUIRY_CTA",
    "buttonLabel": "함께 작업하기"
  }
]
```

### 7-4. API 엔드포인트

```
GET  /api/portfolio/:profileName          기존 — photo 목록 포함
PUT  /api/portfolio/:profileName/template 템플릿 설정 저장 (본인만)
GET  /api/portfolio/:profileName/config   템플릿 설정 조회 (공개)
```

---

## 8. 백엔드 변경 사항

### 8-1. Member 엔티티

```java
// Member.java 추가 필드
@Column(nullable = true, length = 20)
private String portfolioTemplate = "EDITORIAL";

@Column(columnDefinition = "TEXT")
private String portfolioStyleJson;

@Column(columnDefinition = "TEXT")
private String portfolioSectionsJson;
```

### 8-2. PortfolioController 신규 엔드포인트

```java
// GET /api/portfolio/{profileName}/config  ← 공개 (인증 불필요)
@GetMapping("/{profileName}/config")
public ResponseEntity<?> getPortfolioConfig(@PathVariable String profileName) {
    Member member = memberRepository.findByProfileName(profileName)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    Map<String, Object> config = new HashMap<>();
    config.put("template", member.getPortfolioTemplate());
    config.put("style", member.getPortfolioStyleJson());
    config.put("sections", member.getPortfolioSectionsJson());
    return ResponseEntity.ok(config);
}

// PUT /api/portfolio/{profileName}/template  ← 본인 또는 관리자만
@PutMapping("/{profileName}/template")
public ResponseEntity<?> updatePortfolioTemplate(
        @PathVariable String profileName,
        @AuthenticationPrincipal CustomUserDetails userDetails,
        @RequestBody Map<String, Object> body) {

    Member member = memberRepository.findByProfileName(profileName)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

    boolean isAdmin = "WM".equals(userDetails.getRole()) || "SA".equals(userDetails.getRole());
    if (!isAdmin && !member.getId().equals(userDetails.getId())) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    String template = (String) body.get("template");
    // 화이트리스트 검증
    List<String> allowed = List.of("SCRL","EDITORIAL","FILM","SPLIT","MOSAIC","MAGAZINE","MINIMAL","DARK_ROOM");
    if (!allowed.contains(template)) {
        return ResponseEntity.badRequest().body("유효하지 않은 템플릿입니다.");
    }

    member.setPortfolioTemplate(template);
    member.setPortfolioStyleJson((String) body.get("style"));
    member.setPortfolioSectionsJson((String) body.get("sections"));
    memberRepository.save(member);

    return ResponseEntity.ok(Map.of("status", "success"));
}
```

---

## 9. 프론트엔드 파일 구조

```
frontend/src/
├── pages/
│   ├── PortfolioPage.jsx          (수정 — 템플릿 분기 + config 로드)
│   ├── PortfolioTemplatePage.jsx  (신규 — 템플릿 에디터)
│   └── PortfolioSlideshowPage.jsx (기존 유지)
│
├── components/portfolio/
│   ├── templates/
│   │   ├── TemplateScrl.jsx       (신규)
│   │   ├── TemplateEditorial.jsx  (기존 PortfolioPage 분리)
│   │   ├── TemplateFilm.jsx       (신규)
│   │   ├── TemplateSplit.jsx      (신규)
│   │   ├── TemplateMosaic.jsx     (신규)
│   │   ├── TemplateMagazine.jsx   (신규 — 25번 재사용)
│   │   ├── TemplateMinimal.jsx    (신규)
│   │   └── TemplateDarkRoom.jsx   (신규)
│   │
│   └── editor/
│       ├── TemplatePicker.jsx     (신규 — 8종 카드 선택 UI)
│       ├── SectionBuilder.jsx     (신규 — 드래그 섹션 구성)
│       ├── StylePanel.jsx         (신규 — 배경/폰트/간격 설정)
│       ├── PhotoOrderPanel.jsx    (신규 — 사진 순서 드래그)
│       └── PortfolioPreview.jsx   (신규 — iframe 미리보기)
│
└── services/api.js
    portfolioApi.getConfig(profileName)
    portfolioApi.updateTemplate(profileName, data)
```

### 라우트 추가

```jsx
// App.jsx
<Route path="/portfolio/:profileName/edit" element={
  <ProtectedRoute>
    <PortfolioTemplatePage />
  </ProtectedRoute>
} />
```

---

## 10. 핵심 인터랙션 디테일

### 10-1. SCRL 템플릿 — 텍스트 슬라이드

```
┌─────────────────────────────┐
│                             │
│                             │
│                             │
│    "빛과 그림자 사이,        │  ← 중앙 정렬, 흰 텍스트
│     그 순간을 포착합니다."   │     40px, weight 300, italic
│                             │
│     — Seongjin Kim          │  ← 작가 이름, 16px
│                             │
│                             │
│  · · · · · ● · · · · · ·   │  ← 현재 위치 도트 인디케이터
└─────────────────────────────┘
배경: 완전 검정 #000 또는 primaryDark
전환: 이전 슬라이드 fade-out 0.3s → 텍스트 fade-in 0.4s
```

### 10-2. FILM 템플릿 — 프레임 번호

```css
/* 필름 홀 줄 */
.film-strip-holes {
  background: repeating-linear-gradient(
    to right,
    transparent 0px, transparent 12px,
    #1a1208 12px, #1a1208 16px
  );
  height: 20px;
  position: relative;
}
.film-strip-holes::after {
  content: '⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛';
  /* 실제는 div 반복으로 구현 */
}
```

### 10-3. SPLIT 템플릿 — 스크롤 애니메이션

```jsx
// IntersectionObserver로 섹션 진입 감지
const [visible, setVisible] = useState(false);
const ref = useRef(null);

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) setVisible(true); },
    { threshold: 0.3 }
  );
  if (ref.current) observer.observe(ref.current);
  return () => observer.disconnect();
}, []);

// 짝수 행: 사진 왼쪽, 텍스트 오른쪽 (slide from left)
// 홀수 행: 텍스트 왼쪽, 사진 오른쪽 (slide from right)
const photoStyle = {
  transform: visible ? 'translateX(0)' : (isEven ? 'translateX(-60px)' : 'translateX(60px)'),
  opacity: visible ? 1 : 0,
  transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
};
```

### 10-4. 다크룸 템플릿 — 스포트라이트

```jsx
// 마우스 위치 추적 → 스포트라이트 이동
const [mousePos, setMousePos] = useState({ x: '50%', y: '50%' });

const spotlightStyle = {
  background: `radial-gradient(
    circle 200px at ${mousePos.x} ${mousePos.y},
    rgba(255,255,255,0.06) 0%,
    transparent 70%
  )`,
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 1,
};
```

---

## 11. 모바일 UX

| 템플릿 | 모바일 동작 |
|--------|------------|
| SCRL | 터치 스와이프 ↕, 진행 도트 표시 |
| EDITORIAL | 1컬럼 적층, Hero 50vh로 축소 |
| FILM | 수평 스와이프, 카드 폭 80vw |
| SPLIT | 세로 적층 (사진 위 → 텍스트 아래) |
| MOSAIC | 2컬럼 그리드, 피처 사진 100% 폭 |
| MAGAZINE | 1컬럼 단순화, 판(版) 2종만 허용 |
| MINIMAL | 2컬럼 정방형 그리드 |
| DARK_ROOM | 1컬럼 세로 스크롤, 스포트라이트 고정 |

---

## 12. 접근성

- 모든 템플릿에 `prefers-reduced-motion` 미디어쿼리 적용 → 애니메이션 비활성화
- SCRL 키보드 내비게이션: ↑↓ 화살표, Page Up/Down, Space
- 이미지 alt 텍스트: `photo.title || '사진 작품'`
- 색 대비: 오버레이 텍스트 `contrast ≥ 4.5:1` (WCAG AA)
- focus-visible 링 표시 (Tab 키 사용자)

---

## 13. 구현 스프린트 계획

### Sprint 1 — 기반 (1주)

**백엔드**
- `Member` 엔티티 3개 컬럼 추가
- `GET /api/portfolio/:profileName/config` 엔드포인트
- `PUT /api/portfolio/:profileName/template` 엔드포인트 (IDOR 방지 포함)
- 운영 DB 마이그레이션 SQL 실행

**프론트엔드**
- `portfolioApi.getConfig()` / `portfolioApi.updateTemplate()` 추가
- `PortfolioPage.jsx` — `portfolioTemplate`에 따라 컴포넌트 분기
- `TemplateEditorial.jsx` — 기존 PortfolioPage 내용을 이 파일로 분리

### Sprint 2 — 핵심 템플릿 3종 (2주)

- `TemplateScrl.jsx` — CSS scroll-snap + IntersectionObserver + 도트 인디케이터
- `TemplateSplit.jsx` — 교대 배치 + 스크롤 애니메이션
- `TemplateMinimal.jsx` — 정방형 그리드 + 여백 시스템
- `PortfolioTemplatePage.jsx` — 에디터 껍데기 (4개 패널)
- `TemplatePicker.jsx` — 8종 카드 선택 UI

### Sprint 3 — 나머지 템플릿 + 에디터 고도화 (2주)

- `TemplateFilm.jsx` — 필름 스트립 가로 스크롤
- `TemplateMosaic.jsx` — 다이나믹 모자이크 그리드
- `TemplateDarkRoom.jsx` — 스포트라이트 + 피처 뷰
- `TemplateMagazine.jsx` — 25번 MagazineViewer 래핑
- `SectionBuilder.jsx` — 드래그 가능 섹션 구성
- `StylePanel.jsx` — 배경/폰트/간격 설정
- `PortfolioPreview.jsx` — iframe 실시간 미리보기
- ProfilePage 설정 탭 → "포트폴리오 편집" 진입 링크

---

## 14. Claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style
아이콘: 이모지/유니코드 (외부 라이브러리 없음)

현재 컬러 시스템:
  primary: '#5b6ef5'  primaryDark: '#4458e0'  primaryLight: '#eef0ff'
  bg: '#f5f5fa'  surface: '#ffffff'  border: '#e2e2ee'
  text: '#1a1a2e'  textSecondary: '#5c5c7a'
  bg: '#090909'  surface: '#0f0f0f'  galleryBg: '#090909'

[작업 요청]
포트폴리오 템플릿 에디터 페이지를 단일 React 컴포넌트로 만들어 주세요.
왼쪽 320px 사이드 패널 + 오른쪽 미리보기 영역으로 구성.

사이드 패널 4개 아코디언 섹션:
1. 템플릿 선택: 8종 카드 그리드 (SCRL·EDITORIAL·FILM·SPLIT·MOSAIC·MAGAZINE·MINIMAL·DARK_ROOM)
   - 각 카드: 60×44px 미니 시각화(CSS only) + 한글 이름 + 영문 코드
   - 선택된 카드: border 2px solid #5b6ef5 + ✓ 배지
2. 스타일 설정: 배경 테마 라디오(다크/라이트/크림), 폰트 라디오, 간격 슬라이더
3. 섹션 구성: 섹션 목록 (⠿ 드래그 핸들 + 섹션 타입 이모지 + 이름)
4. 저장/공유: [미리보기] [저장] 버튼

오른쪽 미리보기:
- 현재 선택된 템플릿 이름 크게 표시
- 배경색/폰트 스타일 실시간 반영
- [모바일] [데스크톱] 뷰포트 토글
- 더미 사진 3×3 그리드 (회색 박스)로 레이아웃 시뮬레이션

규칙:
- export default 함수형 컴포넌트 1개
- style은 inline object
- 외부 라이브러리 없음 (react, react-router-dom만)
- 한국어 UI
```

---

## 15. 관련 기획서 연계

| 파일 | 연계 내용 |
|------|---------|
| `25_MAGAZINE_SPREAD_LAYOUT.md` | `TemplateMagazine` 이 MagazineViewer 재사용 |
| `26_GENRE_CLASSIFICATION.md` | DARK_ROOM 템플릿의 무드 필터와 장르 필터 연동 |
| `27_MULTILINGUAL.md` | 에디터 UI의 모든 텍스트 t() 함수 처리 |
| `09_PORTFOLIO_BUILDER.md` | 슬라이드쇼는 별도 라우트 유지, SCRL 템플릿과 구분 |
| `11_PORTFOLIO_REDESIGN.md` | EDITORIAL 템플릿 = 기존 PortfolioPage 코드 재활용 |

---

*다음 단계: `DESIGN_PROMPTS/00_ROADMAP.md`에 28번 파일 등록 후 Sprint 1 백엔드 작업 착수*
