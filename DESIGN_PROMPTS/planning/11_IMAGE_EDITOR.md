# 11. Image Editor SPA — 프로덕션 이미지 편집기

작성일: 2026-06-19  
참고 UX: Format.com 스타일 — 미니멀 다크 편집 UI

---

## 기술 스펙 (프로젝트 표준 준수)

| 항목 | 사용 기술 |
|------|----------|
| 언어 | JavaScript (ES2022) — TypeScript 사용 안 함 |
| UI | React 18, 함수형 컴포넌트 |
| 스타일 | inline style 객체 — CSS 클래스·CSS-in-JS 없음 |
| 아이콘 | 이모지 / 유니코드 기호 — 외부 아이콘 라이브러리 없음 |
| 상태 관리 | useReducer + useContext — Zustand 없음 |
| Canvas 엔진 | 네이티브 Canvas 2D API — Konva.js / Fabric.js 없음 |
| 라이브러리 | react, react-router-dom만 허용 |
| UI 언어 | 한국어 |

### 재사용하는 기존 훅 (신규 작성 불필요)

```
hooks/useImageAdjustments.js  ← 색상 보정 파이프라인 전체 (LUT, 커브, HSL, 색 보정, 선명도, 노이즈)
hooks/usePresets.js           ← 프리셋 저장/불러오기 (localStorage, 최대 20개)
hooks/useColorExtraction.js   ← K-means 5색 팔레트 추출
constants/colors.js → COLORS  ← 디자인 토큰
```

---

## 컬러 시스템 (에디터 다크 테마)

```js
// 에디터 UI는 darkBg 계열 사용 (constants/colors.js COLORS 참조)
bg:        COLORS.darkBg       // #080810  — 전체 배경
surface:   COLORS.darkSurface  // #0c0c18  — 패널 배경
elevated:  COLORS.darkElevated // #1a1a3a  — 카드·드롭다운
border:    COLORS.darkBorder   // rgba(255,255,255,0.06)  — 구분선
text:      COLORS.darkText     // #eeeeff  — 기본 텍스트
textSub:   COLORS.darkTextSub  // #8888cc  — 보조 텍스트
textHint:  COLORS.darkTextHint // #5555aa  — 힌트
primary:   COLORS.primary      // #5b6ef5  — 강조·활성
danger:    COLORS.danger       // #e53e3e  — 위험
```

---

## 앱 구조

```
/editor                 — 이미지 에디터 SPA (로그인 필요, ProtectedRoute)

src/pages/
  ImageEditorPage.jsx   — 루트 페이지 (EditorContext 제공)

src/components/editor/
  EditorShell.jsx       — 3-panel 레이아웃 셸
  LeftPanel.jsx         — 이미지 썸네일 스트립
  CenterCanvas.jsx      — 편집 캔버스 + 툴바
  RightPanel.jsx        — 탭 패널 (Transform/Adjust/Filter/Overlay)
  panels/
    TransformPanel.jsx  — 크롭·회전·뒤집기
    AdjustPanel.jsx     — 색상 보정 슬라이더 (useImageAdjustments 래핑)
    FilterPanel.jsx     — 프리셋 필터 7종
    OverlayPanel.jsx    — 텍스트·워터마크
  CropOverlay.jsx       — 캔버스 위 크롭 핸들 SVG
  ExportModal.jsx       — 내보내기 모달
  UploadDropZone.jsx    — 드래그앤드롭 업로드 오버레이

src/contexts/
  EditorContext.jsx     — useReducer 기반 전역 에디터 상태

src/reducers/
  editorReducer.js      — 모든 편집 액션 + Undo/Redo history
```

---

## EditState 스키마 (비파괴 편집 JSON)

