# 17 — 사진 이미지 확장성 & 텍스트/폰트 UI 설계

> 우선순위: P1  
> 관련 현황: `ImageEditorPage` (/editor) — OverlayPanel에 sans/serif/mono 3종만 지원  
> 목표: 작가가 포트폴리오 사진에 한국어·영문 타이포그래피를 풍성하게 적용할 수 있게 한다

---

## 1. 현황 분석

### 현재 이미지 에디터 OverlayPanel 한계

| 기능 | 현재 상태 | 개선 목표 |
|------|----------|----------|
| 폰트 종류 | 3종 (sans-serif·serif·monospace) | 30종 이상 (한국어 포함) |
| 폰트 스타일 | 없음 | Bold·Italic·Bold Italic |
| 글자 간격 | 없음 | Letter-spacing 조절 |
| 줄 간격 | 없음 | Line-height 조절 |
| 텍스트 정렬 | 없음 | Left·Center·Right |
| 배경박스 | 없음 | 텍스트 배경(반투명 박스) |
| 외곽선(Stroke) | 없음 | 텍스트 스트로크 색상·두께 |
| 텍스트 곡선 | 없음 | Curved Text (고급) |
| 위치 이동 | 9-grid 클릭만 | 드래그로 자유 이동 |
| 회전 | 없음 | 회전 핸들 |

### 사진 이미지 확장성 — 현재 지원 형식

| 항목 | 현재 | 목표 |
|------|------|------|
| 입력 형식 | JPG·PNG·WebP·GIF | + AVIF·HEIC(변환) |
| 비율 제약 | imageRatio 저장만 | 캔버스 크롭(자유·1:1·4:3·16:9·9:16·A4) |
| 해상도 출력 | 원본 크기 | 최대 4K 다운샘플링 옵션 |
| 프레임/테두리 | 없음 | 10종 프레임 프리셋 |
| 비교 뷰 | Before/After 슬라이더 | 상하/좌우 분할 선택 |

---

## 2. 유저 스토리

```
As a 사진작가,
  나는 포트폴리오 사진에 작가 서명·날짜·인용구를 예쁜 한국어 폰트로 넣고 싶다.
  (현재는 영문 기본 폰트 3종뿐이라 한국어가 깨지거나 촌스럽게 보임)

As a 웨딩 사진작가,
  나는 커플의 이름과 날짜를 스크립트 폰트로 사진 하단에 넣어 납품하고 싶다.

As a 상업 사진작가,
  나는 A4 비율로 자른 사진에 제품명을 굵은 산세리프로 넣어 클라이언트에 전달하고 싶다.
```

---

## 3. 수용 기준 (Acceptance Criteria)

### AC1 — 폰트 라이브러리 (한국어 포함)
- [ ] 최소 30종 폰트 선택 가능
- [ ] 한국어 폰트 그룹: Noto Sans KR·Noto Serif KR·Black Han Sans·Do Hyeon·Gowun Dodum·Sunflower
- [ ] 영문 폰트 그룹: Inter·Playfair Display·Dancing Script·Bebas Neue·Montserrat·Lora·Raleway·Pacifico
- [ ] 폰트 미리보기: 선택 드롭다운에서 해당 폰트로 "Aa 가나다" 표시
- [ ] 폰트 로딩: Google Fonts CDN에서 동적 `<link>` 삽입 (외부 npm 패키지 없이)

### AC2 — 텍스트 스타일 옵션
- [ ] Bold 토글 (`fontWeight: 700`)
- [ ] Italic 토글 (`fontStyle: italic`)
- [ ] Letter-spacing 슬라이더 (-5px ~ +20px)
- [ ] Line-height 슬라이더 (0.8 ~ 3.0)
- [ ] 텍스트 정렬 (L / C / R 버튼)
- [ ] 텍스트 배경 박스 토글 + 배경색·패딩 설정

### AC3 — 텍스트 위치 & 변형
- [ ] 캔버스 위에서 텍스트 드래그로 자유 이동
- [ ] 텍스트 회전 핸들 (드래그 회전, degree 표시)
- [ ] 스케일 핸들 (폰트 사이즈 직관적 조절)

### AC4 — 이미지 크롭 & 비율
- [ ] 자유 크롭, 1:1(인스타), 4:3, 16:9(유튜브), 9:16(세로), A4, 2:3(사진)
- [ ] 크롭 그리드 오버레이 (3×3 룰오브서드, 황금비율)
- [ ] 회전 정렬 (수평선 맞추기 슬라이더)

