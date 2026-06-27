# 13. 이미지 에디터 UI 디자인 가이드

작성일: 2026-06-19  
참고 UX: Format.com, Adobe Lightroom Web, Darkroom App  
구현 상태: ✅ 완료 (`/editor` 라우트)

---

## 디자인 철학

> "강력하지만 깨끗하게 — 작업에 집중하게 해주는 UI"

- **다크 전용 테마**: 색상 작업에 방해받지 않는 무채색 배경
- **3-Panel 레이아웃**: 사진 목록(좌) + 캔버스(중) + 컨트롤(우) — 전문 편집 소프트웨어 표준
- **비파괴 편집**: 원본 픽셀 유지, Undo/Redo 50단계
- **인라인 미리보기**: 슬라이더 조작 즉시 캔버스에 반영

---

## 컬러 시스템 (에디터 다크 테마)

```
배경       darkBg       #080810  — 전체 배경, 갤러리 영역
패널       darkSurface  #0c0c18  — 좌·우 패널 배경
카드       darkElevated #1a1a3a  — 버튼·드롭다운 배경
구분선     darkBorder   rgba(255,255,255,0.06)  — 패널 경계, 섹션 구분
텍스트     darkText     #eeeeff  — 기본 텍스트
보조텍스트 darkTextSub  #8888cc  — 레이블, 힌트
힌트       darkTextHint #5555aa  — 비활성, 플레이스홀더
강조       primary      #5b6ef5  — 활성 탭, 선택 상태, CTA
위험       danger       #e53e3e  — 취소, 삭제
```

---

## 레이아웃 구조

```
┌──────────────────────────────────────────────────────────────┐
│  ← 뒤로  🖼️ 편집기                                           │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  [+ 이미지 추가]                                       │   │
│  ├──────────────────────────────────────────────────────┤   │  ← Left Panel (220px)
│  │  [img1] [img2]    ← 2열 썸네일 그리드                 │   │
│  │  [img3] [img4]    ← D&D 정렬, ✓ 선택 표시            │   │
├──┴──────────────────────────────────────────────────────┼───┤
│  ↩ ↪ | ✂ ↺ ↔           🔍- 75%  🔍+ ⊡                  │   │  ← Toolbar (44px)
├────────────────────────────────────────────────────────┤   │
│                                                         │  T  │
│                   [CANVAS]                              │  r  │
│                                                         │  a  │  ← Center (flex:1)
│                                                         │  n  │
│  파일명 | 2400×1600 | 75%                   [⊡ 화면맞춤]│  s  │
├────────────────────────────────────────────────────────┤  f  │
│ Transform | 보정 | 필터 | 오버레이                       │  o  │  ← Right Panel (280px)
│ ─────────────────────────────────────────────────────  │  r  │
│  [슬라이더 / 컨트롤]                                    │  m  │
│                                                         │     │
│  [💾 내보내기]                                          │     │
└──────────────────────────────────────────────────────────────┘
```

### 반응형 (768px 미만)
- 좌 패널: 숨김 → 햄버거(☰) 클릭 시 slide-in drawer
- 우 패널: `position: fixed; bottom: 0` 하단 시트, `max-height: 50vh`
- 툴바: 햄버거 버튼 표시

---

## 컴포넌트별 디자인 사양

### Left Panel

| 요소 | 사양 |
|------|------|
| 패널 너비 | 220px 고정 |
| 썸네일 그리드 | 2열, gap 6px, padding 8px |
| 썸네일 비율 | 1:1 (object-fit: cover) |
| 선택 상태 | `primary` 2px border + 좌상단 ✓ 뱃지(16px 원형) |
| 삭제 버튼 | hover 시 우상단 표시, 18px 원형 반투명 |
| 드래그 정렬 | HTML5 D&D, 드래그 중 opacity 0.7 |
| 빈 상태 | 📁 + "이미지를 추가하세요" (중앙 정렬) |

### Toolbar

