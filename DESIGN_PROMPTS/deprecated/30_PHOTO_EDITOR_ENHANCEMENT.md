# 30 — 사진 보정 기능 강화 기획서
## Photo Editor Enhancement v2 — Y2K·필름 스냅 프리셋 + Camera Calibration

---

## 1. 배경 및 목표

### 1.1 현재 상태

`frontend/src/hooks/useImageAdjustments.js` 기반 Canvas 보정 엔진이 구현되어 있으며  
다음 기능이 이미 동작 중이다:

| 카테고리 | 구현 완료 |
|---------|---------|
| Basic   | Exposure / Contrast / Highlights / Shadows / Whites / Blacks / Temperature / Tint |
| Effects | Vibrance / Saturation / Texture / Clarity / Dehaze / Vignette / Grain (Amount·Size·Roughness) |
| HSL     | Red·Orange·Yellow·Green·Aqua·Blue·Purple·Magenta × Hue·Sat·Lum |
| Color Grading | Shadows·Midtones·Highlights × Hue·Sat + Blending |
| Sharpening | Amount / Radius / Detail(edge masking threshold) |
| Noise NR | Luminance / Color |
| Curve   | RGB 채널 + R/G/B 개별 Catmull-Rom 커브 |
| Preset  | 최대 20개 커스텀 저장, JSON 내보내기/가져오기, 내장 8종 |

### 1.2 미구현 — 이번 기획 범위

| 번호 | 기능 | 중요도 |
|------|------|------|
| A | **Camera Calibration** (R/G/B Primary Hue·Sat) | ★★★ |
| B | Color Grading **Balance** 파라미터 | ★★ |
| C | 프리셋 **XMP 내보내기** (Lightroom 호환) | ★★ |
| D | 내장 프리셋 — **Y2K + 필름 스냅** 추가 | ★★★ |
| E | **Tone Curve 블랙/화이트 포인트 페이드** 시각화 | ★ |
| F | 보정 패널 **UX 개편** (Calibration 섹션 추가, 섹션 순서 재정렬) | ★★ |

---

## 2. 기능 상세 명세

---

### A. Camera Calibration (카메라 캘리브레이션)

#### 2.A.1 개요

Lightroom의 `Camera Calibration` 패널은 카메라 센서 레벨의 RGB 기본색 행렬을 보정한다.  
Canvas 환경에서는 픽셀 단위로 색채학적 변환을 적용하여 동일 효과를 구현한다.

#### 2.A.2 Lightroom 파라미터 → Canvas 구현 매핑

```
Red Primary
  Hue       : 빨간 계열(Hue 330~30°) 픽셀의 색조를 이동
  Saturation: 빨간 계열 픽셀의 채도 스케일

Green Primary
  Hue       : 녹색 계열(Hue 90~150°) 픽셀의 색조 이동
  Saturation: 녹색 계열 픽셀의 채도 스케일

Blue Primary
  Hue       : 파란 계열(Hue 195~255°) 픽셀의 색조 이동
  Saturation: 파란 계열 픽셀의 채도 스케일
```

#### 2.A.3 알고리즘 (픽셀 단위)

```
각 픽셀 [R, G, B] → HSL 변환:

1. 가중치 계산 (HSL_RANGE_CENTERS 방식과 동일, 3개 기본색 범위)
   wR = gaussianWeight(hue, center=0,   width=60°)   // 빨강
   wG = gaussianWeight(hue, center=120, width=60°)   // 초록
   wB = gaussianWeight(hue, center=210, width=60°)   // 파랑

2. Hue 이동
   dH  = wR × calibR.hue + wG × calibG.hue + wB × calibB.hue
   hue = (hue + dH / 100 * 30) mod 360

3. Saturation 스케일
   dS  = wR × calibR.sat + wG × calibG.sat + wB × calibB.sat
   sat = clamp(sat × (1 + dS / 100), 0, 1)

4. HSL → RGB 역변환
```

> 이 방식은 HSL 패널과 동일한 픽셀 루프를 재사용하므로 성능 부담이 최소화된다.

#### 2.A.4 기본값 및 범위

```js
export const DEFAULT_CALIBRATION = {
  red:   { hue: 0, saturation: 0 },   // Hue: -50~+50, Sat: -100~+100
  green: { hue: 0, saturation: 0 },
  blue:  { hue: 0, saturation: 0 },
};
```

#### 2.A.5 파이프라인 삽입 위치

