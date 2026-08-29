# DESIGN_PROMPT — 포트폴리오 확장성 개선 (웹 · 아이패드 · 모바일)

> Feature: Portfolio Scalable Expansion | 2026-08-28 | AKIRA Neo-Tokyo × Cosmos Dark(포트폴리오는 다크 유지)

연관 문서:
- `PLANNING_portfolio-scalable-expansion.md` — 기획 기반
- `DESIGN_PROMPT_portfolio-strong-identity.md` — 기존 EDITORIAL 아이덴티티(고스트 타이포·시그니처 스탬프)
- `DESIGN_PROMPT_tablet-breakpoint-system.md` — BP/mq 토큰 정의
- `DESIGN_PROMPT_mobile-design-parity.md` — 모바일 라이트 테마 컨벤션

---

## 시스템 컨텍스트

```
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA(웹) / React Native + Expo 49(모바일)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

포트폴리오 페이지 컬러 (다크 유지 — 이번 세션의 Cosmos 화이트 전환 대상 아님):
  galleryBg:     '#0e0e0e'   (COLORS.galleryBg)
  surface-dark:  '#12122a'
  text-dark:     '#eeeeff'
  textSub-dark:  '#9090b0' / '#6060a0'
  primary:       '#E8121A'
  accent:        '#22D3EE'

브레이크포인트 토큰 (frontend/src/constants/breakpoints.js):
  BP = { sm:480, md:768, lg:1024, xl:1280 }
  mq.tablet = '@media (min-width: 768px) and (max-width: 1023px)'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react/react-router-dom, RN은 react-native만 허용)
- 한국어 UI 텍스트
```

---

## 1. 웹 — `PortfolioPage.jsx` 템플릿 레지스트리

### 1-1 구조 변경 (Before/After)

```javascript
// ── Before: switch문 ──────────────────────────────
const renderTemplate = () => {
  switch (template) {
    case 'SCRL': return <TemplateScrl {...sharedProps} />;
    case 'MINIMAL': return <TemplateMinimal {...sharedProps} />;
    case 'DARK_ROOM': return <TemplateDarkRoom {...sharedProps} />;
    case 'FILM': case 'SPLIT': case 'MOSAIC': case 'MAGAZINE':
      return ( /* 중복 안내 배너 JSX */ );
    case 'EDITORIAL': default:
      return <TemplateEditorial {...sharedProps} ... />;
  }
};

// ── After: 레지스트리 객체 ─────────────────────────
const TEMPLATE_REGISTRY = {
  EDITORIAL: TemplateEditorial,
  SCRL:      TemplateScrl,
  MINIMAL:   TemplateMinimal,
  DARK_ROOM: TemplateDarkRoom,
  // 새 템플릿 추가 시 여기 한 줄만: FILM: TemplateFilm,
};

const renderTemplate = () => {
  const TemplateComponent = TEMPLATE_REGISTRY[template] || TEMPLATE_REGISTRY.EDITORIAL;
  const isImplemented = Boolean(TEMPLATE_REGISTRY[template]);

  if (!isImplemented && template !== 'EDITORIAL') {
    return (
      <TemplateComingSoon template={template}>
        <TemplateEditorial {...templateProps} />
      </TemplateComingSoon>
    );
  }
  return <TemplateComponent {...templateProps} />;
};
```

### 1-2 `TemplateComingSoon` — 실제로 쓰이는 형태로 재작성

기존 정의(43~60번 줄)는 `children`을 받지 않고 자기 안에서 직접 `<TemplateEditorial>`을 호출했다 — 이를 **children을 감싸는 배너 래퍼**로 바꿔 재사용성을 높인다.

```javascript
function TemplateComingSoon({ template, children }) {
  return (
    <div>
      <div style={{
        background: '#1a1a2e',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 14 }}>✦</span>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>
          {template} 템플릿은 준비 중입니다. 에디토리얼 레이아웃으로 표시합니다.
        </div>
      </div>
      {children}
    </div>
  );
}
```

이렇게 하면 미구현 템플릿이 몇 개든 안내 배너 스타일은 이 한 곳에서만 관리된다.

### 1-3 `templateProps` — 공통 props 통합

```javascript
// 기존: EDITORIAL과 준비중 분기에서 각각 photoCount/followerCount/... 나열
// 변경: sharedProps에 통계·팔로우 핸들러까지 합쳐 하나의 객체로
const templateProps = {
  ...sharedProps,
  photoCount, followerCount, followingCount, totalLikes,
  following: !isOwnPage && user?.id ? following : undefined,
  followLoading,
  onFollow: !isOwnPage && user?.id ? handleFollow : null,
  onOpenFollowModal: handleOpenFollowModal,
};
```

신규 템플릿 작성자는 이 하나의 `templateProps` 객체를 받아 필요한 필드만 구조분해해서 쓰면 된다.

---

## 2. 아이패드 — 마소닉 그리드 브레이크포인트 정렬

### 2-1 TemplateEditorial — Before/After

```
[Before]                              [After]
columns: 4 220px (기본)                columns: 4 220px (기본, ≥1024px)
@media(max-width:900px) → 3열          @media(min-width:768px) and (max-width:1023px) → 3열  (BP.md~BP.lg-1)
@media(max-width:600px) → 2열          @media(max-width:767px) → 2열  (BP.md-1 이하)
```

```javascript
import { mq } from '../../../constants/breakpoints';

// portfolio-masonry <style> 블록 교체
<style>{`
  .portfolio-masonry { columns: 4 220px; column-gap: 4px; }
  ${mq.tablet} { .portfolio-masonry { columns: 3; } }
  ${mq.mobile} { .portfolio-masonry { columns: 2; } }
`}</style>
```

### 2-2 TemplateMinimal — 동일 기준 적용