```
좌측:  [☰ 이미지*] [↩ Undo] [↪ Redo] │ [✂ 크롭] [↺ 회전] [↔ 뒤집기]
우측:  [🔍−] [75%] [🔍+] [⊡]

* 모바일 전용
```

- 비활성 버튼: `opacity: 0.3`
- 활성 툴: `primary` tint 배경 + border

### Center Canvas

```
배경: darkBg (#0e0e0e)
체커보드 패턴: 이미지 로드 전 / 투명 영역 표시
Zoom: 0.1x ~ 5.0x (마우스 휠 ±10%)
Pan: Space + 드래그 (cursor: grab → grabbing)
더블클릭: fitToScreen()
```

**크롭 오버레이 (activeTool === 'crop')**
- 외부 마스크: `rgba(0,0,0,0.5)`
- 테두리: `primary` 2px solid
- 황금비율 그리드: 흰색 0.3 opacity (3×3)
- 핸들: 4 모서리 흰색 5px 원형

**상태바 (하단)**
```
파일명 (최대 200px ellipsis) | 원본 W×H | 현재 zoom% | [⊡ 화면 맞춤]
배경: rgba(0,0,0,0.55) blur(8px)
```

### Right Panel — 탭 4개

```
Transform | 보정 | 필터 | 오버레이
활성: primary 하단 2px 밑줄 + 흰색 텍스트
비활성: darkTextSub, 500 weight
```

**하단 내보내기 버튼**
```
[💾 내보내기] — primary bg, full-width, 11px radius
이미지 없을 때: elevated bg, opacity 0.5, not-allowed
```

---

## 패널별 디자인 사양

### TransformPanel

**크롭 섹션**
```
비율 버튼: [자유] [1:1] [4:5] [16:9] [3:2]
활성: primary bg, 흰 텍스트
비활성: darkElevated bg

적용/취소:
  ✓ 적용 — primary, flex:1
  ✗ 취소 — danger, flex:1
```

**회전 섹션**
```
슬라이더: -180 ~ 180, accentColor primary
값 표시: 우측 primary bold "15°"
더블클릭 → 0 리셋
90도 버튼: [↺ -90°] [↻ +90°] — darkElevated, border
직접 입력: input[type=number], darkElevated bg
```

**뒤집기 섹션**
```
[↔ 수평] [↕ 수직]
활성: primary bg
비활성: darkElevated bg
```

### AdjustPanel

**아코디언 구조**
- 변경 있는 섹션: 레이블 앞 ● (primary, 8px)
- 헤더 클릭 → 접기/펼치기, 우측 ▲/▼

**AdjustmentSlider 공통 사양**
```
레이블 (darkTextSub) + 현재값 (primary bold, 우측)
range input: accentColor primary
더블클릭 → 0 리셋
0이 아닐 때 레이블 앞 ● (primary, 7px)
```

**특수 gradient track**
```
노출:  #000 → #fff
색온도: #88aaff(차갑게) → #ffaa44(따뜻하게)
색조:  #44cc88(초록) → #cc44bb(보라)
```

**HSL 섹션**
```
8색상 도트 선택: 22px 원형
  빨강 #e53e3e | 주황 #f59e0b | 노랑 #ecc94b | 초록 #48bb78
  하늘 #4fd1c5 | 파랑 #4299e1 | 보라 #9f7aea | 마젠타 #ed64a6
선택 도트: 흰색 2px border
```

**하단 버튼**
```
[↺ 전체 초기화] — darkElevated, border, full-width
```

### FilterPanel

```
3열 그리드, gap 8px
FilterCard (per filter):
  64px 높이 canvas (실제 필터 미리보기)
  필터명 (한국어): 9px, darkTextSub
  선택 시: primary 2px border + 우상단 ✓ 뱃지
  hover: scale(1.04) transition

강도 슬라이더 (필터 선택 시만 표시):
  0 ~ 100, accentColor primary
```

