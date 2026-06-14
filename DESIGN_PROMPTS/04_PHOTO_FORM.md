# 04 — PhotoForm 개선 (레이아웃 · Before/After · 드래프트)

> P2: 전체 항목

---

## 저장 경로

```
frontend/src/
  pages/PhotoFormPage.jsx              (수정)
  components/photo/BeforeAfterSlider.jsx (신규)
  hooks/useDraft.js                    (신규)
  components/common/DraftBanner.jsx    (신규)
```

---

## [1] PhotoForm 2컬럼 레이아웃

### 목표 레이아웃

```
PC (≥1024px)
┌──────────────────────┬──────────────────────┐
│  Canvas 프리뷰       │  보정 패널 (340px)    │
│  (flex 1)            │  ─── 기본 조정 ───    │
│  [원본] [보정] 토글  │  노출  ──●──         │
│                      │  대비  ────●──        │
│                      │  ─── 톤 커브 ───      │
│                      │  ─── 효과 ───         │
│                      │  [초기화] [프리셋▾]   │
├──────────────────────┴──────────────────────┤
│  제목 입력  |  분위기 선택  |  너비  [등록하기]│
└─────────────────────────────────────────────┘

모바일: Canvas(45vh) → 슬라이더(기본만) → 메타데이터 세로 스택
```

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryDark '#4458e0' primaryLight '#eef0ff'
      bg '#f5f5fa' surface '#fff' surfaceDim '#ededf4' border '#e2e2ee'
      text '#1a1a2e' textSecondary '#5c5c7a' textMuted '#9090b0' danger '#e53e3e'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

PhotoFormPage 새 레이아웃 껍데기를 만들어주세요.
(Canvas 로직 연결 없이 레이아웃·UI 구조만. 실제 보정 슬라이더는 placeholder로)

1. 상단 탭 (파일 업로드 / URL 입력)
   active 탭: primary 하단 라인 + 텍스트 강조
   파일 탭: 점선 드래그&드롭 존 (📁 아이콘 + 텍스트)
   URL 탭: URL input 필드

2. 메인 영역 (PC: flex row, 모바일: flex column)

   좌측 프리뷰 (flex 1, 최소 높이 400px, bg '#1a1a2e'):
     미선택: 중앙 안내 텍스트
     선택됨: 이미지 object-fit contain
     좌하단: 파일명+크기 (반투명 white)
     [원본][보정] 토글 (이미지 선택 후, 우상단 absolute)

   우측 보정 패널 (PC: width 340px, border-left, overflow-y auto):
     아코디언 섹션 4개 (클릭 토글, 기본조정만 열림):
       [기본 조정] — 슬라이더 6개 placeholder (레이블+현재값+range input, accent-color primary)
       [톤 커브]   — 256×160px 회색 placeholder + RGB/R/G/B 소형 탭
       [효과]      — 슬라이더 3개 placeholder
       [비네팅&그레인] — 슬라이더 2개 placeholder
     패널 하단 sticky: [초기화] ghost + [프리셋▾] secondary 버튼

   모바일: [기본] [커브] [효과] 가로 탭 전환

3. 하단 메타데이터 바 (border-top, padding 16px 24px)
   flex row gap 12px:
   제목 input (flex 1, placeholder '제목을 입력하세요')
   분위기 버튼 ("🌈 분위기 선택" → 클릭 시 11개 칩 모달)
   선택된 분위기 배지 표시 (있을 때)
   너비 버튼 ("↔ 너비 6" → 클릭 시 GridSpanPicker 팝업)
   [취소] secondary + [등록하기] primary loading 지원

4. 분위기 선택 모달
   MOOD 11개 3열 그리드, colored dot + 이름 칩
   선택 시 border primary + ✓ 체크
   [확인] 버튼으로 닫기

