# 24 — 사진 정렬 알고리즘 재설계 기획서

> 작성일: 2026-06-20  
> 우선순위: P0 (레이아웃 품질 직결)  
> 담당: PM + Senior Dev + UX

---

## 1. 배경 & 문제 정의

### 1.1 현재 상태

현재 Happiness 앱의 갤러리 레이아웃은 두 가지 독립된 메커니즘으로 운영된다:

| 구분 | 현재 방식 | 문제 |
|------|---------|------|
| **표시 순서** | `displayOrder` 컬럼 + 드래그&드롭 저장 | 관리 UI가 어드민 전용으로 격리되어 작가 직접 제어 불가 |
| **갤러리 레이아웃** | `packRows()` — `gridColSpan` 합이 12 될 때까지 행에 채움 | 비율 고려 없음, 임의 span 값에 의존 |

**`packRows()` 핵심 문제:**
```javascript
// 현재 알고리즘 — 단순 bin-packing
function packRows(photos) {
  let used = 0;
  for (const photo of photos) {
    const span = photo.gridColSpan || 6; // 기본값 6 (절반)
    if (used + span > 12 && row.length > 0) { /* 새 행 */ }
    // ← 이미지 실제 비율(aspect ratio) 완전 무시
  }
}
```

- 세로 사진(portrait)과 가로 사진(landscape)이 같은 `gridColSpan=6`이면 동일 너비로 렌더링 → **시각적 불균형**
- 한 행에 portrait 2장이 들어오면 세로가 매우 길어져 레이아웃이 무너짐
- `gridColSpan`을 사진 등록 시 수동 입력해야 하는 불편함

### 1.2 레퍼런스 분석

| 사이트 | 레이아웃 방식 | 정렬 방식 | 핵심 차별점 |
|--------|------------|---------|-----------|
| **Flickr / Google Photos** | Justified Row Layout | 날짜 그룹 + 스마트 타임라인 | 모든 사진이 동일 행 높이, 너비가 비율에 맞게 자동 계산 |
| **500px** | Justified Row | 인기도 점수(Pulse) 기반 자동 정렬 | 좋아요·조회수·보정 품질 복합 점수 |
| **Behance** | 고정 그리드 + 자유 배치 | 프로젝트 단위 큐레이션 | 작가가 프로젝트 표지 이미지 직접 선택 |
| **SmugMug** | Masonry / Justified 선택 | 수동 드래그 + 스마트 정렬 | 클라이언트 납품용 갤러리, 즐겨찾기 핀 기능 |
| **Format.com** | Justified / Grid / Masonry | 수동 드래그 우선 + 자동 정렬 fallback | 포트폴리오 특화, 시리즈별 레이아웃 독립 설정 |
| **VSCO** | 정사각형 균일 그리드 | 업로드 순 + 핀(feature) 고정 | 미니멀 일관성, 색감 흐름 중시 |
| **Cargo Collective** | 완전 자유 배치 | 수동 절대 좌표 | 아티스트 특화, 퍼즐 레이아웃 |

### 1.3 핵심 인사이트

> **전문 포트폴리오 사이트의 공통점:**
> 1. 이미지 원본 비율(aspect ratio)을 기반으로 레이아웃을 **자동 계산**한다
> 2. 작가는 **순서(order)** 만 제어하고, **크기(size)** 는 알고리즘이 결정한다
> 3. 단일 레이아웃이 아닌 **복수 레이아웃 모드** 제공 (Justified / Masonry / Grid)

---

## 2. 목표 & 범위

### 2.1 목표 (OKR)

**Objective:** 갤러리가 전문 포트폴리오 수준의 시각적 완성도를 갖춘다

**Key Results:**
- KR1: Justified Row Layout 구현 → 행 높이 편차 ≤ 5% 이내
- KR2: 작가가 드래그 없이 스마트 자동 정렬 1-클릭으로 갤러리 정돈
- KR3: 3가지 레이아웃 모드 (Justified / Masonry / Grid) 전환 가능

### 2.2 범위 (In Scope)