```
기존 파이프라인:
  buildChannelLUTs → renderWithChannelLUTs → applyVibranceSaturation
  → applyHSLAdjustments → applyColorGrading → applySharpening
  → applyNoiseReduction → applyUnsharpMask → applyDehaze → applyVignette → applyGrain

추가 위치 (HSL 직전):
  ... → applyVibranceSaturation
  → applyCalibration (NEW)         ← 카메라 센서 레벨 보정
  → applyHSLAdjustments ...
```

Lightroom 실제 처리 순서와 일치: Calibration → HSL → Color Grading → Detail.

---

### B. Color Grading Balance

#### 2.B.1 현재 상태

`DEFAULT_COLOR_GRADING.blending` (0~100) 은 그라데이션 혼합 강도만 제어한다.

#### 2.B.2 추가 파라미터

```js
// 기존
export const DEFAULT_COLOR_GRADING = {
  shadows:   { hue: 0, saturation: 0 },
  midtones:  { hue: 0, saturation: 0 },
  highlights: { hue: 0, saturation: 0 },
  blending:  50,
  balance:   0,   // -100~+100 (NEW)
};
```

`balance < 0` → 그림자 영역 확장, 하이라이트 축소  
`balance > 0` → 하이라이트 영역 확장, 그림자 축소

구현: 섀도/하이라이트 가중치 함수의 임계 지점(0.5)을 `balance`에 따라 이동.

---

### C. XMP 프리셋 내보내기 (Lightroom 호환)

#### 2.C.1 XMP 형식 명세

```xml
<?xpacket begin="..." id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
      crs:PresetType="Normal"
      crs:Exposure2012="-0.20"
      crs:Contrast2012="+25"
      crs:Highlights2012="-20"
      crs:Shadows2012="+20"
      crs:Whites2012="+35"
      crs:Blacks2012="-30"
      crs:Texture="-10"
      crs:Clarity2012="+5"
      crs:Dehaze="-5"
      crs:Vibrance="+30"
      crs:Saturation="+5"
      crs:HueAdjustmentRed="+15"
      ...
    />
  </rdf:RDF>
</x:xmpmeta>
```

#### 2.C.2 변환 테이블 (내부 값 → XMP crs: 필드명)

| 내부 키 | XMP 필드 | 스케일 |
|---------|---------|------|
| `exposure` | `crs:Exposure2012` | × 1.0 (EV) |
| `contrast` | `crs:Contrast2012` | × 1 |
| `highlights` | `crs:Highlights2012` | × 1 |
| `shadows` | `crs:Shadows2012` | × 1 |
| `whites` | `crs:Whites2012` | × 1 |
| `blacks` | `crs:Blacks2012` | × 1 |
| `temperature` | `crs:Temperature` | 2000~50000K 매핑 |
| `tint` | `crs:Tint` | -150~+150 매핑 |
| `effects.vibrance` | `crs:Vibrance` | × 1 |
| `saturation` | `crs:Saturation` | × 1 |
| `effects.texture` | `crs:Texture` | × 1 |
| `effects.clarity` | `crs:Clarity2012` | × 1 |
| `effects.dehaze` | `crs:Dehaze` | × 1 |
| `hslAdj.red.hue` | `crs:HueAdjustmentRed` | × 1 |
| ... | ... | ... |
| `colorGrading.shadows.hue` | `crs:ShadowTint` (근사) | 매핑 |
| `calibration.red.hue` | `crs:RedHue` | × 1 |
| `calibration.red.saturation` | `crs:RedSaturation` | × 1 |
| `effects.grainAmount` | `crs:GrainAmount` | × 1 |
| `effects.grainSize` | `crs:GrainSize` | × 1 |
| `effects.grainRoughness` | `crs:GrainFrequency` | × 1 |
| `effects.vignette` | `crs:VignetteAmount` | × 1 |

#### 2.C.3 내보내기 UX

```
PresetManager → 개별 프리셋 점 메뉴(···) → [JSON으로 내보내기] [XMP로 내보내기]
전체 내보내기 → happiness-presets.json 또는 각 프리셋 .xmp 파일 다운로드
```

---

### D. 내장 프리셋 — Y2K + 필름 스냅

#### 2.D.1 프리셋 이름 및 카테고리

```
카테고리: 🎞️ 필름 스타일
이름: "Y2K 필름 스냅"
설명: "차가운 블루 무드 · 형광 핑크 · 빈티지 그레인"
```

#### 2.D.2 전체 값 명세