반응형: 768px 미만 메타데이터 세로 나열
```

### 통합 방법

1. 아티팩트로 받은 레이아웃 구조를 `PhotoFormPage.jsx`에 적용
2. 기존 `useImageAdjustments`, `handleFileChange`, Canvas ref 코드는 유지
3. 각 슬라이더 placeholder에 기존 adjustment 상태값 연결
4. 기존 `CurveEditor` 컴포넌트를 커브 placeholder 위치에 임베드

---

## [2] Before/After 비교 슬라이더

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' surface '#fff'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

두 가지를 만들어주세요.

1. BeforeAfterToggle (components/photo/BeforeAfterToggle.jsx)
   Props: mode('before'|'after'), onChange
   [원본][보정] 붙어있는 pill 토글 버튼
   활성: primary bg white text / 비활성: surface bg textSecondary text
   height 32px, 전체 연결(left radius만 left, right radius만 right)

2. BeforeAfterSlider (components/photo/BeforeAfterSlider.jsx)
   Props: beforeSrc(string), afterSrc(string), width(600), height(400)

   구현:
   position relative 컨테이너 (overflow hidden)
   beforeSrc img: 전체 크기 object-fit cover
   afterSrc img: position absolute inset 0 clip-path 'inset(0 {100-split}% 0 0)'
                 (split: 0~100 숫자, 기본값 50)
   분할선: position absolute, top 0, left '{split}%', width 2px, height 100%, bg white
           box-shadow '0 0 8px rgba(0,0,0,0.5)'
   핸들: 분할선 중앙 36px 원 bg white border '2px solid #5b6ef5'
         내부 ◀▶ 텍스트, cursor ew-resize
   드래그: mousedown→isDragging, mousemove→split 업데이트(컨테이너 기준%), mouseup→끝
   터치 지원: touchstart/touchmove/touchend
   레이블: 좌상단 "원본" (white, 반투명 bg, 작은 배지)
           우상단 "보정" (primary색 배지)

   데모:
   BeforeAfterToggle + BeforeAfterSlider 함께 표시
   before: grayscale CSS filter 적용한 이미지 / after: 원본 컬러
   모바일: 슬라이더 표시, 핸들 터치 동작 확인
```

### 통합 방법

```jsx
// PhotoFormPage.jsx 프리뷰 영역
const [compareMode, setCompareMode] = useState('after')
const [showSplit, setShowSplit] = useState(false)

// 프리뷰 상단 컨트롤
<BeforeAfterToggle mode={compareMode} onChange={setCompareMode} />
{!isMobile && <button onClick={() => setShowSplit(v => !v)}>분할 비교</button>}

// 캔버스 자리
{showSplit
  ? <BeforeAfterSlider beforeSrc={originalDataURL} afterSrc={adjustedDataURL} />
  : <canvas ref={compareMode === 'after' ? adjustedRef : originalRef} />
}
```

---

## [3] 드래프트 자동저장

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryLight '#eef0ff' bg '#f5f5fa' surface '#fff'
      border '#e2e2ee' text '#1a1a2e' textMuted '#9090b0' success '#22c55e'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

세 가지를 만들어주세요.

1. useDraft 훅 (hooks/useDraft.js)
   Parameters: key(string), initialValue(T), debounceMs(기본 2000)
   반환: value, setValue, savedAt(Date|null), isDirty, clearDraft, hasDraft

   동작:
   마운트: localStorage에서 복원 → hasDraft=true
   setValue 호출 → debounce timer → localStorage.setItem + savedAt 업데이트
   clearDraft: localStorage.removeItem + 초기값 리셋

2. DraftBanner (components/common/DraftBanner.jsx)
   Props: savedAt(Date|null), onRestore, onDiscard
   savedAt이 null이면 null 반환
   sticky top 0, bg primaryLight, border-bottom '1px solid rgba(91,110,245,0.3)'
   좌: "📝 저장된 드래프트가 있습니다 ({n}분 전)"  13px
   우: [이어서 작성] primary 버튼 sm  [새로 시작] ghost 버튼 sm

3. AutoSaveIndicator (components/common/AutoSaveIndicator.jsx)
   Props: isDirty, savedAt, isSaving
   position fixed 우하단 (bottom 20px right 20px), 12px
   isSaving: "저장 중..." textMuted
   isDirty: "변경사항 있음" textMuted
   !isDirty && savedAt: "✓ 자동저장됨 {시:분}" success 색상
   savedAt null: display none

   데모:
   제목/설명 입력 → 2초 후 자동저장 표시
   [새로고침 시뮬레이션] 버튼 → DraftBanner 표시 → 이어서 작성/새로 시작 동작