```js
const DEFAULT_EDIT_STATE = {
  crop:     { x: 0, y: 0, w: 1, h: 1, ratio: null }, // 0~1 비율 (원본 기준)
  rotate:   0,      // -180 ~ 180
  flip:     { h: false, v: false },
  adjustments: {    // useImageAdjustments.js DEFAULT_ADJUSTMENTS 참조
    exposure: 0, contrast: 0, highlights: 0, shadows: 0,
    whites: 0, blacks: 0, temperature: 0, tint: 0,
  },
  effects: {        // useImageAdjustments.js DEFAULT_EFFECTS 참조
    vibrance: 0, saturation: 0, clarity: 0, texture: 0,
    dehaze: 0, vignette: 0, grain: 0,
  },
  filter:   { name: 'none', intensity: 100 }, // none|bw|vintage|cinematic|soft|vibrant|warm|cool
  overlays: [],     // [{ id, type:'text'|'watermark', x, y, ...props }]
  curvePoints: [{ x:0, y:0 }, { x:1, y:1 }],
};
```

---

## 프롬프트 1 — EditorContext (전역 상태 + Undo/Redo)

```
[시스템 컨텍스트]
앱 이름: Happiness — 이미지 에디터
기술 스택: React 18 SPA, inline style, react만 import 허용 (외부 라이브러리 없음)
컬러: COLORS (constants/colors.js) 사용
아이콘: 이모지/유니코드 기호

---

EditorContext.jsx와 editorReducer.js를 만들어줘.
useReducer 기반으로 전역 에디터 상태를 관리한다. Zustand 사용 금지.

### 상태 구조

const initialState = {
  images: [],           // [{ id, name, file, objectUrl, editState }]
  selectedId: null,     // 현재 편집 중인 이미지 id
  past: [],             // undo 스택 (최대 50개)
  future: [],           // redo 스택
  zoom: 1,              // 0.1 ~ 5
  panOffset: { x:0, y:0 },
  activeTool: 'select', // 'select' | 'crop' | 'text'
  activeTab: 'adjust',  // 'transform' | 'adjust' | 'filter' | 'overlay'
};

### 액션 타입 (editorReducer.js)

IMAGES_ADD           — File[] → ImageItem[] 추가 (objectUrl = URL.createObjectURL)
IMAGES_REMOVE        — id로 제거 + URL.revokeObjectURL
IMAGE_SELECT         — selectedId 변경
EDIT_UPDATE          — { id, patch } — EditState 일부 변경 (자동으로 undo push)
EDIT_RESET           — 선택 이미지 EditState를 DEFAULT_EDIT_STATE로 리셋
UNDO                 — past.pop() → currentEditState 복원, future.push()
REDO                 — future.pop() → 적용, past.push()
ZOOM_SET             — zoom 값 설정
PAN_SET              — panOffset 설정
TOOL_SET             — activeTool 변경
TAB_SET              — activeTab 변경

### Undo 동작
EDIT_UPDATE 처리 시:
1. 현재 EditState를 past에 push (50개 초과 시 가장 오래된 제거)
2. future 클리어
3. patch 적용

### Context 제공값
const EditorContext = createContext(null);
export function EditorProvider({ children }) { ... }
export function useEditor() { return useContext(EditorContext); }

제공: { state, dispatch, currentImage, currentEditState, canUndo, canRedo }
currentImage    = state.images.find(img => img.id === state.selectedId)
currentEditState = currentImage?.editState ?? DEFAULT_EDIT_STATE
canUndo         = state.past.length > 0
canRedo         = state.future.length > 0
```

---

## 프롬프트 2 — EditorShell (3-panel 레이아웃)