### AC5 — 프레임/테두리
- [ ] 없음 / 흰 테두리 / 검정 테두리 / 필름 프레임 / 폴라로이드 / 심플 라인
- [ ] 테두리 두께 슬라이더 (0~80px)

---

## 4. 기술 설계

### 4-1. 폰트 동적 로딩 (외부 npm 없이)

```javascript
// hooks/useGoogleFont.js
const FONT_URL_MAP = {
  'Noto Sans KR':    'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap',
  'Noto Serif KR':   'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap',
  'Black Han Sans':  'https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap',
  'Dancing Script':  'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap',
  'Playfair Display':'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap',
  // ...
};

export function loadGoogleFont(fontFamily) {
  if (document.querySelector(`link[data-font="${fontFamily}"]`)) return Promise.resolve();
  return new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_URL_MAP[fontFamily];
    link.dataset.font = fontFamily;
    link.onload = resolve;
    document.head.appendChild(link);
  });
}
```

### 4-2. Canvas 텍스트 렌더링 업그레이드

```javascript
// useImageAdjustments.js — drawOverlays() 확장
function drawTextOverlay(ctx, ov, canvasW, canvasH) {
  const x = ov.x * canvasW;
  const y = ov.y * canvasH;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((ov.rotation || 0) * Math.PI / 180);

  // 배경 박스
  if (ov.bgEnabled) {
    const metrics = ctx.measureText(ov.text);
    const pad = ov.bgPadding || 8;
    ctx.fillStyle = ov.bgColor || 'rgba(0,0,0,0.5)';
    ctx.fillRect(-metrics.width / 2 - pad, -ov.fontSize - pad, metrics.width + pad * 2, ov.fontSize + pad * 2);
  }

  // 스트로크
  if (ov.strokeWidth > 0) {
    ctx.strokeStyle = ov.strokeColor || '#000';
    ctx.lineWidth = ov.strokeWidth;
    ctx.strokeText(ov.text, 0, 0);
  }

  // 텍스트
  ctx.font = `${ov.italic ? 'italic ' : ''}${ov.bold ? '700' : '400'} ${ov.fontSize}px "${ov.fontFamily}"`;
  ctx.fillStyle = ov.color;
  ctx.globalAlpha = ov.opacity / 100;
  ctx.textAlign = ov.align || 'center';
  ctx.letterSpacing = `${ov.letterSpacing || 0}px`;

  // 멀티라인
  const lines = ov.text.split('\n');
  const lineH = ov.fontSize * (ov.lineHeight || 1.3);
  lines.forEach((line, i) => ctx.fillText(line, 0, i * lineH));

  ctx.restore();
}
```

### 4-3. 크롭 기능 (Canvas API)

```
CropPanel 신규 컴포넌트:
  - aspect ratio 선택 버튼 (자유·1:1·4:3·16:9·9:16·A4)
  - 캔버스 위에 반투명 오버레이 + 드래그 가능한 크롭 핸들
  - 크롭 확정 시 EditorContext에 cropRect 저장
  - ExportModal에서 cropRect 적용 후 export
```

### 4-4. 프레임 프리셋

| 프리셋 | 구현 방법 |
|--------|---------|
| 없음 | 기본 |
| 흰 테두리 | ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H); 이미지를 안쪽 영역에 drawImage |
| 필름 프레임 | 상하에 검정 바 + 퍼포레이션 원 패턴 |
| 폴라로이드 | 흰 배경 + 하단 여백 넓게 (60px) + 약간 회전 |
| 심플 라인 | ctx.strokeRect()로 내부 라인 |

---

## 5. UI 설계 — OverlayPanel 개선

### 폰트 선택 드롭다운 (검색 지원)

```
┌─────────────────────────────────────┐
│ 🔍 폰트 검색...                      │
├─────────────────────────────────────┤
│ [한국어]                             │
│  ■ Noto Sans KR    가나다 Abc       │  ← 해당 폰트로 미리보기
│  ■ Noto Serif KR   가나다 Abc       │
│  ■ Black Han Sans  가나다 Abc       │
│  ■ Do Hyeon        가나다 Abc       │
├─────────────────────────────────────┤
│ [영문 — Serif]                      │
│  ■ Playfair Display  Elegant Abc   │
│  ■ Lora              Classic Abc   │
├─────────────────────────────────────┤
│ [영문 — Script]                     │
│  ■ Dancing Script    Beautiful Abc │
│  ■ Pacifico          Fun Abc       │
└─────────────────────────────────────┘
```