```

### 통합 방법

```jsx
// PhotoFormPage.jsx
import { useDraft } from '../hooks/useDraft'
const { value: draft, setValue: setDraft, savedAt, isDirty, clearDraft, hasDraft }
  = useDraft('photo_form_draft', { title:'', description:'', colorMood:'', gridColSpan:6 })

// 각 필드 onChange에서 setDraft 동시 호출
// 등록 완료 후 clearDraft() 호출
// {hasDraft && <DraftBanner savedAt={savedAt} onRestore={restore} onDiscard={clearDraft} />}
// <AutoSaveIndicator isDirty={isDirty} savedAt={savedAt} isSaving={uploading} />
```

---

---

## [4] 워터마크 UI (누락 항목 추가)

### 현재 문제

워터마크 기능이 백엔드 Photo 엔티티에 `watermarkEnabled`, `watermarkText` 필드로 존재하지만 PhotoFormPage에 UI가 없음.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryLight '#eef0ff' bg '#f7f7fb' surface '#fff'
      border '#e5e5ed' text '#0f0f1a' textSecondary '#5555aa' textMuted '#8888bb'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

WatermarkPanel 컴포넌트를 만들어주세요.

Props:
- enabled: boolean
- text: string
- position: 'top-left'|'top-right'|'bottom-left'|'bottom-right'|'center'
- onChange: ({ enabled, text, position }) => void

레이아웃:
  섹션 헤더: "🔏 워터마크" 13px 600 + 우측 토글 스위치 (enabled ON/OFF)
  enabled=false: 나머지 컨트롤 opacity:0.4, pointer-events:none

  텍스트 입력:
    label "워터마크 텍스트" 12px textMuted
    input 100% border radius 8px padding '8px 12px' placeholder '@내아이디'

  위치 선택 (5개 버튼, 3×2 그리드 — center는 하단 전체 폭):
    top-left "↖" / top-right "↗" / bottom-left "↙" / bottom-right "↘" / center "가운데"
    선택됨: bg primaryLight border primary color primary
    비선택: bg surface border '#e5e5ed'

  미리보기 힌트: "이미지 우하단에 반투명 텍스트로 표시됩니다" 11px textMuted italic

토글 스위치 디자인:
  width 40px height 22px border-radius 11px
  ON: bg primary / OFF: bg '#ccccdd'
  thumb: 18px 원형 bg white, transition left 0.2s
  ON: left 20px / OFF: left 2px

데모: 5가지 위치 버튼, 텍스트 입력, ON/OFF 토글
```

### 통합 방법

```jsx
// PhotoFormPage.jsx 메타데이터 바 또는 보정 패널 하단에 추가
const [watermark, setWatermark] = useState({
  enabled: false, text: '', position: 'bottom-right'
})
// 등록 API 호출 시 watermarkEnabled, watermarkText 필드 포함
```

---

## [5] 이미지 비율 선택 UI (누락 항목 추가)

### 현재 문제

백엔드 Photo 엔티티에 `imageRatio` 필드(`16:9`/`4:3`/`1:1`/`3:4`/`2:3`)가 있으며
ExplorePage에서 필터로 사용되지만 PhotoFormPage에 선택 UI가 없음.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryLight '#eef0ff' surface '#fff' border '#e5e5ed'
      text '#0f0f1a' textSecondary '#5555aa' textMuted '#8888bb'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

ImageRatioPicker 컴포넌트를 만들어주세요.

Props:
- value: '16:9'|'4:3'|'1:1'|'3:4'|'2:3'|null
- onChange: (ratio) => void

비율 옵션 5개:
  { ratio: '16:9',  label: '가로 와이드', w: 48, h: 27 }
  { ratio: '4:3',   label: '가로 표준',   w: 40, h: 30 }
  { ratio: '1:1',   label: '정방형',      w: 36, h: 36 }
  { ratio: '3:4',   label: '세로 표준',   w: 30, h: 40 }
  { ratio: '2:3',   label: '세로 좁음',   w: 27, h: 40 }

각 카드:
  width 72px, flex column align-items center, cursor pointer
  비율 시각화 박스: w×h px (위 값 사용), border radius 4px
    선택됨: bg primaryLight border '2px solid primary'
    비선택: bg surfaceDim border '1px solid border'
  ratio 텍스트: 11px 600 margin-top 6px
  label 텍스트: 10px textMuted