- [x] Justified Row Layout 알고리즘 (`justifyRows()`) 구현
- [x] `gridColSpan` → 실제 aspect ratio 기반 자동 계산으로 대체
- [x] 사진 정렬 전략 선택 UI (날짜순 / 인기순 / 색감순 / 수동순)
- [x] 작가용 갤러리 내 인라인 정렬 컨트롤 (본인 갤러리 한정)
- [x] 백엔드 `displayOrder` 배치 저장 API 개선

### 2.3 범위 외 (Out of Scope)

- [ ] AI 기반 미적 점수 계산 (Phase 후속)
- [ ] 완전 자유 좌표 배치 (Cargo 스타일)
- [ ] 사진별 수동 크기 조정 핸들

---

## 3. 기능 요구사항

### 3.1 레이아웃 엔진 — Justified Row Layout

**알고리즘 목표:** 모든 행의 높이를 목표값(targetRowHeight)으로 맞추고, 사진 너비를 aspect ratio에 비례해 자동 배분한다.

```
입력: photos[] (각 photo에 width, height 메타데이터 포함)
출력: rows[] — 각 row는 { photos[], rowHeight, photoWidths[] }
```

**알고리즘 상세 (Justified Layout):**

```
1. 각 사진의 aspectRatio = width / height 계산
2. 행에 사진 추가 시 해당 행 너비 합산:
     rowWidth = Σ(aspectRatio_i × targetRowHeight) + gap × (n-1)
3. rowWidth ≥ containerWidth 되는 순간 행 확정:
     scale = (containerWidth - gaps) / Σ(aspectRatio_i)
     실제 rowHeight = scale
     각 사진 실제 width = aspectRatio_i × scale
4. 마지막 행(photos 수 부족): 
     최대 높이 targetRowHeight으로 고정 (늘이지 않음)
     나머지 공간은 빈 공간 (좌측 정렬)
```

**구현 파라미터:**

| 파라미터 | 기본값 | 설명 |
|---------|------|------|
| `targetRowHeight` | 300px | 목표 행 높이 |
| `minRowHeight` | 150px | 최소 허용 행 높이 (너무 좁아지지 않도록) |
| `maxRowHeight` | 500px | 최대 허용 행 높이 (마지막 행 특히) |
| `gap` | 8px | 사진 사이 간격 |
| `containerWidth` | 동적 | ResizeObserver로 감지 |

### 3.2 Masonry Layout (기존 유지 + 개선)

현재 `GalleryPage`의 CSS columns 방식을 **가상 열 높이 추적** 방식으로 개선한다:

```
1. N개 열 높이 배열 초기화: colHeights = [0, 0, ..., 0]
2. 각 사진을 현재 가장 짧은 열에 배치
3. 해당 열 높이 += 사진 높이(비율 기반) + gap
→ 열 균형이 최대한 맞도록 자동 배치
```

### 3.3 Grid Layout (균일 정사각형)

- 컨테이너 너비를 N등분 (기본 N=3, 모바일 N=2)
- 각 셀은 1:1 비율, `object-fit: cover` 크롭
- VSCO 스타일의 깔끔한 일관성

### 3.4 레이아웃 모드 전환 UI

**위치:** GalleryPage / PortfolioPage 우측 상단 컨트롤 바

```
[ ▦ Justified ]  [ ▣ Masonry ]  [ ⊞ Grid ]      ← 3-버튼 토글
                                                    (로그인 유저는 localStorage 저장)
```

**뷰어(방문객):** 작가가 설정한 기본 레이아웃으로 표시

### 3.5 정렬 전략 — 4가지 모드

| 모드 | 설명 | 우선순위 |
|------|------|--------|
| **수동 순서** (Manual) | `displayOrder` 기반, 작가가 설정한 순서 | 최우선 (default) |
| **최신순** (Recent) | `createdAt DESC` | 수동 순서 없을 때 기본 |
| **인기순** (Popular) | `likesCount + savesCount * 0.5` 가중 점수 DESC | 탐색 페이지 기본 |
| **색감순** (Color Flow) | 대표 색상(HSL) 유사도로 클러스터링 후 색상환 순 정렬 | 포트폴리오 특화 |

