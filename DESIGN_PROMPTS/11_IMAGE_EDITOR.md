# 11. Image Editor SPA — 프로덕션 수준 이미지 편집기

작성일: 2026-06-19  
참고 UX: [Format.com](https://www.format.com/) — 미니멀 포트폴리오 편집 UI

---

## 목표

사용자가 웹에서 이미지를 업로드하고  
**편집 → 미리보기 → 내보내기**까지 가능한 프로덕션 수준 이미지 에디터 SPA

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| UI | React 18 + TypeScript |
| 상태 관리 | Zustand |
| Canvas 엔진 | Konva.js (또는 Fabric.js) |
| 렌더링 가속 | WebGL (선택) |
| 병렬 처리 | Web Worker |
| 번들러 | Vite |
| 스타일 | CSS Modules (또는 Tailwind) |
| 내보내기 | JSZip (batch export) |

---

## 아키텍처 레이어

```
UI Layer      — React 컴포넌트 (panels, sliders, toolbars)
State Layer   — Zustand store (editorStore, uploadStore, historyStore)
Engine Layer  — Pure functions (pipeline, filters, transforms)
Worker Layer  — Web Worker (heavy processing, batch export)

Image Processing Pipeline:
Original → Crop → Transform → Color Adjust → Filter → Overlay → Export
```

---

## 프로젝트 구조

```
src/
├── components/
│    ├── layout/          AppShell, LeftPanel, RightPanel, CanvasArea
│    ├── upload/          DropZone, ThumbnailGrid, PasteHandler
│    ├── editor/          CropTool, RotateControl, FlipControl
│    ├── adjustments/     SliderPanel, AdjustmentSlider
│    ├── filters/         FilterSelector, FilterCard
│    ├── overlays/        TextOverlay, WatermarkOverlay, OverlayList
│    ├── export/          ExportModal, QualitySlider, SizeSelector
│    └── common/          Button, Tooltip, IconButton, Spinner
├── features/
│    ├── editor/          useEditor, EditorContext
│    ├── upload/          useUpload, fileValidator
│    └── export/          useExport, zipBuilder
├── engine/
│    ├── pipeline/        pipeline.ts (메인 처리 파이프라인)
│    ├── filters/         bw.ts, vintage.ts, cinematic.ts, soft.ts,
│    │                    vibrant.ts, warm.ts, cool.ts
│    ├── transforms/      crop.ts, rotate.ts, flip.ts
│    └── colorGrade/      brightness.ts, contrast.ts, saturation.ts
├── store/
│    ├── editorStore.ts   현재 편집 상태 (EditState JSON)
│    ├── uploadStore.ts   업로드된 이미지 목록
│    └── historyStore.ts  Undo/Redo command stack
├── hooks/
│    ├── useDebounce.ts
│    ├── useKeyboard.ts   Ctrl+Z/Y/V 단축키
│    └── useVirtualList.ts  썸네일 그리드 가상화
├── workers/
│    └── imageProcessor.worker.ts
└── utils/
     ├── exif.ts          EXIF 파싱 + 오류 fallback
     ├── thumbnail.ts     썸네일 생성 (OffscreenCanvas)
     └── format.ts        파일 포맷 감지
```

---

## EditState JSON 스키마 (비파괴 편집)

```typescript
interface EditState {
  imageId: string;
  crop: {
    x: number; y: number;
    width: number; height: number;
    ratio: 'free' | '1:1' | '4:5' | '16:9' | '3:2' | null;
  };
  rotate: number;         // -180 ~ 180
  flip: { horizontal: boolean; vertical: boolean };
  adjustments: {
    brightness:  number;  // -100 ~ 100
    contrast:    number;
    saturation:  number;
    exposure:    number;
    highlights:  number;
    shadows:     number;
    temperature: number;
  };
  filter: {
    name: 'none'|'bw'|'vintage'|'cinematic'|'soft'|'vibrant'|'warm'|'cool';
    intensity: number;    // 0 ~ 100
  };
  overlays: Array<{
    id: string;
    type: 'text' | 'watermark';
    x: number; y: number;
    zIndex: number;
    // text
    content?: string;
    fontSize?: number;
    color?: string;
    opacity?: number;
    shadow?: boolean;
    // watermark
    src?: string;
    width?: number;
    opacity?: number;
  }>;
}
```

---

## 프롬프트 1 — 전체 앱 셸 (AppShell + 3-panel 레이아웃)

```
프로덕션 수준 이미지 에디터 SPA를 만들어줘.
기술 스택: React 18 + TypeScript, Zustand, CSS Modules (또는 inline style)
참고 UX: Format.com — 미니멀 다크 테마 포트폴리오 편집 UI

AppShell 컴포넌트:
- 전체 레이아웃: 3컬럼 (Left 260px | Canvas flex-1 | Right 300px)
- 배경: #111 (다크 테마 전체)
- 최소 높이: 100vh, overflow hidden (스크롤 없음)

Left Panel (#1a1a1a, border-right #2a2a2a):
- 상단: "🖼️ Image Editor" 로고 + 업로드 버튼
- 이미지 썸네일 그리드 (2컬럼)
- 선택된 이미지: primary(#5b6ef5) 2px border 하이라이트
- 검색 input (이름/번호 필터)
- 이미지 수 표시 (예: "12 / 100")

Canvas Area (#0d0d0d):
- 중앙 정렬된 편집 캔버스 (Konva Stage 또는 Canvas element)
- 상단 툴바: Undo | Redo | Fit | Zoom% | Reset
- 하단 상태바: 이미지명, 원본 크기, 현재 zoom%
- 배경: 체커보드 패턴 (투명 영역 표시)

Right Panel (#1a1a1a, border-left #2a2a2a):
- 탭 4개: Transform | Adjust | Filter | Overlay
- 탭 활성: 흰색 텍스트 + primary 하단 2px 보더
- 비활성: #666 텍스트
- 각 탭 아래 해당 컨트롤 패널 표시

컬러 시스템 (다크 테마):
  bg:        '#111111'
  surface:   '#1a1a1a'
  surface2:  '#222222'
  border:    '#2a2a2a'
  text:      '#e8e8e8'
  textMuted: '#888888'
  primary:   '#5b6ef5'
  danger:    '#e53e3e'
  success:   '#22c55e'
```

---

## 프롬프트 2 — 이미지 업로드 시스템

```
이미지 업로드 시스템을 만들어줘.
기술: React 18 + TypeScript, Zustand uploadStore

DropZone 컴포넌트:
- 전체 Left Panel 위 오버레이로 활성화 (dragenter 시)
- 점선 border #5b6ef5, 배경 rgba(91,110,245,0.1)
- "📁 이미지를 여기에 드롭하세요" 텍스트
- 지원 형식: jpg, png, webp
- 최대 100장 (초과 시 경고 toast)

다중 업로드 처리:
- Promise.all로 병렬 처리
- 각 파일: FileReader로 읽기 → OffscreenCanvas 썸네일(200×200) 생성 → Blob URL
- 진행률 표시: "처리 중... 12/50"

붙여넣기 업로드 (Ctrl+V):
- document.addEventListener('paste') 전역 등록
- ClipboardEvent.clipboardData.files 처리
- 단일 이미지 즉시 에디터에 로드

uploadStore (Zustand):
interface UploadStore {
  images: ImageItem[];          // { id, name, originalBlob, thumbnailUrl, size }
  selectedId: string | null;
  addImages(files: File[]): Promise<void>;
  selectImage(id: string): void;
  removeImage(id: string): void;
}

파일 검증 (fileValidator.ts):
- MIME 타입 체크 (image/jpeg, image/png, image/webp)
- 최대 크기: 50MB
- 깨진 파일 fallback: 오류 시 해당 파일만 건너뜀 + toast 경고

EXIF 처리 (exif.ts):
- DataView로 EXIF 방향 태그 읽기
- 방향 값(1~8)에 따라 초기 rotate 자동 설정
- 파싱 오류 시 무시하고 계속 진행

썸네일 그리드 가상화:
- useVirtualList 훅으로 화면 밖 썸네일 렌더 생략
- 100장도 60fps 유지
```

---

## 프롬프트 3 — Transform 패널 (Crop / Rotate / Flip)

```
Transform 패널 컴포넌트를 만들어줘.
기술: React 18 + TypeScript, Zustand editorStore, Konva.js

CropTool:
- 캔버스 위 드래그 가능한 크롭 핸들 (8방향 핸들)
- 크롭 영역 외부: 반투명 어두운 오버레이 (rgba(0,0,0,0.5))
- Ratio 버튼: [자유] [1:1] [4:5] [16:9] [3:2]
  - 선택된 비율: primary 배경
  - 비율 선택 시 크롭 박스 즉시 조정
- 핸들 색상: #ffffff, 크기 8px 원형
- 캔버스 바깥으로 드래그 불가 (clamp)

RotateControl:
- 슬라이더: -180 ~ 180도, 기본 0
- "↺ 90°" "↻ 90°" 버튼 (90도 스텝)
- 각도 수치 직접 입력 가능 (input[type=number])
- 실시간 캔버스 회전 (Konva rotation)

FlipControl:
- "↔ 수평 뒤집기" / "↕ 수직 뒤집기" 버튼
- toggle 방식 (활성 시 primary 강조)

ZoomPan:
- 마우스 휠: zoom in/out (10% ~ 500%)
- 스페이스 + 드래그: pan (손 커서)
- 더블클릭: fit-to-screen
- 우측 하단 zoom % 표시 + "Fit" 버튼

editorStore (Transform 부분):
setCrop(crop: CropState): void;
setRotate(deg: number): void;
toggleFlip(axis: 'horizontal'|'vertical'): void;
setZoom(zoom: number): void;
```

---

## 프롬프트 4 — 색상 보정 슬라이더 패널

```
색상 보정 패널(AdjustPanel)을 만들어줘.
기술: React 18 + TypeScript, Zustand editorStore

슬라이더 7개 (AdjustmentSlider 공통 컴포넌트):
  brightness   밝기       -100 ~ 100
  contrast     대비       -100 ~ 100
  saturation   채도       -100 ~ 100
  exposure     노출       -100 ~ 100
  highlights   하이라이트  -100 ~ 100
  shadows      쉐도우      -100 ~ 100
  temperature  색온도      -100 ~ 100

AdjustmentSlider 컴포넌트:
- 레이블 (한국어) + 현재 값 표시 (우측, primary 색상)
- range input: track 배경 그라디언트 (각 속성별 의미있는 색 그라디언트)
  예) brightness: #000 → #fff
      temperature: #6699ff → #ff9933
- 0 위치에 중앙 마커 표시 (|)
- 값이 0이 아닌 경우 슬라이더 레이블에 변경 인디케이터 (● 점)
- 더블클릭으로 0 리셋
- debounce 100ms 후 파이프라인 재실행

"모두 초기화" 버튼 (하단):
- 모든 adjustment를 0으로 리셋
- confirm 없이 즉시 (Undo 가능)

실시간 미리보기:
- Canvas에 CSS filter로 즉시 반영 (슬라이더 드래그 중)
  css: `brightness(${}) contrast(${}) saturate(${})...`
- 슬라이더 놓으면 실제 픽셀 파이프라인 실행 (Engine Layer)
```

---

## 프롬프트 5 — 필터 시스템

```
필터 선택 패널(FilterPanel)을 만들어줘.
기술: React 18 + TypeScript

필터 카드 그리드 (3컬럼):
  None / B&W / Vintage / Cinematic / Soft / Vibrant / Warm / Cool

FilterCard 컴포넌트:
- 썸네일 이미지에 필터 적용된 미리보기 (32×32 canvas)
- 필터명 (한국어 병기: B&W = 흑백)
- 선택 시: primary 2px border + 체크마크
- hover: scale(1.05) transition

Intensity 슬라이더 (필터 선택 시 표시):
- 0 ~ 100%
- "필터 강도" 레이블
- 실시간 캔버스 반영

필터 엔진 (engine/filters/):
각 필터 = (imageData: ImageData, intensity: number) => ImageData

bw.ts:
  픽셀별 grayscale = 0.299R + 0.587G + 0.114B
  intensity로 원본과 blend

vintage.ts:
  채도 감소 + 세피아 톤 (R×0.393 + G×0.769 + B×0.189)
  비네팅 (중심에서 거리 기반 어두워짐)

cinematic.ts:
  대비 강화 + 쉐도우 청색 + 하이라이트 오렌지
  S커브 적용

warm.ts:
  temperature +30, R채널 +15, B채널 -10

cool.ts:
  temperature -30, B채널 +15, R채널 -10

soft.ts:
  가우시안 블러 경미하게 + 밝기 +10 + 채도 -15

vibrant.ts:
  채도 +40 + 대비 +10
```

---

## 프롬프트 6 — 오버레이 시스템 (텍스트 + 워터마크)

```
오버레이 시스템을 만들어줘.
기술: React 18 + TypeScript, Konva.js (Text + Image node)

OverlayPanel (Right Panel 내):
- "텍스트 추가" 버튼 → 캔버스 중앙에 TextOverlay 생성
- "워터마크 추가" 버튼 → 파일 선택 → ImageOverlay 생성
- 추가된 오버레이 목록 (순서 변경 = zIndex 변경)
- 각 항목: 레이어 아이콘 + 이름 + 삭제 버튼

TextOverlay (Konva.Text):
- 캔버스 위 드래그 이동
- 더블클릭: 인라인 텍스트 편집 (Textarea 오버레이)
- 선택 시 Right Panel에 텍스트 옵션 표시:
  • 텍스트 내용 (textarea)
  • 폰트 크기 (12~200px, 슬라이더)
  • 색상 (color picker — 기본 색상 8개 + 커스텀 hex input)
  • 불투명도 (0~100%)
  • 그림자 on/off (toggle)
  • 글꼴: 기본 sans / serif / mono (3개)

WatermarkOverlay (Konva.Image):
- 파일 업로드 또는 URL 입력
- 크기 조절 핸들 (코너 2개)
- 불투명도 슬라이더 (0~100%)
- 위치: 드래그 자유 이동

zIndex 관리:
- OverlayList 드래그 정렬 → Konva zIndex 동기화
- "맨 앞으로" / "맨 뒤로" 버튼
```

---

## 프롬프트 7 — Undo / Redo 시스템

```
Undo/Redo 히스토리 시스템을 만들어줘.
기술: TypeScript, Zustand historyStore

Command Stack 구조:
interface Command {
  type: string;
  before: Partial<EditState>;
  after: Partial<EditState>;
}

historyStore (Zustand):
interface HistoryStore {
  past: Command[];      // 최대 50개
  future: Command[];
  push(cmd: Command): void;
  undo(): void;
  redo(): void;
  canUndo: boolean;
  canRedo: boolean;
}

동작:
- push: future 클리어, past에 push (50개 초과 시 가장 오래된 것 제거)
- undo: past에서 pop → before 상태 복원 → future에 push
- redo: future에서 pop → after 상태 적용 → past에 push

키보드 단축키 (useKeyboard.ts):
- Ctrl+Z: undo()
- Ctrl+Y 또는 Ctrl+Shift+Z: redo()

UI 피드백:
- 툴바 Undo 버튼: canUndo=false 시 opacity 0.3, disabled
- Redo 버튼: canRedo=false 시 opacity 0.3, disabled
- 작업명 표시: "← 크롭 되돌리기", "→ 밝기 다시 적용"
```

---

## 프롬프트 8 — 이미지 처리 파이프라인 (Engine Layer)

```
이미지 처리 파이프라인을 만들어줘.
기술: TypeScript, OffscreenCanvas, Web Worker

pipeline.ts (메인 파이프라인):
async function applyPipeline(
  originalBlob: Blob,
  state: EditState
): Promise<ImageData>

처리 순서:
1. Crop     — drawImage with sx/sy/sw/sh
2. Rotate   — translate to center → rotate → translate back
3. Flip     — scale(-1, 1) or scale(1, -1)
4. Color    — 픽셀 루프: brightness/contrast/saturation/exposure/highlights/shadows/temperature
5. Filter   — 각 필터 함수 적용 + intensity blend
6. Return ImageData → Konva Image 업데이트

색상 보정 수식 (colorGrade.ts):
brightness:  clamp(pixel + value * 2.55, 0, 255)
contrast:    clamp((pixel - 128) * factor + 128, 0, 255)  factor = (259*(v+255))/(255*(259-v))
saturation:  HSL 변환 후 S 조정 후 RGB 역변환
exposure:    pixel * 2^(value/100)
temperature: R += value*0.5, B -= value*0.5 (warm=+R-B, cool=+B-R)
highlights:  밝은 픽셀(>128)만 조정
shadows:     어두운 픽셀(<128)만 조정

Web Worker (imageProcessor.worker.ts):
- 4K 이미지(~50MB) 처리 시 Worker로 위임
- postMessage({ blob, state }) → onmessage({ imageData })
- 메인 스레드 UI 블로킹 방지

성능 최적화:
- slider 드래그 중: CSS filter로 즉시 반영 (픽셀 처리 없음)
- slider 놓음(mouseup): 실제 파이프라인 실행
- debounce 100ms (연속 조작 방지)
- 썸네일(200×200)로 빠른 미리보기 → 확대 후 최종 렌더
```

---

## 프롬프트 9 — Export 시스템

```
Export 모달 컴포넌트를 만들어줘.
기술: React 18 + TypeScript, JSZip (batch export)

ExportModal (우측 상단 "내보내기" 버튼 클릭 시):
- 모달: 중앙 고정, backdrop rgba(0,0,0,0.7)
- 너비 480px, 다크 테마 (#1a1a1a)

설정 옵션:
1. 파일 형식: JPG | PNG | WEBP (3탭 버튼)
2. 품질 슬라이더: 1 ~ 100 (JPG/WEBP만 활성)
   - 현재 값 표시 + 예상 파일 크기 (실시간 계산)
3. 출력 크기:
   - 원본 (original)
   - 1080px (긴 변 기준)
   - 2048px (긴 변 기준)
   - 커스텀 (width × height 직접 입력)
4. 파일명: input (기본: 원본 파일명)

단일 내보내기:
- "다운로드" 버튼 → canvas.toBlob() → a.download

Batch Export (여러 장 선택 시):
- "전체 내보내기 (ZIP)" 버튼
- JSZip으로 각 이미지를 동일 설정으로 처리 후 ZIP 묶음
- 진행률 표시: "처리 중... 12 / 50"
- 완료 시 "happiness-export.zip" 자동 다운로드

export 처리 (useExport.ts):
async function exportImage(
  imageId: string,
  state: EditState,
  options: ExportOptions
): Promise<Blob>

1. applyPipeline(originalBlob, state) → ImageData
2. OffscreenCanvas에 그리기
3. resize (옵션에 따라)
4. canvas.convertToBlob({ type, quality })

에러 처리:
- 개별 이미지 실패 시 건너뛰고 계속
- 실패 목록 완료 후 토스트로 알림
```

---

## 프롬프트 10 — 전체 Zustand Store 통합

```
전체 Zustand store를 만들어줘.
기술: TypeScript, Zustand

editorStore.ts:
interface EditorStore {
  // 현재 편집 상태
  currentState: EditState | null;
  selectedImageId: string | null;

  // Actions
  loadImage(imageId: string, originalState?: EditState): void;
  updateCrop(crop: CropState): void;
  updateRotate(deg: number): void;
  updateFlip(axis: 'horizontal'|'vertical'): void;
  updateAdjustment(key: keyof AdjustState, value: number): void;
  updateFilter(name: string, intensity: number): void;
  addOverlay(overlay: OverlayItem): void;
  updateOverlay(id: string, patch: Partial<OverlayItem>): void;
  removeOverlay(id: string): void;
  reorderOverlays(ids: string[]): void;
  resetAll(): void;

  // Undo 자동 적용 (각 update 전 historyStore.push 호출)
}

uploadStore.ts:
interface UploadStore {
  images: ImageItem[];         // { id, name, originalBlob, thumbnailUrl, editState? }
  isProcessing: boolean;
  progress: { current: number; total: number };
  addImages(files: File[]): Promise<void>;
  removeImage(id: string): void;
  saveEditState(id: string, state: EditState): void;
  clearAll(): void;
}

historyStore.ts: (프롬프트 7 참조)

스토어 간 연동:
- editorStore.loadImage → uploadStore에서 editState 불러오기
- editorStore 변경 → 자동으로 uploadStore.saveEditState 동기화 (Zustand subscribe)
- 이미지 전환 시 현재 EditState를 uploadStore에 저장 후 새 이미지 로드
```

---

## 핵심 원칙

1. **비파괴 편집**: originalBlob은 절대 수정하지 않음. EditState JSON으로만 관리
2. **성능**: 슬라이더 드래그 = CSS filter (즉시). 놓으면 파이프라인 실행
3. **에러 복원**: 개별 파일 실패가 전체를 멈추지 않음
4. **Undo 안전**: 모든 Edit 액션은 push → historyStore 자동 연동

---

## 구현 순서

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| 1 | AppShell 3-panel 레이아웃 | 2h |
| 2 | 업로드 + 썸네일 그리드 | 3h |
| 3 | Zustand store 3개 | 2h |
| 4 | 색상 보정 슬라이더 + CSS filter 프리뷰 | 3h |
| 5 | 이미지 처리 파이프라인 (Engine Layer) | 4h |
| 6 | Crop / Rotate / Flip (Transform) | 4h |
| 7 | 필터 시스템 7종 | 3h |
| 8 | Undo/Redo command stack | 2h |
| 9 | 오버레이 (텍스트 + 워터마크) | 4h |
| 10 | Export (단일 + Batch ZIP) | 3h |
| 11 | Web Worker 이관 (4K 이미지 대응) | 2h |
| 12 | 성능 최적화 + 엣지케이스 | 3h |

---

## Edge Case 처리

| 케이스 | 대응 |
|--------|------|
| 50MB+ 이미지 | Web Worker로 처리, 진행률 표시 |
| EXIF 파싱 오류 | try-catch, 무시하고 계속 |
| 깨진 파일 | FileReader onerror → toast, 해당 파일만 skip |
| 모바일 저메모리 | 썸네일 크기 축소, 동시 처리 2개로 제한 |
| 이미지 전환 | 현재 EditState uploadStore에 저장 후 전환 |
| 100장 초과 업로드 | 100장만 받고 초과분 toast 경고 |
| WebP 미지원 브라우저 | PNG fallback |

---

## README 뼈대

```markdown
# Happiness Image Editor

## 실행 방법
npm install
npm run dev          # localhost:5173

## 빌드
npm run build
npm run preview

## 구조
- src/engine/        — 이미지 처리 순수 함수 (UI 의존성 없음)
- src/store/         — Zustand 전역 상태
- src/features/      — 도메인별 훅 + 로직
- src/components/    — React UI 컴포넌트
- src/workers/       — Web Worker (헤비 처리)

## 편집 흐름
업로드 → 이미지 선택 → 편집(Transform/Adjust/Filter/Overlay) → Undo/Redo → 내보내기
```
