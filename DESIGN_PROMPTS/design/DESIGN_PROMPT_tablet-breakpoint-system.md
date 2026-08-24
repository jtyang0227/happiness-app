# DESIGN_PROMPT — 태블릿 브레이크포인트 시스템 통일

> Feature: Tablet Breakpoint System | 2026-08-24 | AKIRA Neo-Tokyo × Cosmos Light

연관 문서:
- `PLANNING_multiplatform-uiux-improvement.md` — 기획 기반 (아이패드/태블릿 섹션, AC-T1~T4)
- `DESIGN_PROMPT_cosmos-light-theme.md` — GalleryPage 마소닉 그리드 원본 스펙
- `DESIGN_PROMPT_web-cosmos-completion.md` — 웹 2차 완성 (같은 라운드 산출물)

---

## 시스템 컨텍스트

```
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템 (AKIRA Neo-Tokyo 액센트):
  primary:       '#E8121A'
  primaryDark:   '#A80D14'
  accent:        '#22D3EE'
  bg:            '#f5f5fa'
  surface:       '#ffffff'
  border:        '#e2e2ee'
  text:          '#1a1a2e'
  textSecondary: '#5c5c7a'
  textMuted:     '#9090b0'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용 (미디어쿼리는 <style> 태그 내 CSS 문자열로 주입하는 기존 패턴 유지 — GalleryPage.jsx의 .gallery-masonry 방식 참고)
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
```

---

## 진단 요약 (코드 검증 결과)

| 파일 | 현재 브레이크포인트 | 문제 |
|------|---------------------|------|
| `GalleryPage.jsx` (`.gallery-masonry`) | `columns:4` → `@media(max-width:600px){columns:2}` | 600~1280px 전체 구간이 4컬럼 — 아이패드(768~1024px)에서 컬럼 폭이 좁아짐 |
| `PhotoDetailPage.jsx` | `window.innerWidth < 768` (`isMobile`) | 768px 미만만 모바일 취급 — 태블릿은 전부 데스크탑 2분할(58/42) 레이아웃 |
| `Header.jsx` | `@media (min-width: 768px)` | 768px 정확히 경계 — 아이패드 미니 세로/가로 회전 시 767↔1024px 사이에서 BottomNav↔PC헤더 전환 없이 그대로 PC헤더 유지 (실측: 아이패드 미니 세로 768px은 이미 PC 헤더 구간) |
| 전체 프로젝트 | 600, 640, 768, 900, 1024px 등 파일마다 하드코딩 | 통일된 상수 없음 — 유지보수 시 개별 파일 수정 필요 |

> **디자이너 판단**: 기획서(AC-T4)는 Header 태블릿 처리를 "결정 필요"로 남겨두었다. 검토 결과 **Header는 현행 768px 이분법 유지**를 권장한다 — 이미 BottomNav가 플로팅 필 스타일로 완성되어 있고, 768~1024px 구간에 슬림 헤더를 새로 만드는 것은 이번 라운드의 P1 범위를 벗어나는 별도 컴포넌트 작업이기 때문이다. 대신 GalleryPage 3컬럼 구간과 브레이크포인트 상수 파일 2가지에 P1 역량을 집중한다.

---

## 1. `constants/breakpoints.js` — 신규 상수 파일

### 1-1 파일 스펙

```javascript
// frontend/src/constants/breakpoints.js
export const BP = {
  sm: 480,   // 소형 모바일
  md: 768,   // 모바일/태블릿 경계 (기존 코드 관행과 일치)
  lg: 1024,  // 태블릿/데스크탑 경계 (신규)
  xl: 1280,  // 데스크탑 콘텐츠 maxWidth
};

// <style> 태그 내 CSS 문자열 주입 시 사용할 미디어쿼리 헬퍼
export const mq = {
  mobile: `@media (max-width: ${BP.md - 1}px)`,
  tablet: `@media (min-width: ${BP.md}px) and (max-width: ${BP.lg - 1}px)`,
  desktop: `@media (min-width: ${BP.lg}px)`,
  upToTablet: `@media (max-width: ${BP.lg - 1}px)`,
};
```

이 프로젝트는 CSS-in-JS가 없어 미디어쿼리를 `<style>{`...`}</style>` 문자열 주입으로 처리한다(GalleryPage.jsx 기존 패턴). `mq` 헬퍼는 이 문자열을 조립할 때 매직넘버 대신 템플릿 리터럴로 꽂아 넣는 용도다.

```javascript
// 사용 예 (GalleryPage.jsx)
import { BP, mq } from '../constants/breakpoints';
// ...
<style>{`
  .gallery-masonry{columns:4 200px}
  ${mq.tablet}{.gallery-masonry{columns:3}}
  ${mq.mobile}{.gallery-masonry{columns:2}}
`}</style>
```

### 1-2 마이그레이션 원칙