**색감 정렬 상세:**
```
1. 각 사진의 colorMood → HSL Hue 매핑 테이블
   WARM_RED → 0°, ORANGE → 30°, GOLDEN → 45°,
   GREEN → 120°, COOL_BLUE → 210°, PURPLE → 270°, MONO → -1 (마지막)
2. Hue 오름차순 정렬 → 색상환을 따라 자연스럽게 흘러가는 갤러리
3. MONO(흑백)는 항상 끝에 배치
```

### 3.6 작가 갤러리 내 인라인 정렬 컨트롤

**조건:** 로그인 유저 = 갤러리 소유자

**UI:**
```
[내 갤러리] 상단 툴바 (소유자만 노출)
┌─────────────────────────────────────────────────────────────┐
│ ✏️ 정렬 편집  [📅 최신순] [❤️ 인기순] [🎨 색감순] [⠿ 수동]  │
│                                          [💾 저장] [↩ 취소]  │
└─────────────────────────────────────────────────────────────┘

- "수동" 선택 시 → 드래그 핸들 노출 (현재 PhotoSortPage 기능 인라인 통합)
- 자동 정렬 선택 후 "저장" → displayOrder 일괄 업데이트 API 호출
- 미저장 변경 시 페이지 이탈 경고
```

---

## 4. 기술 설계

### 4.1 프론트엔드 — `useGalleryLayout` 훅

```javascript
// hooks/useGalleryLayout.js
export function useGalleryLayout(photos, options = {}) {
  const {
    mode = 'justified',        // 'justified' | 'masonry' | 'grid'
    targetRowHeight = 300,
    columns = 3,               // masonry/grid 열 수
    gap = 8,
    containerRef,              // ResizeObserver 대상
  } = options;

  const [containerWidth, setContainerWidth] = useState(0);
  const [layout, setLayout] = useState([]);

  useEffect(() => {
    // ResizeObserver로 컨테이너 너비 감지
  }, [containerRef]);

  useEffect(() => {
    if (mode === 'justified') {
      setLayout(computeJustifiedLayout(photos, containerWidth, targetRowHeight, gap));
    } else if (mode === 'masonry') {
      setLayout(computeMasonryLayout(photos, columns, gap));
    } else {
      setLayout(computeGridLayout(photos, columns));
    }
  }, [photos, mode, containerWidth, columns, gap, targetRowHeight]);

  return layout;
}
```

### 4.2 Justified Layout 핵심 함수

```javascript
// utils/layoutAlgorithms.js

export function computeJustifiedLayout(photos, containerWidth, targetRowHeight, gap) {
  const rows = [];
  let currentRow = [];
  let currentAspectSum = 0;

  for (const photo of photos) {
    const ar = photo.width && photo.height
      ? photo.width / photo.height
      : 4 / 3; // 기본값: 4:3

    currentRow.push({ ...photo, ar });
    currentAspectSum += ar;

    const rowGaps = (currentRow.length - 1) * gap;
    const rowWidth = currentAspectSum * targetRowHeight + rowGaps;

    if (rowWidth >= containerWidth) {
      // 행 확정
      const scale = (containerWidth - rowGaps) / currentAspectSum;
      const rowHeight = Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, scale));

      rows.push({
        photos: currentRow.map(p => ({
          ...p,
          displayWidth: p.ar * rowHeight,
          displayHeight: rowHeight,
        })),
        rowHeight,
      });

      currentRow = [];
      currentAspectSum = 0;
    }
  }

  // 마지막 행 처리 (좌측 정렬, 최대 높이)
  if (currentRow.length > 0) {
    const rowGaps = (currentRow.length - 1) * gap;
    const scale = Math.min(
      targetRowHeight,
      (containerWidth - rowGaps) / currentAspectSum
    );
    rows.push({
      photos: currentRow.map(p => ({
        ...p,
        displayWidth: p.ar * scale,
        displayHeight: scale,
      })),
      rowHeight: scale,
      isLastRow: true,
    });
  }

  return rows;
}
```

### 4.3 이미지 메타데이터 — width/height 확보 전략

**문제:** 기존 사진 데이터에 `width`, `height` 없음

**해결 방안 (단계적):**