```
[시스템 컨텍스트]
앱 이름: Happiness — 이미지 에디터
기술 스택: React 18 SPA, inline style, react + react-router-dom만 허용
컬러: COLORS import from '../../constants/colors'
아이콘: 이모지/유니코드, 한국어 UI

---

EditorShell.jsx를 만들어줘. 3-panel 레이아웃 셸 컴포넌트다.

레이아웃: display flex, minHeight 100vh, 전체 COLORS.darkBg 배경

Left Panel (220px 고정, COLORS.darkSurface, border-right COLORS.darkBorder):
  - 상단: "← 뒤로" 링크 (navigate('/')) + "🖼️ 편집기" 타이틀
  - 업로드 버튼: "+ 이미지 추가" (COLORS.primary 배경)
    클릭 시 hidden file input[accept="image/jpeg,image/png,image/webp",multiple] 트리거
  - 이미지 썸네일 리스트 (LeftPanel 컴포넌트)
  - 하단: 선택된 이미지 수 표시

Center Canvas (flex:1, COLORS.darkBg):
  - 상단 툴바 (CenterToolbar):
    좌: ↩ Undo | ↪ Redo | | ✂ 크롭 | ↺ 회전 | ↔ 뒤집기
    우: 🔍- 축소 | zoom% | 🔍+ 확대 | ⊡ 화면 맞춤
    비활성 버튼: opacity 0.4, disabled
  - 캔버스 영역 (CenterCanvas 컴포넌트)
  - 하단 상태바: 이미지명 | 원본 크기 | 현재 zoom%

Right Panel (280px 고정, COLORS.darkSurface, border-left COLORS.darkBorder):
  - 탭 4개: Transform | 보정 | 필터 | 오버레이
    활성: COLORS.primary 하단 2px 테두리 + 흰색 텍스트
    비활성: COLORS.darkTextSub 텍스트
  - 탭 콘텐츠 영역 (overflow-y auto)
  - 하단: "💾 내보내기" 버튼 (primary, full-width)

모바일(768px 미만):
  - Left Panel 숨김
  - Right Panel 하단 시트로 (position fixed, bottom 0, 최대높이 50vh, 스크롤)
  - 상단 툴바에 "☰ 이미지" 버튼으로 Left Panel 드로어 토글
```

---

## 프롬프트 3 — LeftPanel (이미지 썸네일 스트립)

```
[시스템 컨텍스트]
앱 이름: Happiness — 이미지 에디터
기술 스택: React 18, inline style, react + react-router-dom만 허용
컬러: COLORS from constants/colors.js
아이콘: 이모지/유니코드, 한국어 UI

---

LeftPanel.jsx를 만들어줘. 왼쪽 이미지 목록 패널이다.
useEditor() 훅으로 state/dispatch 가져온다.

썸네일 그리드:
- 2컬럼 grid (gap 6px, padding 8px)
- 각 썸네일 카드:
  • 1:1 비율, object-fit cover, border-radius 8px
  • 선택된 이미지: COLORS.primary 2px solid border + 좌상단 체크마크 ✓
  • 미선택: border 투명, hover 시 COLORS.darkBorder border
  • 우상단 삭제 버튼 (×) — hover 시만 표시, 클릭 시 IMAGES_REMOVE
  • 하단: 파일명 (한 줄, overflow ellipsis, 11px, COLORS.darkTextSub)
- 클릭 시 IMAGE_SELECT dispatch

빈 상태 (이미지 없음):
  중앙 정렬, 📁 아이콘, "이미지를 추가하세요" (COLORS.darkTextHint)

드래그 정렬:
  HTML5 Drag & Drop API로 순서 변경 (onDragStart, onDragOver, onDrop)
  드래그 중 카드: opacity 0.4

붙여넣기 업로드 (LeftPanel 마운트 시 등록):
  document.addEventListener('paste', handler)
  ClipboardEvent.clipboardData.files → IMAGES_ADD dispatch
  해제: return () => document.removeEventListener('paste', handler)

이미지 수 제한:
  100장 초과 시 추가 안 함 + "최대 100장까지 업로드 가능합니다" alert
```

---

## 프롬프트 4 — CenterCanvas (캔버스 뷰어 + 크롭 오버레이)