TemplateMinimal은 현재 3열 정방형 그리드가 `@media(max-width:600px)`에서만 2열로 바뀐다. 768~1023px 구간에도 대응이 필요하나, 이 템플릿은 애초에 데스크탑에서도 3열이므로 태블릿에서 컬럼 수를 더 줄이기보다 **각 칸의 gap/padding을 축소**해 여백을 확보하는 쪽이 적합하다(사진 수가 적은 미니멀 템플릿 특성상 3→2열로 줄이면 오히려 휑해 보임).

```javascript
import { mq } from '../../../constants/breakpoints';

// 기존 grid 스타일에 태블릿 전용 gap 조정 추가
<style>{`
  .minimal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
  ${mq.tablet} { .minimal-grid { gap: 1px; } }
  @media (max-width: 600px) { .minimal-grid { grid-template-columns: repeat(2, 1fr); } }
`}</style>
```

> **디자이너 노트**: TemplateMinimal은 3열 유지 + gap 축소로 태블릿 대응(레이아웃 자체는 안 바꿈), TemplateEditorial은 3열로 컬럼 수 자체를 줄임 — 두 템플릿의 디자인 철학이 다르기 때문(미니멀=격자 고정, 에디토리얼=가변 마소닉) 의도적으로 다르게 처리한다.

---

## 3. 모바일 — 포트폴리오 아웃링크

### 3-1 URL 헬퍼

```javascript
// mobile/src/utils/portfolioUrl.js
export function getPortfolioUrl(profileName) {
  if (!profileName) return null;
  const base = __DEV__
    ? 'http://localhost:3000'   // 개발 중엔 PC 브라우저로 확인 안내
    : 'https://app.example.com'; // 운영 도메인 (CLAUDE.md 배포 아키텍처 참고)
  return `${base}/portfolio/${profileName}`;
}
```

### 3-2 ProfileScreen "메뉴" 섹션 — 항목 추가 (라이트 테마, 기존 legalItem 스타일 재사용)

```
[메뉴]
┌─────────────────────────────────────┐
│ 🤝 약속                          ›  │  ← 기존 (Meets)
│ 🌐 내 포트폴리오 보기              ›  │  ← 신규
└─────────────────────────────────────┘
```

```javascript
import { Linking, Alert } from 'react-native';
import { getPortfolioUrl } from '../src/utils/portfolioUrl';

const handleOpenPortfolio = () => {
  const url = getPortfolioUrl(user?.profileName);
  if (!url) {
    Alert.alert('프로필명이 없어요', '설정에서 프로필명을 먼저 등록해주세요.');
    return;
  }
  Linking.openURL(url).catch(() => {
    Alert.alert('열기 실패', '브라우저를 열 수 없습니다.');
  });
};

// JSX — 기존 legalItem 스타일 그대로 재사용
<TouchableOpacity style={styles.legalItem} onPress={handleOpenPortfolio}>
  <Text style={styles.legalItemText}>🌐 내 포트폴리오 보기</Text>
  <Text style={styles.legalChevron}>›</Text>
</TouchableOpacity>
```

- 탭하면 시스템 브라우저(Chrome/Safari)가 열리고 앱은 백그라운드로 전환된다 — 이건 의도된 동작(별도 확인 다이얼로그 불필요, `Linking.openURL`은 파괴적 액션이 아님).
- `profileName`이 없는 계정(소셜 로그인 초기 상태 등)은 열기 대신 `Alert`로 안내.

---

## 4. 상태 정의

| 상태 | UI |
|---|---|
| 웹: 템플릿 키가 레지스트리에 있음 | 해당 템플릿 그대로 렌더 |
| 웹: 템플릿 키가 레지스트리에 없음(FILM 등) | `TemplateComingSoon` 배너 + EDITORIAL 폴백 |
| 모바일: profileName 있음 | 탭 → 시스템 브라우저로 포트폴리오 URL 오픈 |
| 모바일: profileName 없음 | 탭 → Alert 안내, 이동 없음 |

---

## 5. P1 검증 중 발견한 회귀 버그 (수정 완료)

태블릿 Hero 영역 실측 검증(768px, 820px) 중, PC 헤더와 모바일 BottomNav가 **동시에 렌더링**되는 버그를 발견했다. 원인은 이전 라운드("브레이크포인트 통일 리팩토링")에서 `Header.jsx`/`AdminLayout.jsx`의 `@media (min-width: 768px)`를 `mq.desktop`(`min-width:1024px`)으로 잘못 치환한 것 — `mq.desktop`은 3단 그리드(모바일/태블릿/데스크탑)용이고, PC헤더는 2단(모바일이냐 아니냐)만 구분하므로 값이 다르다. `constants/breakpoints.js`에 `mq.tabletUp`(`min-width:768px`)을 신설해 Header.jsx·AdminLayout.jsx 3곳(사이드바 오버레이, 사이드바 마진 — 마지막 것은 기존에 `769px` 별도 하드코딩이던 것도 함께 정렬)을 교체했다. 통계 바(팔로워/팔로잉 등) 자체는 검증 결과 정상 렌더링되어 추가 조정 불필요.

---

## 수용 기준 (AC) — PLANNING 문서 6절과 동일, 여기서는 시각 스펙만 재확인

- [ ] `.portfolio-masonry`가 768~1023px에서 3열, 1024px 이상에서 4열
- [ ] `TemplateComingSoon`이 `children`을 받는 래퍼로 재작성되고 실제로 렌더 경로에서 호출된다
- [ ] ProfileScreen "메뉴"에 포트폴리오 아웃링크 항목이 기존 legalItem과 시각적으로 통일된 스타일로 추가된다
- [ ] `npm run build` / `npx expo export --platform web` 둘 다 성공