**Phase A — 프론트엔드 onLoad 방식 (즉시 적용 가능):**
```javascript
// PhotoCard 로드 시 자연 비율 읽기
<img
  onLoad={(e) => {
    const ar = e.target.naturalWidth / e.target.naturalHeight;
    updatePhotoAspectRatio(photo.id, ar); // 로컬 상태 업데이트
  }}
/>
// → 첫 로드 시 한 번 레이아웃 재계산 (깜빡임 있음)
```

**Phase B — 백엔드 메타데이터 저장 (근본 해결):**
```java
// Photo 엔티티에 추가
@Column(nullable = true)
private Integer imageWidth;

@Column(nullable = true)
private Integer imageHeight;
```
```
업로드 시 → BufferedImage로 실제 크기 읽어 저장
기존 사진 → 배치 마이그레이션 (Supabase Storage URL에서 HEAD 요청 또는 다운로드)
```

**Phase A를 먼저 구현, Phase B는 운영 안정화 후 진행**

### 4.4 정렬 전략 — 색감순 구현

```javascript
// utils/sortStrategies.js

const HUE_MAP = {
  WARM_RED: 0, ORANGE: 30, GOLDEN: 45,
  YELLOW: 60, GREEN: 120, TEAL: 180,
  COOL_BLUE: 210, PURPLE: 270, PINK: 330,
  MONO: 9999, // 마지막
};

export function sortByColorFlow(photos) {
  return [...photos].sort((a, b) => {
    const hA = HUE_MAP[a.colorMood] ?? 360;
    const hB = HUE_MAP[b.colorMood] ?? 360;
    return hA - hB;
  });
}
```

### 4.5 백엔드 — `displayOrder` 배치 저장 개선

**현재 문제:** 단건 save() 반복 → N번 DB 쓰기

**개선:** JPQL 벌크 업데이트

```java
// PhotoRepository.java
@Modifying
@Query("UPDATE Photo p SET p.displayOrder = :order WHERE p.id = :id AND p.member.id = :memberId")
void updateDisplayOrder(@Param("id") Long id,
                        @Param("order") Integer order,
                        @Param("memberId") Long memberId);
```

```java
// PhotoController.java — reorderPhotos 개선
@Transactional
@PutMapping("/reorder")
public ResponseEntity<?> reorderPhotos(
    @AuthenticationPrincipal UserDetails userDetails,
    @RequestBody @Valid List<PhotoReorderRequest> orders) {

  Long memberId = getMemberId(userDetails);
  for (PhotoReorderRequest req : orders) {
    photoRepository.updateDisplayOrder(req.getId(), req.getDisplayOrder(), memberId);
    // IDOR 방지: memberId 조건으로 타인 사진 수정 차단
  }
  return ResponseEntity.ok(Map.of("status", "success"));
}
```

**IDOR 보안 수정 포인트:** 현재 `reorderPhotos`는 `memberId` 검증 없이 어떤 photo ID도 수정 가능 → **반드시 수정 필요**

---

## 5. UX 플로우

### 5.1 방문객 — 갤러리 조회

```
방문객 → /portfolio/:profileName
  → PortfolioPage 로드
  → 기본 레이아웃: 작가 설정값 (portfolioLayout 컬럼 활용)
  → 레이아웃 토글 버튼으로 자유롭게 전환 (preference는 localStorage)
  → 사진 표시 순서: displayOrder ASC NULLS LAST, createdAt DESC
```

### 5.2 작가 — 갤러리 정렬 관리

```
작가 로그인 → 내 갤러리(/gallery 또는 /profile)
  → 상단 "정렬 편집" 버튼 클릭
  → 정렬 전략 선택:
      [📅 최신순] → 즉시 미리보기
      [❤️ 인기순] → 즉시 미리보기
      [🎨 색감순] → 즉시 미리보기
      [⠿ 수동] → 드래그 핸들 활성화
  → [💾 저장] 클릭 → PUT /api/photos/reorder (일괄)
  → 완료 토스트: "✓ 정렬이 저장되었습니다"
```

### 5.3 레이아웃 모드 전환 (실시간)

```
레이아웃 버튼 클릭
  → mode 상태 변경
  → useGalleryLayout 재계산 (동기)
  → CSS transition으로 부드럽게 재배치 (opacity fade)
  → 선택값 localStorage 저장
```