```
[시스템 컨텍스트]
앱 이름: Happiness — 이미지 에디터
기술 스택: React 18, inline style, react만 허용 (외부 Canvas 라이브러리 없음)
컬러: COLORS from constants/colors.js
아이콘: 이모지/유니코드

---

CenterCanvas.jsx를 만들어줘. 편집 캔버스 영역 컴포넌트다.

### Canvas 렌더링 (useRef + useEffect)

컴포넌트 마운트 및 editState 변경 시 drawCanvas() 실행:

function drawCanvas(canvas, image, editState) {
  const ctx = canvas.getContext('2d');
  // 1. 캔버스 크기 설정 (zoom 적용)
  // 2. 배경 체커보드 패턴 (투명 표시)
  // 3. ctx.save() → translate(center) → rotate(deg) → scale(flipH, flipV) → translate(-center)
  // 4. 크롭 영역만 drawImage (editState.crop 기준)
  // 5. ctx.restore()
  // 6. 오버레이 렌더 (텍스트/워터마크)
}

### 실시간 색상 보정 미리보기 전략
- 슬라이더 드래그 중: <canvas>에 CSS filter 즉시 적용 (layout reflow 없음)
  canvas.style.filter = `brightness(${}) contrast(${}) saturate(${})...`
- 슬라이더 놓으면 (onMouseUp/onPointerUp):
  useImageAdjustments.js의 applyEffects() 호출 → 실제 픽셀 처리 → canvas 재렌더

### Zoom / Pan
- 마우스 휠: zoom +/-10%, clamp(0.1, 5)
  e.preventDefault() 필수 (passive: false 옵션)
- Space + 드래그: pan (panOffset 변경) → cursor: 'grab'→'grabbing'
- 더블클릭: fitToScreen() — 캔버스 컨테이너 크기에 맞게 zoom 자동 계산

### 크롭 오버레이 (activeTool === 'crop' 시)
- <svg> 절대 포지션으로 canvas 위에 오버레이
- 크롭 외부 영역: rgba(0,0,0,0.5) 반투명 마스크
- 크롭 테두리: COLORS.primary 2px solid
- 8방향 드래그 핸들: 흰색 8px 원형, 드래그로 crop 영역 조정
- 황금비율 그리드 라인 (3×3, 흰색 0.3 opacity)
- 크롭 핸들 드래그: mousemove/touchmove 이벤트, 캔버스 범위 밖 clamp

### 오버레이 렌더 (텍스트/워터마크)
editState.overlays 순서대로 zIndex 적용:
- type 'text': ctx.fillText() — fontFamily, fontSize, color, shadow
- type 'watermark': ctx.drawImage() — opacity는 globalAlpha로
선택된 오버레이: 8방향 점선 테두리 표시 + 드래그 이동

### 상태바 (canvas 하단)
이미지명 | 원본 W×H | 현재 zoom% | [화면 맞춤 버튼]
```

---

## 프롬프트 5 — TransformPanel (크롭·회전·뒤집기)