- **신규 코드**: 반드시 `BP`/`mq` 참조. 숫자 하드코딩 금지.
- **기존 코드**: 이번 라운드에서는 GalleryPage(P0)만 즉시 교체. 나머지 파일(Header, PhotoDetailPage, ExplorePage 등)은 다음에 그 파일을 만질 때 점진적으로 `BP` 참조로 교체(강제 일괄 리팩토링은 회귀 위험 대비 P2로 유보 — 기획서 방침과 일치).

---

## 2. GalleryPage — 태블릿 3컬럼 구간 추가

### 2-1 와이어프레임

```
[1280px 데스크탑]        [820px 아이패드 Air]       [768px 아이패드 미니 세로]   [<600px 모바일]
┌─┬─┬─┬─┐                ┌──┬──┬──┐                 ┌──┬──┬──┐                  ┌────┬────┐
│ │ │ │ │  4컬럼          │  │  │  │  3컬럼           │  │  │  │  3컬럼            │    │    │  2컬럼
├─┼─┼─┼─┤   columns:4     ├──┼──┼──┤   columns:3      ├──┼──┼──┤   columns:3       ├────┼────┤
│ │ │ │ │  각 ~300px     │  │  │  │  각 ~260px       │  │  │  │  각 ~245px        │        │  각 ~half
└─┴─┴─┴─┘                └──┴──┴──┘                 └──┴──┴──┘                  └────┴────┘
   ≥1024px                 768~1023px                  768px 경계                  <768px
```

현재는 768px과 1024px 사이 전 구간이 "4컬럼(≥600px)"로 뭉뚱그려져 있어, 아이패드 세로(768px)~아이패드 가로(1024px) 사이에서 컬럼 폭이 데스크탑 설계 대비 좁게 나온다. 3컬럼 구간을 추가해 이미지 감상 폭을 확보한다.

### 2-2 컴포넌트 스펙

```javascript
// GalleryPage.jsx — 3곳의 <style> 블록(274, 319, 335번 라인) 모두 동일하게 교체
import { mq } from '../constants/breakpoints';

// 변경 전
`.gallery-masonry{columns:4 200px}@media(max-width:600px){.gallery-masonry{columns:2}}`

// 변경 후
`.gallery-masonry{columns:4 200px}
 ${mq.tablet}{.gallery-masonry{columns:3 200px}}
 @media(max-width:600px){.gallery-masonry{columns:2}}`
```

- `200px`는 `columns` 축약 문법의 최소 컬럼 너비 힌트(브라우저가 컬럼 수를 자동 축소하는 하한선)로 기존 값 유지 — 컬럼 수 지정이 이 힌트보다 우선 적용되므로 시각적 차이 없음.
- 3개 중복 `<style>` 블록은 로딩/에러/정상 상태별로 분기된 렌더 경로에 각각 존재하는 기존 구조이므로 3곳 모두 동일하게 수정해야 한다(하나만 고치면 로딩 스켈레톤과 실제 그리드의 컬럼 수가 어긋남).

### 2-3 여백 미세 조정 (선택, P2)

820px 폭에서 3컬럼 각 ~260px는 여유가 있으나, 최소 실측폭인 768px 정확히 그 경계에서는 컬럼 갭(gap) 값에 따라 245px까지 좁아질 수 있다. 현재 `.gallery-masonry`의 `column-gap` 값이 명시적으로 지정되어 있지 않다면(브라우저 기본값 1em ≈ 16px) 태블릿 구간에서 `column-gap: 12px`로 살짝 좁혀 컬럼당 실사용 폭을 늘리는 것도 고려할 수 있다 — 단 이는 시각적 임팩트가 작아 P2로 유보.

---

## 3. PhotoDetailPage — 태블릿 구간 레이아웃 판단

### 3-1 검토 결론: 현행 유지 (변경 없음)

기획서는 "태블릿에서는 58/42 가로 2분할이 좁아 세로 스택이 나을 수 있다"고 문제 제기했으나, 검토 결과 **가로 2분할을 태블릿에서도 유지**할 것을 권장한다.

이유:
- 820px 폭에서 이미지 섹션 58% ≈ 476px는 세로 스택(전체 폭 820px, 16:9 비율 시 높이 ≈ 461px)보다 오히려 사진을 더 크게 보여준다 — 가로가 좁아지는 게 아니라 세로가 짧아지는 트레이드오프이며, 사진 포트폴리오 앱 특성상 가로 폭 확보가 더 유리하다.
- 500px/Behance 등 참고 서비스도 태블릿 폭에서 가로 2분할을 유지한다.
- 세로 스택으로 전환 시 정보 패널(작가/EXIF/댓글)이 이미지 아래로 밀려 스크롤이 2배로 길어지는 역효과가 있다.

### 3-2 유일한 조정: 이미지/정보 패널 비율

```javascript
// PhotoDetailPage.jsx — isMobile 판정은 그대로 768px 유지
// 단, 768~1024px(태블릿) 구간에서 이미지 섹션 비율을 58%→52%로 소폭 축소해
// 정보 패널에 더 많은 폭을 배분(제목/EXIF 텍스트 줄바꿈 완화)
import { BP } from '../constants/breakpoints';

const isTablet = !isMobile && window.innerWidth < BP.lg; // 768~1023px
// 이미지 섹션
{ flex: isTablet ? '0 0 52%' : '0 0 58%', /* ... */ }
```