### 텍스트 옵션 패널 레이아웃

```
[크기: 48px ────────────●───]
[자간: 0px  ──●──────────── ]
[줄간: 1.3  ─────●───────── ]

[B] [I] [U]   [≡ ≡ ≡]   (Bold, Italic, Underline | L·C·R)

[색상] ● ● ● ● ● ● ● + (커스텀)
[스트로크] 두께: 0  색: ●

[배경 박스 ON/OFF]
  색: ●  패딩: 8px  불투명도: 50%

[그림자 ON/OFF]
[회전: 0°  ──●──────]
```

---

## 6. claude.ai 아티팩트 요청 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템 (다크 테마 기준 — 에디터는 다크):
  primary:       '#5b6ef5'
  darkBg:        '#0a0a18'
  darkSurface:   '#12122a'
  darkElevated:  '#1e1e3a'
  darkBorder:    '#2a2a50'
  darkText:      '#e8e8f0'
  darkTextSub:   '#8080b0'
  darkTextHint:  '#4a4a70'
  danger:        '#e53e3e'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트

[컴포넌트 요청]
이미지 에디터의 텍스트/폰트 오버레이 패널(OverlayPanel)을 고도화해줘.

props/state 가정:
- selected: { text, fontFamily, fontSize, bold, italic, align, letterSpacing,
              lineHeight, color, opacity, strokeWidth, strokeColor,
              bgEnabled, bgColor, bgPadding, rotation, shadow }
- onUpdate(patch): 상태 업데이트 콜백
- fontGroups: [
    { label: '한국어', fonts: ['Noto Sans KR', 'Noto Serif KR', 'Black Han Sans', 'Do Hyeon', 'Sunflower'] },
    { label: '영문 Serif', fonts: ['Playfair Display', 'Lora', 'Georgia'] },
    { label: '영문 Script', fonts: ['Dancing Script', 'Pacifico', 'Great Vibes'] },
    { label: '영문 Sans', fonts: ['Inter', 'Montserrat', 'Bebas Neue', 'Raleway'] },
  ]

UI 구성 (스크롤 가능한 패널, 다크 테마):
1. 폰트 선택 드롭다운:
   - 현재 선택 폰트명 표시 버튼 (클릭 시 드롭다운 오픈)
   - 그룹 헤더 + 각 폰트를 해당 폰트 패밀리로 렌더링
   - 검색 인풋 (그룹명/폰트명 필터)

2. 텍스트 스타일 버튼 행:
   - [B] Bold, [I] Italic (각각 토글)
   - [≡][≡][≡] 텍스트 정렬 Left·Center·Right

3. 슬라이더 행:
   - 크기 12~200px
   - 자간(letter-spacing) -5~20
   - 줄간(line-height) 0.8~3.0
   - 회전 -180~180°

4. 색상 팔레트:
   - 8개 스와치 + 커스텀 color input

5. 스트로크(외곽선):
   - ON/OFF 토글
   - 두께 1~10px 슬라이더
   - 색상 스와치

6. 배경 박스:
   - ON/OFF 토글
   - 색상·불투명도·패딩 설정

7. 그림자 ON/OFF 토글

각 섹션은 아코디언으로 접힘 (기본: 폰트·스타일 열림, 나머지 닫힘)
```

---

## 7. 트레이드오프

| 방안 | 장점 | 단점 |
|------|------|------|
| Google Fonts CDN 동적 로딩 | 무료·다양·한국어 지원 | 네트워크 필요, 첫 로딩 지연 (~200ms) |
| 시스템 폰트만 사용 | 즉시 렌더링 | 한국어 아름다운 폰트 부족 |
| 폰트 파일 번들 | 오프라인 작동 | 번들 크기 +50MB 이상 |

**결정: Google Fonts CDN 동적 로딩** — 사용자가 선택 시 `<link>` 태그 동적 삽입, 중복 방지 캐싱

---

## 8. 다음 단계 로드맵

1. **Phase 1** — 폰트 드롭다운 + Bold/Italic/정렬 (2일)
2. **Phase 2** — Letter-spacing/Line-height/회전 슬라이더 (1일)
3. **Phase 3** — 스트로크/배경박스 (1일)
4. **Phase 4** — 크롭 기능 (3일)
5. **Phase 5** — 프레임 프리셋 (2일)
