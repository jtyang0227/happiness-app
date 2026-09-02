# DESIGN_PROMPT — 포트폴리오 슬라이드쇼 애플 글라스(Liquid Glass) 강화
> Feature: Apple Glass Slideshow Chrome | 2026-09-02 | 웹 + 모바일(신규)
>
> **추가 확장(같은 날)**: 앱 전체(헤더·드롭다운·하단내비 등 밝은 화면)로 확장하는 안은
> 실제로 적용해본 뒤 사용자가 되돌리기로 결정 — 토스 플랫 디자인 유지. 대신 동일한 원칙
> (풀블리드 사진 위 컨트롤 크롬에 한정)으로 `components/photo/PhotoViewer.jsx`(사진 전체화면
> 뷰어의 닫기·이전·다음 버튼)에 슬라이드쇼와 동일한 글라스 레시피를 추가 적용함.

---

## 적용 범위 (매우 중요 — 반드시 지킬 것)

**이 작업은 포트폴리오 슬라이드쇼의 플로팅 컨트롤 UI(상단바/하단바/이전·다음 버튼/재생 토글/PDF 버튼)에만
"글라스(blur+반투명) 머티리얼"을 적용한다. 앱 전체의 Toss 플랫 디자인 시스템(`CLAUDE.md` "현재 디자인
방향" 섹션)은 그대로 유지하며, 이번 작업으로 `constants/colors.js`나 전역 스타일을 바꾸지 않는다.**

- 이전에 이 프로젝트는 iOS 26 Liquid Glass 방향을 전면 검토했다가 **의도적으로 폐기**하고
  (`DESIGN_PROMPTS/deprecated/`) 토스(Toss) 플랫 디자인으로 전환했다. 이번 요청은 그 결정을 뒤집는 것이
  아니라, 이미 다크 예외 영역으로 분류된 딱 한 화면(포트폴리오 슬라이드쇼)의 플로팅 컨트롤에 한정해 글라스
  머티리얼을 다시 시험 적용하는 것이다.
- 글라스가 시각적으로 성립하려면 그 아래에 항상 생생하고 어두운 콘텐츠(사진, 검은 배경)가 있어야 한다.
  슬라이드쇼는 정확히 이 조건(풀블리드 사진 위에 뜬 컨트롤)을 만족하는 유일한 화면이라 선택했다.
- 대상 파일(웹): `frontend/src/pages/PortfolioSlideshowPage.jsx`, `frontend/src/components/portfolio/PrintButton.jsx`
- 대상 파일(모바일, 신규): `mobile/screens/PortfolioSlideshowScreen.js` (React Native, `expo-blur`의 `BlurView` 사용 — Expo 49 정식 SDK 모듈이라 외부 3rd-party 라이브러리 추가가 아님)
- **건드리지 않는 것**: `EmbedCodeModal.jsx`(콘텐츠 다이얼로그라 글라스 대상 아님), `PortfolioCoverPage.jsx`,
  `PortfolioPage.jsx` 등 슬라이드쇼 밖의 다른 모든 화면, `constants/colors.js`, `constants/glass.js`(이미
  삭제된 파일 — 재생성하지 않음, 글라스 스타일은 각 파일 내부에 로컬 상수로만 정의).

---

## 시스템 컨텍스트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택(웹): React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
기술 스택(모바일): React Native 0.72 + Expo 49, StyleSheet
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템(Toss, 앱 전역 — 이번 작업 대상 밖):
  primary: '#3182F6', primaryDark: '#1B64DA'
  darkBg/darkDeep: '#111417', darkSurface: '#1A1E22', darkBorder/darkAlt: '#2E3338'

규칙(전역, 변경 없음):
- export default 함수형 컴포넌트, inline style/StyleSheet
- 외부 라이브러리 최소화 — 모바일 글라스는 expo-blur(BlurView)만 신규 추가(Expo 정식 SDK 모듈)
- 한국어 UI 텍스트
```

---

## 글라스 머티리얼 스펙

Apple Liquid Glass의 핵심 특성 3가지를 재현한다:

1. **블러 + 채도 증폭** — 뒤 콘텐츠(사진)가 흐려지되 색이 더 선명하게(saturate) 비쳐 보인다.
   - 웹: `backdropFilter: 'blur(20px) saturate(180%)'` (+ `WebkitBackdropFilter` 동일값, Safari 대응)
   - 모바일: `<BlurView intensity={40} tint="dark" />` (expo-blur)
2. **반투명 화이트 틴트 + 얇은 테두리** — 유리 재질감을 주는 최소한의 밝은 오버레이.
   - `background: rgba(255,255,255,0.10)`, `border: 1px solid rgba(255,255,255,0.18)`
3. **상단 스펙큘러 하이라이트** — 유리 상단 모서리에 반사광처럼 얇은 흰 선.
   - 웹: `boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 32px rgba(0,0,0,0.24)'`
   - 모바일: BlurView 위에 겹치는 1px 흰색 반투명 top border View로 근사

이 3가지를 하나의 로컬 헬퍼(웹은 `glass()` 함수, 모바일은 `GLASS` 스타일 객체)로 묶어 각 파일 안에서만
재사용한다 — 전역 유틸리티 파일을 새로 만들지 않는다(과거 `constants/glass.js`를 의도적으로 삭제한 결정과
충돌하지 않도록).

### 적용 대상 컨트롤(웹 · 모바일 공통 개념)
- 상단바(뒤로가기 + 작가명 + PDF/임베드 버튼 + 페이지 카운터) — 전체를 글라스 바로
- 좌/우 이전·다음 원형 버튼 — 글라스 원
- 하단바(제목/무드 + 도트 인디케이터 + 재생·일시정지 토글) — 글라스 바
- 도트 인디케이터 자체는 글라스 처리하지 않음(과한 장식 방지, Apple Photos 앱도 도트는 맨 상태로 둠)
- `EmbedCodeModal`은 제외(콘텐츠 다이얼로그)

---

## 모바일 신규 화면 — PortfolioSlideshowScreen

웹의 `PortfolioSlideshowPage.jsx`와 동일한 기능을 React Native로 재구현한다(신규 화면):
- 데이터: `photoApi.getPortfolio(profileName)` (이미 존재하는 API, 신규 백엔드 불필요) — 로그인한 본인의
  `user.profileName`으로 호출(자기 자신의 포트폴리오 슬라이드쇼를 보는 용도).
- 커버 슬라이드(작가명/바이오) + 사진 슬라이드, 좌우 스와이프(`PanResponder` 또는 스크롤뷰 페이징),
  자동재생 3초, 하단 도트 인디케이터(최대 7개), 상단 글라스 바(닫기 + 작가명 + 페이지 카운터), 하단 글라스
  바(제목/무드 + 재생토글).
- 진입점: `ProfileScreen.js`의 기존 "메뉴" 섹션 — 현재 "🌐 내 포트폴리오 보기"(외부 브라우저) 옆에
  "🎞 슬라이드쇼로 보기"(네이티브 화면 이동) 항목을 새로 추가한다. 기존 외부보기/공유 버튼은 그대로 둔다.
- 네비게이션: `AppNavigator.js`의 `MainStack`에 `PortfolioSlideshow` 스크린 추가(`headerShown: false`,
  자체 커스텀 헤더 사용).

---

## 클로드 구현 프롬프트 (claude.ai 아티팩트용 — 웹 버전 예시)

```
Happiness 포트폴리오 슬라이드쇼 페이지의 플로팅 컨트롤(상단바/하단바/이전·다음 버튼/재생버튼)에
애플 Liquid Glass 스타일을 적용해줘. 슬라이드 콘텐츠(사진) 자체와 커버 페이지는 그대로 두고,
그 위에 뜨는 컨트롤 크롬만 유리 재질로 바꿔줘.

글라스 스타일:
  backdropFilter: 'blur(20px) saturate(180%)' (+ WebkitBackdropFilter 동일)
  background: 'rgba(255,255,255,0.10)'
  border: '1px solid rgba(255,255,255,0.18)'
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 32px rgba(0,0,0,0.24)'

규칙:
- export default 함수형 컴포넌트, inline style object
- 외부 라이브러리 import 없음
- 한국어 UI 텍스트 유지
- 도트 인디케이터는 글라스 처리하지 않음(맨 상태 유지)
- 이 스타일은 이 파일에서만 쓰는 로컬 상수로 정의(전역 유틸 생성 금지)
```

---

## 완료 기준 (Acceptance Criteria)

- [ ] 웹 슬라이드쇼 상단바/하단바/이전·다음 버튼/PDF 버튼이 blur+saturate 글라스로 렌더링된다
- [ ] 앱의 다른 화면(포트폴리오 본문, 갤러리, 로그인 등)은 시각적으로 전혀 변경되지 않는다
- [ ] `constants/colors.js` / `constants/glass.js` 등 전역 파일은 수정하지 않는다
- [ ] 모바일에 `PortfolioSlideshowScreen`이 신규 추가되고 `ProfileScreen` 메뉴에서 진입 가능하다
- [ ] 모바일 글라스는 `expo-blur`의 `BlurView`로 구현되고, Expo 49와 호환되는 버전을 사용한다
- [ ] 웹 `npm run build`, 모바일 `npx expo export --platform web` 모두 성공한다
- [ ] 실제 브라우저(웹)에서 스크린샷으로 글라스 효과 육안 확인