```
[시스템 컨텍스트]
앱 이름: Happiness — 이미지 에디터
기술 스택: React 18, inline style, react만 허용
컬러: COLORS from constants/colors.js, 아이콘: 이모지/유니코드, 한국어 UI

---

TransformPanel.jsx를 만들어줘. 오른쪽 패널의 Transform 탭 콘텐츠다.

### 크롭 섹션

비율 버튼 (가로 wrap):
  [자유] [1:1] [4:5] [16:9] [3:2]
  선택: COLORS.primary 배경, 흰 텍스트
  미선택: COLORS.elevated 배경, COLORS.darkText

비율 선택 시:
  dispatch({ type: 'TOOL_SET', tool: 'crop' })
  dispatch({ type: 'EDIT_UPDATE', patch: { crop: { ...crop, ratio: selected } } })
  캔버스 크롭 오버레이 표시

적용/취소 버튼:
  "✓ 적용" — COLORS.primary, 크롭 확정
  "✗ 취소" — COLORS.danger, TOOL_SET('select')

### 회전 섹션

슬라이더: -180 ~ 180, 기본 0
  track 배경: linear-gradient(to right, COLORS.darkBorder, COLORS.primary, COLORS.darkBorder)
  value 라벨: 우측 (e.g. "15°", primary 색상)
  더블클릭 슬라이더: 0 리셋

90도 버튼 2개:
  "↺ -90°" "↻ +90°" — COLORS.elevated 배경, border, hover primary 배경

숫자 직접 입력:
  input[type=number] (-180~180) — COLORS.elevated 배경, 흰색 텍스트

### 뒤집기 섹션

"↔ 수평" / "↕ 수직" 토글 버튼
  활성: COLORS.primary 배경
  비활성: COLORS.elevated 배경

모든 변경은 dispatch({ type: 'EDIT_UPDATE', patch: { ... } }) 통해 처리.
Undo 스택 자동 쌓임 (EditorContext 처리).
```

---

## 프롬프트 6 — AdjustPanel (색상 보정 슬라이더)

```
[시스템 컨텍스트]
앱 이름: Happiness — 이미지 에디터
기술 스택: React 18, inline style, react만 허용
컬러: COLORS from constants/colors.js, 아이콘: 이모지/유니코드, 한국어 UI

---

AdjustPanel.jsx를 만들어줘. 오른쪽 패널의 보정 탭이다.
기존 useImageAdjustments.js 훅을 활용한다.

### 기본 보정 섹션 (세부 아코디언)

brightness/contrast/saturation/exposure/highlights/shadows/temperature/tint 슬라이더 8개

AdjustmentSlider 공통 컴포넌트:
  props: label(한국어), value, min, max, onChange
  - 레이블 + 현재값 (우측, primary, bold)
  - range input: track 그라디언트 각 속성별 의미 있는 색
    exposure:    #000 → #fff
    temperature: #88aaff → #ffaa44
    tint:        #44cc88 → #cc44bb
    나머지:      COLORS.darkBorder → COLORS.primary
  - 중앙 기준선 | 표시
  - 값이 0 아니면 레이블 앞 ● 표시 (COLORS.primary)
  - 더블클릭: 0 리셋
  - onChange debounce 100ms (setTimeout/clearTimeout)

onMouseUp/onPointerUp 시 실제 파이프라인 실행:
  → applyEffects() from useImageAdjustments.js 참조
  → canvas 재렌더

### 효과 섹션
vibrance, saturation, clarity, texture, dehaze, vignette, grain 슬라이더

### HSL 섹션 (아코디언, 닫힌 상태 기본)
8색상 탭: 빨강/주황/노랑/초록/하늘/파랑/보라/마젠타
각 탭 선택 시 hue/saturation/luminance 슬라이더 3개 표시

### 색 보정 섹션 (아코디언)
쉐도우/미드톤/하이라이트 — hue 색상환 + saturation 슬라이더

### 커브 섹션 (아코디언)
채널 탭: RGB | R | G | B
<canvas> 128×128 커브 편집기:
  - 대각선 기본 (0,0)→(1,1)
  - 클릭: 제어점 추가
  - 드래그: 제어점 이동
  - Catmull-Rom 보간 (catmullRomY from useImageAdjustments.js)

### 하단 버튼
"↺ 전체 초기화" — COLORS.darkElevated, border
"💾 프리셋 저장" — COLORS.primary (usePresets.js 연동)
```

---

## 프롬프트 7 — FilterPanel (프리셋 필터 7종)