```js
{
  // Basic
  adjustments: {
    exposure:    -0.20,   // -3~+3 EV  → 내부 -0.20
    contrast:    +25,
    highlights:  -20,
    shadows:     +20,
    whites:      +35,
    blacks:      -30,
    temperature: -12,     // 차가운 블루 (Lightroom 5500K 기준 -12)
    tint:        0,
  },

  // Effects
  effects: {
    vibrance:      +30,
    saturation:    +5,
    texture:       -10,
    clarity:       +5,
    dehaze:        -5,
    vignette:      -10,
    grainAmount:   30,
    grainSize:     28,
    grainRoughness: 55,
  },

  // Tone Curve — 약한 S Curve + 페이드
  channelCurves: {
    rgb: [
      { x: 0.00, y: 0.05 },   // 블랙 포인트 살짝 올림 (Fade)
      { x: 0.25, y: 0.18 },   // 그림자 낮춤
      { x: 0.75, y: 0.80 },   // 하이라이트 올림
      { x: 1.00, y: 0.97 },   // 화이트 포인트 약간 아래
    ],
    r: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    g: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    b: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  },

  // HSL Color Mixer
  hslAdj: {
    red:     { hue: +15, saturation: +15, luminance: +5  },
    orange:  { hue: -10, saturation: -20, luminance: +15 },
    yellow:  { hue: -35, saturation: -25, luminance: +10 },
    green:   { hue: -60, saturation: -10, luminance: +10 },
    aqua:    { hue: -20, saturation: +25, luminance: -10 },
    blue:    { hue: -15, saturation: +35, luminance: -20 },
    purple:  { hue: 0,   saturation: +20, luminance: 0   },
    magenta: { hue: +20, saturation: +20, luminance: 0   },
  },

  // Color Grading
  colorGrading: {
    shadows:    { hue: 205, saturation: 15 },
    midtones:   { hue: 330, saturation: 8  },
    highlights: { hue: 45,  saturation: 10 },
    blending:   50,
    balance:    -10,    // 그림자 쪽으로 (NEW)
  },

  // Sharpening
  sharpening: {
    amount:  35,
    radius:  1.0,
    detail:  40,   // masking level
  },

  // Noise Reduction
  noiseReduction: {
    luminance: 10,
    color:     20,
  },

  // Camera Calibration (NEW)
  calibration: {
    red:   { hue: +20, saturation: +10 },
    green: { hue: -15, saturation: +10 },
    blue:  { hue: -35, saturation: +35 },
  },
}
```

#### 2.D.3 기대 결과

| 영역 | 결과 |
|------|------|
| 전체 무드 | 차가운 블루 · Y2K Editorial |
| 검정 | 깊지만 뭉개지지 않음 (블랙 포인트 -30) |
| 피부 | 창백하고 깨끗한 느낌 (Orange 루마 +15, 채도 -20) |
| 흰 옷 | 살짝 푸른 화이트 (Blue Primary Hue -35) |
| 그림자 | 청록 계열 (Color Grading Shadows Hue 205) |
| 빨강·핑크 | 형광처럼 선명 (Red Sat +15, Magenta Sat +20, Blue Primary Sat +35) |
| 그레인 | 빈티지 필름 스냅 (Amount 30, Size 28, Roughness 55) |

---

### E. 기존 내장 프리셋 확장

현재 8종 → 이번 업데이트로 **9종**으로 확장:

| # | 이름 | 스타일 |
|---|------|--------|
| 1 | Fuji Velvia | 채도 강조 필름 |
| 2 | Kodak Portra | 따뜻한 필름 피부톤 |
| 3 | Matte Fade | 페이드 무드 |
| 4 | B&W Dramatic | 흑백 드라마틱 |
| 5 | Golden Hour | 골든 아워 |
| 6 | Cool Cinematic | 차가운 시네마틱 |
| 7 | Pastel Dream | 파스텔 |
| 8 | Vibrant Pop | 팝 컬러 |
| **9 (NEW)** | **Y2K 필름 스냅** | Y2K Editorial · 플래시 스냅 |

---

### F. 보정 패널 UX 개편

#### 2.F.1 섹션 순서 재정렬 (Lightroom 표준 순서 준수)

```
[기존]                    [개편 후]
Basic                  →  Basic
Tone Curve             →  Tone Curve
Color Mixer (HSL)      →  Color Mixer (HSL)
Color Grading          →  Color Grading
Sharpening             →  Detail (Sharpening + Noise Reduction 통합)
Noise Reduction        →  Camera Calibration  ← NEW
Texture / Clarity      →  Effects (Texture·Clarity·Dehaze·Vignette·Grain)
Preset Manager         →  Preset Manager
```

#### 2.F.2 Camera Calibration UI 컴포넌트 명세