---

## 6. 마이그레이션 계획

### 6.1 `gridColSpan` 제거 계획

현재 `gridColSpan`은 Photo 엔티티에 `@Column(nullable=true)`로 존재.
Justified Layout 도입 후 `gridColSpan`은 **레이아웃 엔진에서 더 이상 사용하지 않는다**.
단, 기존 데이터 호환을 위해 컬럼은 유지하되 UI에서 노출하지 않는다.

```
Phase A: gridColSpan 입력 필드를 PhotoForm에서 숨김 (새 등록부터 미사용)
Phase B: 3개월 후 컬럼 제거 마이그레이션
```

### 6.2 width/height 메타데이터 추가

```sql
-- 운영 DB 마이그레이션 (IF NOT EXISTS 멱등성 보장)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS image_width  INTEGER;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS image_height INTEGER;
```

---

## 7. 구현 우선순위

### Sprint 1 (즉시)
| 작업 | 파일 | 예상 시간 |
|------|------|--------|
| `computeJustifiedLayout()` 알고리즘 | `frontend/src/utils/layoutAlgorithms.js` (신규) | 3h |
| `useGalleryLayout` 훅 | `frontend/src/hooks/useGalleryLayout.js` (신규) | 2h |
| GalleryPage Justified Layout 적용 | `frontend/src/pages/GalleryPage.jsx` | 2h |
| PortfolioPage Justified Layout 적용 | `frontend/src/pages/PortfolioPage.jsx` | 1h |

### Sprint 2 (단기)
| 작업 | 파일 | 예상 시간 |
|------|------|--------|
| 레이아웃 모드 토글 UI (3종) | GalleryPage + PortfolioPage | 2h |
| 색감순 정렬 구현 | `utils/sortStrategies.js` (신규) | 1h |
| 작가 인라인 정렬 컨트롤 바 | GalleryPage | 3h |
| `reorderPhotos` IDOR 보안 수정 | `PhotoController.java` | 1h |

### Sprint 3 (중기)
| 작업 | 파일 | 예상 시간 |
|------|------|--------|
| `image_width/height` 백엔드 저장 | `Photo.java`, `PhotoController.java` | 2h |
| 배치 displayOrder 저장 개선 (JPQL) | `PhotoRepository.java` | 1h |
| 모바일 packRows → Justified 교체 | `mobile/screens/GalleryScreen.js` | 3h |

---

## 8. 수용 기준 (Acceptance Criteria)

### AC1 — Justified Layout 정확도
- [ ] 동일 행의 모든 사진이 같은 높이로 렌더링된다 (± 1px 오차 허용)
- [ ] 행 높이가 150px ~ 500px 범위 내에 있다
- [ ] 마지막 행 사진이 늘어나지 않고 좌측 정렬된다

### AC2 — 레이아웃 모드 전환
- [ ] Justified / Masonry / Grid 3종 모드 전환 시 레이아웃이 즉시 변경된다
- [ ] 선택한 레이아웃 모드가 새로고침 후에도 유지된다 (localStorage)

### AC3 — 정렬 전략
- [ ] 최신순 / 인기순 / 색감순 / 수동 4가지 전략이 작동한다
- [ ] 색감순 정렬 시 colorMood가 없는 사진은 맨 끝에 배치된다
- [ ] 수동 모드 전환 시 드래그 핸들이 노출된다

### AC4 — 보안
- [ ] `PUT /api/photos/reorder`에서 타인 사진 ID를 포함하면 해당 항목만 무시된다 (403 또는 skip)
- [ ] memberId 검증이 서버 사이드에서 이루어진다

### AC5 — 성능
- [ ] 100장 사진 기준 Justified Layout 계산 시간 ≤ 5ms (동기 JS)
- [ ] 레이아웃 재계산이 scroll event가 아닌 resize event에서만 트리거된다

---

## 9. 클로드 아티팩트 요청 프롬프트