```
[시스템 컨텍스트]
앱 이름: Happiness — 이미지 에디터
기술 스택: React 18, inline style, react만 허용
컬러: COLORS from constants/colors.js, 아이콘: 이모지/유니코드, 한국어 UI

---

FilterPanel.jsx를 만들어줘. 오른쪽 패널의 필터 탭이다.

### 필터 카드 그리드 (3컬럼)
필터 목록:
  none    — 없음
  bw      — 흑백
  vintage — 빈티지
  cinematic — 시네마틱
  soft    — 소프트
  vibrant — 선명
  warm    — 따뜻함
  cool    — 차가움

FilterCard 컴포넌트:
  - 64×64 <canvas>에 필터 미리보기 렌더 (썸네일 이미지 + 필터 적용)
  - 필터명 (한국어 병기: bw=흑백, cinematic=시네마틱)
  - 선택 시: COLORS.primary 2px border + "✓" 뱃지 (우상단)
  - hover: scale(1.04) (CSS transform, inline으로 JS 상태 관리)

Intensity 슬라이더 (필터 선택 시 표시):
  0 ~ 100, 기본 100
  "필터 강도" 레이블 + 현재 값 표시
  변경 시 canvas CSS filter 즉시 반영, onPointerUp 시 픽셀 파이프라인 실행

### 필터 엔진 함수 (FilterPanel 내부 또는 utils/filters.js)
모두 (imageData, intensity) => ImageData 시그니처:

applyBW(imageData, intensity):
  픽셀별 gray = 0.299R + 0.587G + 0.114B
  각 채널 = gray * (intensity/100) + original * (1 - intensity/100)

applyVintage(imageData, intensity):
  R = R * 0.9 + G * 0.1      // 약간 붉은 세피아
  채도 -30 (HSL 변환)
  비네팅 (중심 거리 기반 어두워짐) — intensity로 blend

applyCinematic(imageData, intensity):
  S커브 (shadows 파랑 +10, highlights 오렌지 +10)
  대비 +20, S커브 LUT

applySoft(imageData, intensity):
  간단한 3×3 평균 블러 + 밝기 +8 + 채도 -10

applyVibrant(imageData, intensity):
  채도 +40 + 대비 +10

applyWarm(imageData, intensity):
  R += 20 * (intensity/100), B -= 15 * (intensity/100)

applyCool(imageData, intensity):
  B += 20 * (intensity/100), R -= 15 * (intensity/100)

thumbnail 미리보기는 64×64 OffscreenCanvas에 그려 FilterCard에 반영.
```

---

## 프롬프트 8 — OverlayPanel (텍스트·워터마크)

```
[시스템 컨텍스트]
앱 이름: Happiness — 이미지 에디터
기술 스택: React 18, inline style, react만 허용
컬러: COLORS from constants/colors.js, 아이콘: 이모지/유니코드, 한국어 UI

---

OverlayPanel.jsx를 만들어줘. 오른쪽 패널의 오버레이 탭이다.

### 오버레이 추가 버튼
"✏️ 텍스트 추가" — COLORS.primary, 전폭
"🖼️ 워터마크 추가" — COLORS.elevated, border, 전폭
  클릭 시 hidden input[type=file, accept=image/*] 트리거

### 오버레이 목록
각 아이템:
  드래그 핸들 ⠿ + 아이콘(✏️/🖼️) + 이름("텍스트 1", "워터마크")
  우: 표시/숨김 토글 👁 + 삭제 × 버튼
  드래그로 zIndex 순서 변경 (HTML5 D&D)
  클릭 시 해당 오버레이 선택 → 옵션 패널 표시

### 텍스트 오버레이 옵션 (선택 시 표시)
  - textarea: 텍스트 내용
  - 폰트 크기 슬라이더: 12 ~ 200
  - 폰트 선택: sans / serif / mono (3개 버튼)
  - 색상: 8개 색상 스와치 (흰,검,빨,주,노,초,파,보) + hex input
  - 불투명도 슬라이더: 0 ~ 100
  - 그림자 토글 버튼
  - 캔버스 드래그로 위치 이동 가능 (CenterCanvas 연동)

### 워터마크 오버레이 옵션 (선택 시 표시)
  - 크기 슬라이더: 10% ~ 100% (이미지 너비 기준)
  - 불투명도 슬라이더: 0 ~ 100
  - 위치 9칸 그리드 선택 (3×3 grid 버튼) 또는 드래그 자유 이동

모든 변경: dispatch({ type: 'EDIT_UPDATE', patch: { overlays: [...] } })
```

