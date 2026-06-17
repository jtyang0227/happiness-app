# 09 — 이미지 포트폴리오 빌더 (슬라이드쇼 · 레이아웃 · PDF 내보내기)

> P1: 풀스크린 슬라이드쇼 뷰어  
> P2: 레이아웃 선택 · PDF 내보내기 · 임베드 코드 · 커버 페이지 설정

---

## 기획 배경

외국 사진작가들(예: Brandon Woelfel, Peter Lindbergh 등)의 포트폴리오 사이트는  
**이미지가 주인공**이 되는 몰입형 경험을 제공한다:

| 외국 작가 포트폴리오 특징 | 현재 Happiness 상태 |
|--------------------------|---------------------|
| 풀스크린 슬라이드쇼 | ❌ 그리드 목록만 존재 |
| 화면 전체를 채우는 이미지 뷰 | ❌ 최대 높이 제한 |
| 키보드 ←→ 네비게이션 | ❌ 미구현 |
| 작가 소개 커버 페이지 | ❌ 미구현 |
| PDF 포트폴리오 내보내기 | ❌ 미구현 |
| 레이아웃 선택 (격자/잡지형) | ❌ 고정 masonry만 |
| 타 사이트 임베드 | ❌ 미구현 |

---

## 저장 경로

```
frontend/src/
  pages/PortfolioSlideshowPage.jsx     (신규 — 풀스크린 슬라이드쇼)
  pages/PortfolioPage.jsx              (수정 — 슬라이드쇼 진입 버튼 추가)
  components/portfolio/
    SlideshowViewer.jsx                (신규 — 슬라이드 단일 뷰)
    PortfolioCoverPage.jsx             (신규 — 작가 소개 커버)
    PortfolioLayoutPicker.jsx          (신규 — 레이아웃 선택 UI)
    EmbedCodeModal.jsx                 (신규 — 임베드 코드 생성)

backend:
  Member.java                          (수정 — portfolioLayout, portfolioCoverPhotoId 추가)
  ProfileUpdateRequest.java            (수정 — 신규 필드 추가)
```

---

## 신규 라우트

```
공개 (헤더 없음, 다크 테마):
  /portfolio/:profileName/slideshow    PortfolioSlideshowPage  ← 신규
```

---

## [1] 풀스크린 슬라이드쇼 뷰어

### 동작 흐름

```
PortfolioPage → "슬라이드쇼 보기" 버튼 클릭
  → /portfolio/:profileName/slideshow
  → PortfolioSlideshowPage 로드 (동일 API 재사용)
  → 첫 번째 사진 풀스크린 표시
  → ←→ 키보드 / 버튼으로 이동
  → ESC 또는 "갤러리로" 버튼으로 복귀
```

### 데이터

`GET /api/portfolio/:profileName` — 기존 API 그대로 사용  
시리즈 선택 기능은 추후 확장 (Phase 4-3)

---

### claude.ai 아티팩트 프롬프트 — PortfolioSlideshowPage

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style
아이콘: 이모지 또는 유니코드 기호
컬러: darkBg '#0a0a18' darkSurface '#12122a' darkText '#e8e8f0'
      darkTextSub '#8080b0' primary '#5b6ef5' accent '#a78bfa'
규칙: export default 함수형 컴포넌트 1개, style inline object, 외부 라이브러리 없음, 한국어 UI

PortfolioSlideshowPage 전체 페이지를 만들어주세요.
useParams로 profileName 취득, 실제 API 없이 mock 데이터 20장 사용.

레이아웃:
  전체: 100vw × 100vh, background #000, overflow hidden
  이미지 영역: 전체 화면 가득, object-fit contain (가로/세로 이미지 모두 대응)
  이미지 전환: fade 애니메이션 (opacity 0→1, 0.4s)