이 조정은 AC 충족을 위한 최소 변경이며, 레이아웃 구조(가로 2분할) 자체는 바꾸지 않는다.

---

## 4. Header — 현행 유지 근거 (AC-T4 결정 문서화)

```
결정: 768px 이분법 유지. 768~1024px 슬림 헤더 신설 안 함.

근거:
1. BottomNav는 이미 플로팅 필 스타일(모바일 전용 컴포넌트가 아니라 "768px 미만 전체"를 위한
   범용 하단 네비)로 완성되어 있어, 아이패드 세로 모드(768px)에서도 데스크탑 헤더가
   정상적으로 표시된다 — 실제 회귀는 없음.
2. 아이패드 회전 시 "767→768px 사이에서 급격한 전환"이 발생하는 것처럼 보이지만, 실제로는
   아이패드의 논리 해상도가 세로/가로 각각 768px/1024px로 정확히 고정되어 있어 회전 시
   767px를 거치지 않고 768px→1024px로 바로 이동한다 — 즉 "전환 애니메이션 어색함" 문제가
   아니라 "중간 폭이 존재하지 않는" 기기 특성이므로 실사용 충격이 없다.
3. 슬림 헤더 신규 컴포넌트는 별도 디자인/구현 라운드가 필요한 규모라 이번 P1 범위를 벗어난다.

향후 재검토 조건: 폴더블/멀티태스킹 분할화면 등 768~1024px 사이 임의 폭이 실사용에서
관측되면 슬림 헤더를 P2로 재상정한다.
```

---

## 5. 반응형 기준 요약표

| 구간 | GalleryPage | PhotoDetailPage | Header |
|------|-------------|------------------|--------|
| < 600px | 마소닉 2컬럼 | 세로 스택 | BottomNav (플로팅 필) |
| 600~767px | 마소닉 2컬럼 | 세로 스택 | BottomNav (플로팅 필) |
| 768~1023px (태블릿, 신규) | **마소닉 3컬럼** | 가로 2분할 (이미지 52%) | PC 헤더 (변경 없음) |
| ≥ 1024px | 마소닉 4컬럼 | 가로 2분할 (이미지 58%) | PC 헤더 |

---

## 6. Claude.ai 아티팩트 요청 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지/유니코드 기호만 사용

현재 컬러 시스템 (AKIRA Neo-Tokyo):
  primary:'#E8121A', accent:'#22D3EE', bg:'#f5f5fa', surface:'#ffffff',
  border:'#e2e2ee', text:'#1a1a2e', textSecondary:'#5c5c7a', textMuted:'#9090b0'

다음을 작성해줘:

1. constants/breakpoints.js — BP = {sm:480, md:768, lg:1024, xl:1280} 상수와
   mq 헬퍼(mobile/tablet/desktop/upToTablet 미디어쿼리 문자열) export
2. 마소닉 갤러리 그리드 데모 컴포넌트 — <style> 태그에 미디어쿼리 3단계
   (4컬럼 ≥1024px / 3컬럼 768~1023px / 2컬럼 <768px) 인라인 주입,
   각 컬럼에 랜덤 높이(160~280px) placeholder 카드(background:#e2e2ee) 렌더
3. 뷰포트 폭을 표시하는 디버그 배지(우하단 고정, background:rgba(26,26,46,0.85),
   color:#fff, fontSize:11, "현재: {width}px / {breakpoint명}" 텍스트) — window.innerWidth
   resize 리스너로 실시간 갱신

외부 라이브러리 import 없음, 한국어 텍스트, export default 함수형 컴포넌트 1개
```

---

## 수용 기준 (AC)

- [ ] **AC-T1**: `GalleryPage.jsx`의 3개 `.gallery-masonry` `<style>` 블록 모두 768~1023px 구간에서 `columns:3`이 적용된다.
- [ ] **AC-T2**: `frontend/src/constants/breakpoints.js` (신규)에 `BP = { sm:480, md:768, lg:1024, xl:1280 }`와 `mq` 헬퍼가 정의되고 GalleryPage에서 실제로 참조된다.
- [ ] **AC-T3**: Chrome DevTools 820px(아이패드 Air)·768px(아이패드 미니)·1024px(아이패드 가로) 3개 폭에서 GalleryPage 스크린샷 확인 — overflow, 텍스트 잘림, 과도한 빈 공간 없음.
- [ ] **AC-T4**: Header 태블릿 범위 결정 사항(현행 768px 이분법 유지, 근거 포함)이 이 문서 4절에 기록되어 재논의 없이 참조 가능하다.
- [ ] PhotoDetailPage 768~1023px 구간에서 이미지 섹션 비율이 52%로 조정된다(가로 2분할 구조 자체는 유지).
- [ ] `npm run build` 성공