```
📷 Camera Calibration           [섹션 헤더]
  ─────────────────────────────
  Red Primary
    Hue       [ ────●──── ]  -50 ~ +50    현재값: 0
    Saturation[ ────●──── ] -100 ~ +100   현재값: 0

  Green Primary
    Hue       [ ────●──── ]  -50 ~ +50
    Saturation[ ────●──── ] -100 ~ +100

  Blue Primary
    Hue       [ ────●──── ]  -50 ~ +50
    Saturation[ ────●──── ] -100 ~ +100
  ─────────────────────────────
  [초기화]
```

슬라이더 트랙 색상: Red Primary → 붉은 그라디언트, Green → 녹색, Blue → 파란 그라디언트

#### 2.F.3 Color Grading Balance 슬라이더 추가

```
Color Grading 섹션 하단에:
  Balance  [ ──●────── ]  -100 ~ +100   현재값: 0
  (음수 = 섀도 쪽, 양수 = 하이라이트 쪽)
```

---

## 3. 파이프라인 업데이트 명세

### 3.1 신규 함수 목록

```js
// Camera Calibration
export const DEFAULT_CALIBRATION = {
  red:   { hue: 0, saturation: 0 },
  green: { hue: 0, saturation: 0 },
  blue:  { hue: 0, saturation: 0 },
};

export function applyCalibration(canvas, calibration)
  // 픽셀별 HSL 변환 → 3개 Primary 가중치 계산 → Hue 이동 + Sat 스케일 → 역변환

// Color Grading Balance (applyColorGrading 수정)
// blending + balance 파라미터 반영하여 가중치 임계점 이동

// XMP Export
export function exportToXMP(presetName, allState)
  // → .xmp 파일 다운로드 (Blob → URL.createObjectURL)
```

### 3.2 applyEffects 업데이트된 파이프라인

```
buildChannelLUTs(adjustments, channelCurves)
renderWithChannelLUTs(canvas, pixels, w, h, luts)
applyVibranceSaturation(canvas, effects.vibrance, effects.saturation)
applyCalibration(canvas, calibration)                ← NEW
applyHSLAdjustments(canvas, hslAdj)
applyColorGrading(canvas, colorGrading)              ← balance 파라미터 추가
applySharpening(canvas, sharpening)
applyNoiseReduction(canvas, noiseReduction)
applyUnsharpMask(canvas, 4, effects.texture)
applyUnsharpMask(canvas, 20, effects.clarity)
applyDehaze(canvas, effects.dehaze)
applyVignette(canvas, effects.vignette)
applyGrain(canvas, effects.grainAmount, effects.grainSize, effects.grainRoughness, grainTile)
```

---

## 4. 프리셋 데이터 구조 변경

### 4.1 저장 형식 (localStorage)

```json
{
  "version": 2,
  "presets": [
    {
      "id": "y2k-film-snap",
      "name": "Y2K 필름 스냅",
      "category": "필름 스타일",
      "emoji": "🎞️",
      "builtIn": true,
      "adjustments": { ... },
      "effects": { ... },
      "channelCurves": { ... },
      "hslAdj": { ... },
      "colorGrading": { ... },
      "sharpening": { ... },
      "noiseReduction": { ... },
      "calibration": { ... }
    }
  ]
}
```

`version: 2` — calibration 필드 추가. 구버전 프리셋 로드 시 calibration 기본값으로 폴백.

### 4.2 XMP 내보내기 형식

```xml
<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
      crs:Version="15.4"
      crs:ProcessVersion="11.0"
      crs:PresetType="Normal"
      crs:Exposure2012="-0.20"
      crs:Contrast2012="25"
      crs:Highlights2012="-20"
      crs:Shadows2012="20"
      crs:Whites2012="35"
      crs:Blacks2012="-30"
      crs:Texture="-10"
      crs:Clarity2012="5"
      crs:Dehaze="-5"
      crs:Vibrance="30"
      crs:Saturation="5"
      crs:ParametricShadows="0"
      crs:ParametricDarks="0"
      crs:ParametricLights="0"
      crs:ParametricHighlights="0"
      crs:ParametricShadowSplit="25"
      crs:ParametricMidtoneSplit="50"
      crs:ParametricHighlightSplit="75"
      crs:HueAdjustmentRed="15"
      crs:HueAdjustmentOrange="-10"
      crs:HueAdjustmentYellow="-35"
      crs:HueAdjustmentGreen="-60"
      crs:HueAdjustmentAqua="-20"
      crs:HueAdjustmentBlue="-15"
      crs:HueAdjustmentPurple="0"
      crs:HueAdjustmentMagenta="20"
      crs:SaturationAdjustmentRed="15"
      crs:SaturationAdjustmentOrange="-20"
      crs:SaturationAdjustmentYellow="-25"
      crs:SaturationAdjustmentGreen="-10"
      crs:SaturationAdjustmentAqua="25"
      crs:SaturationAdjustmentBlue="35"
      crs:SaturationAdjustmentPurple="20"
      crs:SaturationAdjustmentMagenta="20"
      crs:LuminanceAdjustmentRed="5"
      crs:LuminanceAdjustmentOrange="15"
      crs:LuminanceAdjustmentYellow="10"
      crs:LuminanceAdjustmentGreen="10"
      crs:LuminanceAdjustmentAqua="-10"
      crs:LuminanceAdjustmentBlue="-20"
      crs:LuminanceAdjustmentPurple="0"
      crs:LuminanceAdjustmentMagenta="0"
      crs:GrainAmount="30"
      crs:GrainSize="28"
      crs:GrainFrequency="55"
      crs:VignetteAmount="-10"
      crs:SharpenRadius="+1.0"
      crs:SharpenDetail="40"
      crs:SharpenEdgeMasking="40"
      crs:LuminanceSmoothing="10"
      crs:ColorNoiseReduction="20"
      crs:RedHue="20"
      crs:RedSaturation="10"
      crs:GreenHue="-15"
      crs:GreenSaturation="10"
      crs:BlueHue="-35"
      crs:BlueSaturation="35"
    />
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>
```