상단 바 (position fixed, top 0, z-index 10, 100% width):
  - 배경: linear-gradient(#0008 → transparent), height 72px
  - 좌: "← 갤러리로" 버튼 (작은 텍스트 버튼, color #ffffffcc)
  - 중앙: 작가명 (16px 600 #fff) + "@profileName" (13px #ffffffaa)
  - 우: "N / 20" 표시 (14px #ffffffaa)

하단 바 (position fixed, bottom 0, 100% width):
  - 배경: linear-gradient(transparent → #0008), height 80px
  - 중앙: ○○●○○ 인디케이터 (현재 페이지 강조, 최대 7개 표시)
  - 우: 자동재생 버튼 ▶/⏸, 3초 간격
  - 좌: "제목" + 무드 배지

이전/다음 버튼 (position fixed, top 50%, 세로 중앙):
  - 좌: ‹ 버튼 50×50px, left 16px
  - 우: › 버튼 50×50px, right 16px
  - style: rgba(255,255,255,0.15) bg, border 1px rgba(255,255,255,0.2), border-radius 50%
  - hover: rgba(255,255,255,0.3)
  - 첫/마지막 슬라이드에서 fade (opacity 0.3)

키보드: ArrowLeft / ArrowRight / Space(자동재생 토글) / Escape(갤러리 복귀)

터치: swipeLeft → 다음, swipeRight → 이전 (touchstart/touchend delta 50px 이상)

자동재생: useInterval 패턴, 3초 간격, 마지막 슬라이드에서 첫 번째로 순환
          이미지 hover 시 일시 정지

mock 데이터: 20장, 가로/세로 혼합, 제목/무드 포함
```

---

### claude.ai 아티팩트 프롬프트 — PortfolioCoverPage (커버 슬라이드)

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style
컬러: darkBg '#0a0a18' darkText '#e8e8f0' primary '#5b6ef5' accent '#a78bfa'
규칙: export default 함수형 컴포넌트, 외부 라이브러리 없음, 한국어 UI

PortfolioCoverPage 슬라이드쇼 첫 번째 커버 슬라이드를 만들어주세요.
(슬라이드쇼에서 index=0일 때 이 컴포넌트를 표시)

Props:
- coverImageUrl?: string  (없으면 darkBg gradient 배경)
- artistName: string
- profileName: string
- bio?: string
- specialties?: string[]
- photoCount: number
- seriesCount: number

레이아웃: 100vw × 100vh, position relative

배경:
  coverImageUrl 있음: <img> 100% fill, object-fit cover
    + 전체 위에 linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.65))
  없음: linear-gradient(135deg, #0a0a18 0%, #12122a 60%, #1e1040 100%)

중앙 텍스트 블록 (absolute, bottom 20%, left 10%):
  - 이름: 48px 800 #fff, letter-spacing -1px, text-shadow 0 2px 20px #0008
  - @profileName: 18px 400 rgba(255,255,255,0.6), margin-top 6px
  - bio: 15px 400 rgba(255,255,255,0.75), max-width 480px, margin-top 14px, line-height 1.7
  - specialties 칩 (있을 때): margin-top 16px, flex wrap gap 8px
      칩: height 24px, padding 0 10px, border-radius 12px
          bg rgba(255,255,255,0.12), color rgba(255,255,255,0.8), font-size 12px
  - 통계: margin-top 20px, flex gap 24px, color rgba(255,255,255,0.6), font-size 14px
      "📸 {photoCount}장" · "📚 {seriesCount}개 시리즈"

우하단 스크롤 힌트 (position absolute, bottom 28px, right 20%):
  "사진 보기 →" 14px #ffffffaa + 깜박이는 커서 (animation)

@keyframes blink: opacity 1→0.3→1, 1.8s infinite
@keyframes fadeUp: translateY(30px)→0 + opacity 0→1, 0.8s ease-out
```

---

## [2] PortfolioPage 슬라이드쇼 진입 버튼 추가

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18, React Router v6, inline style
컬러: darkBg '#0a0a18' darkSurface '#12122a' darkText '#e8e8f0'
      primary '#5b6ef5' primaryDark '#4458e0' border '#2a2a50'
규칙: 컴포넌트 1개, style inline object, 외부 라이브러리 없음, 한국어 UI

기존 PortfolioPage의 프로필 카드 액션 버튼 영역에
슬라이드쇼 진입 버튼을 추가해주세요.

버튼 디자인:
  - "▶ 슬라이드쇼" 텍스트
  - height 36px, padding 0 16px, border-radius 10px
  - bg: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)'
  - color: '#e8e8f0', fontSize: 13px
  - hover: bg rgba(255,255,255,0.15)

클릭 시: navigate(\`/portfolio/\${profileName}/slideshow\`)

배치: 기존 [팔로우] [문의하기] 버튼 우측에 추가
본인 프로필에서도 표시 (자신의 포트폴리오 미리보기 용도)
```

---

## [3] PDF 포트폴리오 내보내기

### 동작

- 슬라이드쇼 페이지 또는 포트폴리오 페이지에서 "📥 PDF 저장" 버튼 클릭
- `window.print()` 호출
- `@media print` CSS로 인쇄 레이아웃 최적화

### Print CSS 설계

```css
@media print {
  /* 숨길 요소 */
  header, nav, .slideshow-controls, button, .no-print { display: none !important; }

  /* 페이지 마진 제거 */
  @page { margin: 0; size: A4 landscape; }
  body { margin: 0; background: #fff; }

  /* 한 장씩 새 페이지 */
  .slide-page {
    page-break-after: always;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* 커버 페이지 */
  .cover-page {
    background: #0a0a18 !important;
    color: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* 사진 최대화 */
  .slide-image {
    max-width: 100%;
    max-height: 90vh;
    object-fit: contain;
  }
}
```

### claude.ai 아티팩트 프롬프트 — PrintButton

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18, inline style

PrintButton 컴포넌트를 만들어주세요.

Props:
- label?: string  (기본 "PDF 저장")
- onBeforePrint?: () => void

동작:
  클릭 → onBeforePrint 호출 → requestAnimationFrame 후 window.print()
  (requestAnimationFrame: 상태 업데이트 완료 후 인쇄 트리거)

UI: 버튼 height 36px, border-radius 10px, padding 0 14px
    내용: "📥 {label}" fontSize 13px
    dark theme 고정 (포트폴리오/슬라이드쇼는 항상 dark)
    bg rgba(255,255,255,0.1), color #e8e8f0, border 1px rgba(255,255,255,0.2)
    hover: rgba(255,255,255,0.18)
    active: scale(0.97)
```

---

## [4] 임베드 코드 생성 (EmbedCodeModal)

### 동작

- "임베드 코드" 버튼 클릭 → 모달
- 크기 선택 (600×400 / 800×500 / 전체화면)
- `<iframe>` 코드 자동 생성
- 복사 버튼

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style
컬러: darkSurface '#12122a' darkBorder '#2a2a50' darkText '#e8e8f0'
      primary '#5b6ef5' primaryLight '#eef0ff'
규칙: export default 함수형 컴포넌트, 외부 라이브러리 없음, 한국어 UI

EmbedCodeModal 컴포넌트를 만들어주세요.

Props:
- isOpen: boolean
- onClose: () => void
- profileName: string
- baseUrl?: string  (기본 'https://app.example.com')

UI:
  오버레이: position fixed, inset 0, bg rgba(0,0,0,0.7), z-index 1000

  모달 카드: max-width 480px, width 90vw, border-radius 16px
    bg darkSurface, border darkBorder, padding 24px

  헤더: "임베드 코드" 제목 + ✕ 닫기 버튼

  크기 선택 (3개 칩):
    small: "600 × 400" / medium: "800 × 500" / large: "전체화면(100%)"
    선택된 칩: primary bg #fff 텍스트
    미선택: darkBorder bg 투명

  코드 박스:
    <pre> 태그, bg rgba(0,0,0,0.4), border-radius 10px, padding 12px
    font-family monospace, font-size 12px, color '#a0d0ff'
    overflow-x auto, white-space pre-wrap
    코드 내용:
      small: <iframe src="{baseUrl}/portfolio/{profileName}/slideshow"
               width="600" height="400" frameborder="0"
               title="{profileName} 포트폴리오"></iframe>
      medium: width="800" height="500"
      large: width="100%" height="600"

  복사 버튼:
    "📋 코드 복사" → 클릭 시 "✓ 복사됨" 2초 변경
    width 100%, height 44px, bg primary, color #fff, border-radius 12px

  하단 안내: "삽입할 페이지에 위 코드를 붙여 넣으세요." 12px textMuted
```

---

## [5] 포트폴리오 레이아웃 설정 (ProfilePage 설정 탭)

### 동작

- ProfilePage 설정 탭에 "포트폴리오 레이아웃" 섹션 추가
- 레이아웃 3종 선택: **그리드** / **매거진** / **슬라이드쇼 우선**
- 커버 사진 지정 (내 사진 목록에서 선택)
- 저장 → `PUT /api/auth/member/:id/profile`

### 백엔드 추가

```java
// Member.java
@Column(name = "portfolio_layout", length = 20)
private String portfolioLayout;   // "grid" | "magazine" | "slideshow" (기본 "grid")

@Column(name = "portfolio_cover_photo_id")
private Long portfolioCoverPhotoId;   // nullable
```

```sql
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_layout VARCHAR(20) DEFAULT 'grid';
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_cover_photo_id BIGINT;
```

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style
컬러: bg '#f7f7fb' surface '#fff' border '#e5e5ed' text '#0f0f1a'
      textMuted '#8888bb' primary '#5b6ef5' primaryLight '#eef0ff'
      darkSurface '#12122a' darkBorder '#2a2a50'
규칙: export default 함수형 컴포넌트, 외부 라이브러리 없음, 한국어 UI

PortfolioLayoutPicker 컴포넌트를 만들어주세요.
(ProfilePage 설정 탭 내부에 삽입되는 섹션)

Props:
- value: 'grid'|'magazine'|'slideshow'
- onChange: (layout: string) => void
- coverPhotoId?: number
- onCoverPhotoChange?: (photoId: number) => void
- myPhotos: { id: number, imageUrl: string, title: string }[]

UI:
  섹션 제목: "포트폴리오 레이아웃" 14px 600 text

  레이아웃 카드 3개 (display grid, 3컬럼, gap 10px):
    각 카드: border-radius 12px, border 2px, padding 12px
    선택됨: border primary bg primaryLight
    미선택: border border bg surface

    카드 내부:
      상단: CSS 미니 시각화 (inline div로 그리드/매거진/슬라이드 패턴 표현)
      제목: 13px 600 / 설명: 11px textMuted

    그리드:  미니 박스 3×2 균등 격자
    매거진:  왼쪽 큰 박스 + 오른쪽 2×2 작은 박스 (잡지형)
    슬라이드: 가로로 긴 박스 하나 (풀스크린 이미지 암시)

  커버 사진 선택 (optional):
    "대표 커버 사진 (슬라이드쇼 첫 화면)" 13px textMuted
    photos 3컬럼 그리드 (최대 9장), 선택된 사진: primary border 2px + ✓ 오버레이
    "선택 안 함" 옵션 (border dashed, "첫 번째 사진 자동 사용")

  변경 즉시 onChange 호출 (저장은 부모 ProfilePage에서 처리)
```

---

## [6] 매거진 레이아웃 (PortfolioPage 내 선택적 렌더링)

### 개념

기존 masonry 그리드 외에 매거진형 레이아웃 선택 가능.  
`member.portfolioLayout === 'magazine'` 이면 MagazineGrid 컴포넌트 렌더링.

### 매거진 그리드 패턴

```
[  큰 사진 (2/3 너비)  ] [ 세로 2장 (1/3 너비) ]
[ 3장 균등 가로 ]
[  큰 사진 (1/3 너비)  ] [  큰 사진 (2/3 너비)  ]
```

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style
컬러: darkBg '#0a0a18' darkSurface '#12122a' galleryBg '#0e0e0e'
규칙: export default 함수형 컴포넌트, 외부 라이브러리 없음, 한국어 UI

MagazineGrid 컴포넌트를 만들어주세요.
포트폴리오 페이지에서 사용. 다크 테마 고정.

Props:
- photos: { id, imageUrl, title, colorMood }[]
- onPhotoClick: (id: number) => void

레이아웃 규칙 (4사진 단위 반복, 나머지는 균등 3컬럼):
  블록 A (photos[0..3]):
    row 1: [photos[0] 2fr] [photos[1] 1fr (2장 세로 스택)]
            [photos[2] 1fr] ← 2번 사진과 같은 열
    실제: CSS grid, 3열, photos[0]: grid-column span 2 / photos[1..2]: 각 1행

  블록 B (photos[4..6] 3장):
    3컬럼 균등, height 220px

  반복: 그 다음 4장은 역순 (photos[7] 1fr, photos[8..9] 2fr)

  각 셀:
    overflow hidden, cursor pointer
    img: 100% fill, object-fit cover
    hover: img scale(1.05) 0.35s + 하단 그라디언트 + 제목 오버레이
    gap: 3px

전체 max-width 1200px, margin auto

빈 상태: "사진을 추가하면 포트폴리오가 완성됩니다." 중앙 표시

mock 20장으로 데모
```

---

## 단계별 구현 순서

### Phase 4-3-1 (먼저): 슬라이드쇼 뷰어
1. `PortfolioSlideshowPage.jsx` 구현
2. `App.jsx` 라우트 추가 (`/portfolio/:profileName/slideshow`)
3. `PortfolioPage`에 "▶ 슬라이드쇼" 버튼 추가
4. STANDALONE_PATHS에 `/portfolio/:profileName/slideshow` 패턴 추가

### Phase 4-3-2: 커버 페이지 + PDF 내보내기
5. `PortfolioCoverPage.jsx` 구현 (슬라이드 0번)
6. `PrintButton.jsx` + print CSS 추가
7. 슬라이드쇼 상단에 "📥 PDF 저장" 버튼 배치

### Phase 4-3-3: 레이아웃 설정 + 매거진
8. `PortfolioLayoutPicker.jsx` → ProfilePage 설정 탭 통합
9. 백엔드: Member 필드 추가 + migration
10. `MagazineGrid.jsx` 구현
11. `PortfolioPage`에서 `portfolioLayout` 분기 렌더링

### Phase 4-3-4: 임베드 코드
12. `EmbedCodeModal.jsx` 구현
13. PortfolioPage 또는 슬라이드쇼 하단에 "임베드" 버튼 추가

---

## 백엔드 추가 API

```
GET /api/portfolio/:profileName
→ 기존 응답에 portfolioLayout, portfolioCoverPhotoId 추가

PUT /api/auth/member/:id/profile
→ 기존 엔드포인트에 portfolioLayout, portfolioCoverPhotoId 필드 추가
```

---

## CLAUDE.md 라우트 업데이트

```
공개 라우트 추가:
  /portfolio/:profileName/slideshow   — PortfolioSlideshowPage (슬라이드쇼 뷰어)

STANDALONE_PATHS 추가:
  '/portfolio/'로 시작하는 경로 전체 (또는 명시적으로 나열)
```