---

## 프롬프트 9 — ExportModal (내보내기)

```
[시스템 컨텍스트]
앱 이름: Happiness — 이미지 에디터
기술 스택: React 18, inline style, react만 허용 (외부 라이브러리 없음)
컬러: COLORS from constants/colors.js, 아이콘: 이모지/유니코드, 한국어 UI

---

ExportModal.jsx를 만들어줘.
"💾 내보내기" 버튼 클릭 시 표시. 외부 ZIP 라이브러리 없이 구현.

### 모달 레이아웃
backdrop: rgba(0,0,0,0.75), 클릭 닫기
패널: width 440px, COLORS.darkSurface, border COLORS.darkBorder, radius 16px
상단: "내보내기" h3 + × 닫기

### 옵션

1. 파일 형식 (3탭 버튼): JPG | PNG | WEBP
   선택: COLORS.primary 배경

2. 품질 슬라이더 (JPG/WEBP만 활성): 1 ~ 100, 기본 92
   우측: 예상 파일 크기 실시간 계산 (canvas.toBlob → size → KB/MB 표시)

3. 출력 크기:
   [원본] [1080px] [2048px] [직접 입력]
   "직접 입력" 선택 시: width/height input + 비율 잠금 🔒 버튼

4. 파일명 input (기본: 원본 파일명에서 확장자 제거)

### 단일 내보내기
"⬇️ 다운로드" 버튼 — COLORS.primary, 전폭
1. 오프스크린 캔버스에 applyPipeline 최종 렌더
2. canvas.toBlob(blob => { a.href=URL.createObjectURL(blob); a.download=filename; a.click() })
3. 로딩 스피너 + "처리 중..." 텍스트

### 다중 내보내기 (이미지 2장 이상 선택 시)
"⬇️ 전체 다운로드 (순서대로)" 버튼
외부 JSZip 없이:
- 각 이미지를 순서대로 개별 다운로드 (300ms 간격 setTimeout)
- 진행률: "다운로드 중... 3 / 12"
- 완료 시 "✅ 다운로드 완료"

### Supabase 업로드 옵션 (선택)
"☁️ 갤러리에 바로 업로드" 체크박스
체크 + 다운로드 클릭 시:
  uploadApi.uploadImage(blob, 'photos') → photoApi.create(...)
  성공: "업로드 완료! 갤러리에서 확인하세요" + navigate('/') 버튼

### 내보내기 파이프라인
async function exportImage(image, editState, options):
  1. OffscreenCanvas (또는 일반 canvas) 생성
  2. editState.rotate / flip 적용
  3. editState.crop 적용 (drawImage sx/sy/sw/sh)
  4. useImageAdjustments의 applyEffects 함수 호출 (색상 보정)
  5. 필터 함수 호출 (intensity 반영)
  6. 오버레이 렌더 (ctx.fillText / drawImage)
  7. 리사이즈 (options.size !== 'original')
  8. canvas.toBlob({ type, quality })
```

---

## 프롬프트 10 — ImageEditorPage (라우트 통합 + DropZone)