**필터 8종 시각 특성**
| 필터 | 외형 효과 |
|------|---------|
| 없음 | 원본 |
| 흑백 | 채도 제거 |
| 빈티지 | 붉은 세피아 + 대비 감소 |
| 시네마틱 | S커브 + 하이라이트 오렌지 + 쉐도우 파랑 |
| 소프트 | 블러 + 밝기 +8 |
| 선명 | 채도 +40 + 대비 +10 |
| 따뜻함 | R+20, B-15 |
| 차가움 | B+20, R-15 |

### OverlayPanel

**추가 버튼**
```
[✏️ 텍스트 추가] — primary bg, full-width
[🖼️ 워터마크 추가] — darkElevated, border, full-width
```

**오버레이 목록 아이템**
```
[⠿ 드래그핸들] [✏️/🖼️] [이름 ellipsis]   [👁 토글] [× 삭제]
선택 시: darkElevated bg + border
```

**텍스트 옵션 (선택 시)**
```
textarea 2행 (darkElevated, border)
크기 슬라이더: 12 ~ 200px
폰트: [Sans] [Serif] [Mono]
색상: 8 스와치 (22px 원형) + hex input
불투명도 슬라이더: 0 ~ 100%
그림자: ON/OFF 토글 버튼
```

**워터마크 옵션 (선택 시)**
```
크기 슬라이더: 10% ~ 100%
불투명도 슬라이더: 0 ~ 100%
위치 9칸 그리드 (3×3 버튼)
```

---

## ExportModal

```
backdrop: rgba(0,0,0,0.75), 클릭 닫기
패널: width 440px, darkSurface bg, border darkBorder, radius 16px
```

**옵션 순서**
1. 파일 형식 3탭: [JPG] [PNG] [WEBP] — active: primary bg
2. 품질 슬라이더 (JPG/WEBP): 1~100, 기본 92
3. 출력 크기: [원본] [1080px] [2048px] [직접 입력]
4. 파일명 input (darkElevated)
5. ☁️ 갤러리 바로 업로드 체크박스

**버튼**
```
[⬇️ 다운로드] — primary, full-width
[⬇️ 전체 다운로드 (N장)] — darkElevated, border (이미지 2장 이상 시)
진행: "다운로드 중... 3 / 12"
완료: ✅ darkText
```

---

## 단축키

| 단축키 | 동작 |
|--------|------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Space + 드래그` | 캔버스 Pan |
| `Escape` | 현재 툴 → select 리셋 |
| `Ctrl+V` | 클립보드 이미지 붙여넣기 |

---

## 드롭존 (전체 페이지)

```
dragenter 시 오버레이:
  background: rgba(91,110,245,0.15)
  border: 3px dashed #5b6ef5
  중앙: 📁 40px + "이미지를 여기에 드롭하세요" (22px, 흰색)
  서브: "JPG · PNG · WEBP, 최대 100장"

파일 제한:
  - 허용: image/jpeg, image/png, image/webp
  - 최대: 50MB/장
  - 최대 장수: 100장 (초과 시 alert)
```

---

## 접근성

| 요소 | 처리 |
|------|------|
| 이미지 썸네일 | `alt={img.name}` |
| 버튼 비활성 | `disabled` + `cursor: not-allowed` |
| 키보드 단축키 | input/textarea 포커스 시 비활성 |
| beforeunload | 편집 변경 있을 때 이탈 경고 |

---

## 구현 파일 맵

```
src/
├── pages/ImageEditorPage.jsx          — 루트 페이지
├── contexts/EditorContext.jsx         — 전역 상태
├── reducers/editorReducer.js          — 액션 + Undo/Redo
└── components/editor/
    ├── EditorShell.jsx                — 3-panel 셸
    ├── LeftPanel.jsx                  — 썸네일 스트립
    ├── CenterCanvas.jsx               — 캔버스 렌더링
    ├── ExportModal.jsx                — 내보내기 모달
    └── panels/
        ├── TransformPanel.jsx         — 크롭·회전·뒤집기
        ├── AdjustPanel.jsx            — 색상 보정
        ├── FilterPanel.jsx            — 필터 7종
        └── OverlayPanel.jsx           — 텍스트·워터마크
```