아래 프롬프트를 claude.ai에서 사용해 UI 목업을 생성한다:

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary:       '#5b6ef5'
  primaryDark:   '#4458e0'
  primaryLight:  '#eef0ff'
  accent:        '#a78bfa'
  bg:            '#f7f7fb'
  surface:       '#ffffff'
  surfaceDim:    '#ededf4'
  border:        '#e5e5ed'
  text:          '#0f0f1a'
  textSecondary: '#5555aa'
  textMuted:     '#8888bb'
  danger:        '#e53e3e'
  success:       '#22c55e'
  darkBg:        '#0a0a18'
  darkSurface:   '#12122a'
  darkBorder:    '#2a2a50'
  darkText:      '#e8e8f0'
  darkTextSub:   '#8080b0'
  galleryBg:     '#0e0e0e'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트

[요청]
GalleryPage 컴포넌트를 재설계해주세요. 다음 기능을 포함합니다:

1. **레이아웃 모드 토글 (우측 상단)**
   - ▦ Justified (기본) / ▣ Masonry / ⊞ Grid
   - 선택된 버튼은 primary 색상, 나머지는 회색

2. **정렬 전략 드롭다운 (우측 상단)**
   - 📅 최신순 / ❤️ 인기순 / 🎨 색감순 / ⠿ 수동순

3. **소유자 전용 인라인 정렬 툴바**
   - "✏️ 정렬 편집" 버튼 클릭 → 툴바 노출
   - 자동 정렬 전략 선택 + "💾 저장" / "↩ 취소" 버튼
   - 수동 선택 시 사진 카드에 드래그 핸들(⠿) 노출

4. **Justified Layout 렌더링**
   - 각 row는 flexbox로 렌더링
   - 사진 높이는 rowHeight (고정), 너비는 비율에 따라 가변
   - 행 사이 gap: 8px, 사진 사이 gap: 8px

5. **사진 카드**
   - 이미지 + hover 시 반투명 오버레이 (제목, 좋아요 수)
   - 드래그 모드일 때 ⠿ 핸들 노출, cursor: grab

더미 데이터로 5~8장 사진이 표시되는 완전한 목업을 만들어주세요.
photos 배열은 { id, title, url, width, height, colorMood, likesCount } 형태입니다.
```

---

## 10. 리스크 & 대응

| 리스크 | 가능성 | 대응 |
|--------|-------|------|
| 기존 사진 `width/height` 없어 초기 AR = 4:3 기본값 적용 | 높음 | onLoad로 실측 후 재계산, UX는 첫 로드 시 한 번만 재배치 |
| 마지막 행 사진이 너무 크거나 작음 | 중간 | `maxRowHeight` 제한 + 좌측 정렬로 안전 처리 |
| 모바일에서 containerWidth 감지 지연 | 중간 | 초기 렌더 시 `window.innerWidth` fallback |
| `reorderPhotos` IDOR — 타인 사진 수정 가능 (현재 버그) | 높음 | Sprint 2에서 즉시 수정 (memberId 검증 추가) |
| 색감순 정렬 시 colorMood 없는 사진 처리 | 낮음 | 기본값으로 360° (무채색 계열 끝에 배치) |

---

## 11. 변경 파일 목록 (예상)

### 신규 생성
- `frontend/src/utils/layoutAlgorithms.js` — Justified/Masonry/Grid 계산 함수
- `frontend/src/utils/sortStrategies.js` — 4가지 정렬 전략
- `frontend/src/hooks/useGalleryLayout.js` — 레이아웃 훅

### 수정
- `frontend/src/pages/GalleryPage.jsx` — packRows 제거, 새 레이아웃 적용
- `frontend/src/pages/PortfolioPage.jsx` — Justified Layout 적용
- `frontend/src/pages/PhotoSortPage.jsx` — 인라인 통합 후 deprecated
- `backend/src/main/java/.../PhotoController.java` — IDOR 수정, 배치 저장 개선
- `backend/src/main/java/.../PhotoRepository.java` — JPQL 벌크 업데이트 추가
- `backend/src/main/java/.../Photo.java` — `imageWidth`, `imageHeight` 추가

### DB 마이그레이션
```sql
ALTER TABLE photos ADD COLUMN IF NOT EXISTS image_width  INTEGER;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS image_height INTEGER;
```