```
[시스템 컨텍스트]
앱 이름: Happiness — 이미지 에디터
기술 스택: React 18, inline style, react + react-router-dom만 허용
컬러: COLORS from constants/colors.js, 아이콘: 이모지/유니코드, 한국어 UI

---

ImageEditorPage.jsx를 만들어줘. 에디터 루트 페이지 컴포넌트다.

### 구조
<EditorProvider>
  <EditorShell />
  <UploadDropZone />     ← 전체 페이지 드래그앤드롭 감지
  {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
</EditorProvider>

### UploadDropZone
- window 전체에 dragenter/dragleave/dragover/drop 이벤트 등록
- 드래그 진입 시: 전체 화면 오버레이 표시
  배경: rgba(91,110,245,0.15), border 3px dashed COLORS.primary
  중앙: "📁 이미지를 여기에 드롭하세요" (40px, 흰색)
  지원 형식: "JPG · PNG · WEBP, 최대 100장"
- drop 시: e.dataTransfer.files → IMAGES_ADD dispatch

### 파일 검증 (UploadDropZone 내부)
function validateFile(file):
  허용: image/jpeg, image/png, image/webp
  최대: 50MB
  실패 시 console.warn (사용자 alert 없음, 해당 파일만 skip)

### Keyboard 단축키 (useEffect + keydown)
Ctrl+Z    → dispatch({ type: 'UNDO' })
Ctrl+Y    → dispatch({ type: 'REDO' })
Ctrl+V    → 클립보드 이미지 붙여넣기 (LeftPanel과 공유)
Delete    → 선택된 오버레이 삭제
Escape    → activeTool 'select'로 리셋, 크롭 취소
Space+마우스드래그 → pan (CenterCanvas에서 처리)

### 라우트 등록 (App.jsx에 추가)
<Route path="/editor" element={
  <ProtectedRoute><ImageEditorPage /></ProtectedRoute>
} />

Header 네비게이션에 "✏️ 에디터" 링크 추가 (모바일 BottomNav는 생략).

### 초기 로드 (URL query 파라미터 지원)
/editor?photoId=123 → photoApi.getOne(123) → 이미지 자동 로드
```

---

## 구현 순서

| 단계 | 파일 | 예상 시간 |
|------|------|----------|
| 1 | EditorContext.jsx + editorReducer.js | 2h |
| 2 | EditorShell.jsx (3-panel 레이아웃) | 1.5h |
| 3 | LeftPanel.jsx + UploadDropZone | 2h |
| 4 | CenterCanvas.jsx (Canvas 렌더링 + Zoom/Pan) | 3h |
| 5 | TransformPanel.jsx (크롭 핸들 + 회전 + 뒤집기) | 3h |
| 6 | AdjustPanel.jsx (슬라이더, useImageAdjustments 연동) | 2h |
| 7 | FilterPanel.jsx (7종 필터 엔진 + 미리보기) | 2.5h |
| 8 | OverlayPanel.jsx (텍스트 + 워터마크) | 2.5h |
| 9 | ExportModal.jsx (단일/다중 내보내기) | 2h |
| 10 | ImageEditorPage.jsx + 라우트 등록 + 단축키 | 1.5h |

---

## 엣지 케이스 처리

| 케이스 | 처리 방법 |
|--------|----------|
| 50MB 초과 이미지 | validateFile()에서 skip + console.warn |
| EXIF 방향 오류 | try-catch로 무시, rotate=0 기본값 |
| 깨진 파일 | img.onerror → IMAGES_REMOVE 자동 처리 |
| 100장 초과 | 100장까지만 IMAGES_ADD, 나머지 무시 |
| 이미지 전환 시 상태 유지 | EDIT_UPDATE → images[].editState에 저장됨 |
| 취소 없이 뒤로가기 | beforeunload 이벤트로 "변경사항이 있습니다" 경고 |
| OffscreenCanvas 미지원 브라우저 | try-catch → 일반 canvas fallback |

---

## App.jsx / Header 연동 메모

```js
// App.jsx — 라우트 추가
import ImageEditorPage from './pages/ImageEditorPage';

<Route path="/editor" element={
  <ProtectedRoute><ImageEditorPage /></ProtectedRoute>
} />

// Header.jsx — 네비게이션 링크 추가 (PC 헤더)
<NavLink to="/editor">✏️ 에디터</NavLink>
```