flex row gap 8px, "비율 선택 (선택사항)" 12px textMuted 상단 레이블

데모: 5개 카드, 클릭 시 선택 상태 전환, 재클릭 시 해제
```

### 통합 방법

```jsx
// PhotoFormPage.jsx 하단 메타데이터 바에 추가
const [imageRatio, setImageRatio] = useState(null)
// 등록 API 호출 시 imageRatio 필드 포함
```

---

## [6] AI 자동태그 버튼 (누락 항목 추가)

### 현재 문제

백엔드에 `POST /api/photos/:id/auto-tags` 엔드포인트가 있고 (`AutoTagService`),
`photoApi.autoTag(photoId)` API 메서드도 있지만 PhotoFormPage에 UI가 없음.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryLight '#eef0ff' accent '#a78bfa'
      surface '#fff' border '#e5e5ed' text '#0f0f1a' textMuted '#8888bb'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

AutoTagPanel 컴포넌트를 만들어주세요.

Props:
- photoId: number | null  (null이면 버튼 disabled)
- existingTags: string[]
- onTagsChange: (tags: string[]) => void

레이아웃:
  섹션 헤더: "🏷️ 태그"
  태그 입력:
    input + [+ 추가] 버튼 (Enter로도 추가)
    input: flex 1, placeholder '#태그입력'
  태그 칩 목록:
    각 칩: '#태그명' + × 삭제 버튼 (accent bg, 12px, border-radius full, padding '4px 10px')
    최대 10개, 10개 초과 시 추가 버튼 비활성
  AI 버튼:
    "✨ AI 태그 자동추출" — accent(#a78bfa) bg, white text, height 32px, radius 8px, 12px 600
    photoId null이면 opacity:0.4 cursor:not-allowed + tooltip "먼저 사진을 등록하세요"
    클릭 시: 버튼 내 스피너 + "추출 중..." 텍스트, 비활성
    성공: 추출된 태그가 기존 태그에 병합 (중복 제거), 성공 메시지 2초 표시
    실패: 에러 메시지 표시

  목 데이터로 동작 시뮬레이션:
    AI 추출 시 1.5초 후 ['자연광', '인물', '도시', '감성'] 반환
    기존 태그 ['풍경', '자연광']이면 병합 → ['풍경', '자연광', '인물', '도시', '감성']

데모: 태그 추가/삭제, AI 버튼 로딩, 성공 상태 순서로 시연
```

### 통합 방법

```jsx
// PhotoFormPage.jsx — 등록 후 photoId 받아서 autoTag 호출 가능
// 또는 사진 수정(edit) 모드에서 즉시 AI 태그 추출
const handleAutoTag = async () => {
  const { tags } = await photoApi.autoTag(photoId)
  const merged = [...new Set([...existingTags, ...tags])]
  setTags(merged)
}
```

---

## 완료 체크리스트

- [ ] PhotoFormPage PC 2컬럼 레이아웃 구현
- [ ] 모바일 세로 스택 레이아웃 확인
- [ ] 보정 패널 아코디언 4섹션
- [ ] 분위기 선택 모달 (11개 칩)
- [ ] BeforeAfterToggle.jsx 생성
- [ ] BeforeAfterSlider.jsx 생성 (마우스+터치 드래그)
- [ ] 프리뷰 영역에 토글/슬라이더 연결
- [ ] useDraft.js 생성
- [ ] DraftBanner.jsx 생성
- [ ] AutoSaveIndicator.jsx 생성
- [ ] PhotoFormPage 드래프트 연결 (제목/설명/분위기/너비)
- [ ] 등록 완료 시 clearDraft 호출 확인
- [ ] WatermarkPanel.jsx 생성
- [ ] ImageRatioPicker.jsx 생성 (5가지 비율 시각화)
- [ ] AutoTagPanel.jsx 생성 (AI 태그 추출 + 칩 관리)
- [ ] PhotoFormPage에 WatermarkPanel, ImageRatioPicker, AutoTagPanel 추가
- [ ] 등록 API 호출 시 watermarkEnabled/watermarkText/imageRatio/tags 포함 확인