---

## 5. 구현 작업 목록

### 5.1 Backend — 변경 없음

서버 연동 없이 전부 Canvas/JS 처리. DB 마이그레이션 불필요.

### 5.2 Frontend

#### Phase 1 — 엔진 (useImageAdjustments.js)
- [ ] `DEFAULT_CALIBRATION` 상수 추가
- [ ] `applyCalibration(canvas, calibration)` 함수 구현
- [ ] `applyColorGrading` — `balance` 파라미터 반영
- [ ] `applyEffects` 파이프라인 — `applyCalibration` 삽입
- [ ] `exportToXMP(presetName, state)` 함수 구현

#### Phase 2 — 프리셋 (PresetManager.jsx)
- [ ] Y2K 필름 스냅 내장 프리셋 값 추가 (9번째)
- [ ] 프리셋에 `calibration` 필드 저장/복원
- [ ] XMP 내보내기 버튼 추가 (개별·전체)
- [ ] 프리셋 버전 v2 마이그레이션

#### Phase 3 — UI (ImageAdjustmentPanel.jsx)
- [ ] Camera Calibration 섹션 아코디언 추가
- [ ] Color Grading Balance 슬라이더 추가
- [ ] 섹션 순서 Lightroom 표준으로 재정렬

#### Phase 4 — 상태 (PhotoFormPage.jsx)
- [ ] `calibration` 상태 추가 (`useState({ ...DEFAULT_CALIBRATION })`)
- [ ] `applyEffects` 호출에 `calibration` 파라미터 전달
- [ ] 프리셋 적용 시 `setCalibration()` 호출 포함

---

## 6. 성능 고려사항

`applyCalibration`은 픽셀 루프 1회 추가이므로 Full HD(1920×1080) 기준 약 **+50~80ms** 예상.

최적화:
- HSL 변환을 `applyHSLAdjustments`와 통합하여 픽셀 루프 1회로 처리 가능 (Phase 2에서 검토)
- Calibration 변경 없을 때 (`red/green/blue` 모두 0) 함수 자체를 skip

---

## 7. QA 체크리스트

| 항목 | 검증 방법 |
|------|---------|
| Camera Calibration — Red Hue +20 | 빨간 영역 오렌지 방향 이동 확인 |
| Camera Calibration — Blue Sat +35 | 파란 영역 채도 극적 증가 확인 |
| Y2K 프리셋 단일 클릭 적용 | 전체 파라미터 즉시 반영 |
| XMP 내보내기 | .xmp 파일 다운로드 → Lightroom에서 임포트 확인 |
| Balance -10 | 그림자 Color Grading 영역 확장 확인 |
| 기존 JSON 프리셋 로드 | calibration 없는 구버전 — 기본값으로 폴백 |
| 전체 초기화 | calibration도 기본값 리셋 |
| 빌드 | `npm run build` 성공 |

---

## 8. 운영 DB 마이그레이션

없음 — 전부 프론트엔드 Canvas 처리.  
프리셋은 `localStorage`에 저장되며 서버 연동 없음.

---

## 9. 참고 자료

- Lightroom XMP 스펙: `http://ns.adobe.com/camera-raw-settings/1.0/`
- Camera Calibration 원리: 카메라 센서 색온도 보정 행렬 (DNG 스펙)
- Y2K 참고 감성: Y2K Editorial / 2000년대 초 디지털 카메라 + 플래시 스냅
