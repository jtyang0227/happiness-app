# PLAN — 포트폴리오 확장성 개선 (웹 홈페이지 · 아이패드 · 모바일)

> 작성일: 2026-08-28 | PM: Claude | 대상: 포트폴리오 공개 페이지(`/portfolio/:profileName`) — 웹 데스크탑/태블릿, 모바일 앱

---

## 1. 배경

포트폴리오 공개 페이지는 사진작가가 클라이언트·팔로워에게 보여주는 이 앱의 "간판" 화면이다. 현재 템플릿 시스템(`PortfolioPage.jsx`)은 `EDITORIAL`(기본, 완성) / `SCRL` / `MINIMAL` / `DARK_ROOM` 4종이 실제 구현돼 있고, `FILM` / `SPLIT` / `MOSAIC` / `MAGAZINE` 4종은 "준비 중" 안내와 함께 EDITORIAL로 폴백한다.

이번 요청("확장성 있게")의 핵심은 기능 추가 자체보다 **① 새 템플릿·섹션을 앞으로 쉽게 늘릴 수 있는 구조**, **② 태블릿에서 제대로 보이는 반응형**, **③ 모바일 앱에 아예 없는 포트폴리오 접근 경로**라는 3가지 격차를 메우는 것이다.

---

## 2. 현황 진단 (코드 검증)

### (a) 웹 — 확장성 구조 문제

- `PortfolioPage.jsx`의 `renderTemplate()`이 **switch문**으로 템플릿을 분기한다. 새 템플릿을 추가하려면 이 switch에 case를 늘리고, `import`를 추가하고, "준비 중" 목록에서 빼는 등 이 파일 자체를 계속 수정해야 한다 — 템플릿이 늘어날수록 이 파일이 비대해지는 구조다.
- `TemplateComingSoon` 함수 컴포넌트(43~60번 줄)가 **정의만 되어 있고 실제로는 한 번도 호출되지 않는 죽은 코드**다. `renderTemplate()`의 FILM/SPLIT/MOSAIC/MAGAZINE case는 이 컴포넌트를 쓰지 않고 자체적으로 안내 배너 JSX를 다시 작성했다 — 같은 걸 두 번 만든 셈이라 유지보수 시 어느 쪽을 고쳐야 할지 헷갈린다.
- 템플릿마다 팔로우 버튼·통계·팔로워모달 연동 props(`photoCount`, `followerCount`, `onOpenFollowModal` 등)를 개별적으로 다시 나열하고 있어, 신규 템플릿 작성자가 이 리스트를 빠짐없이 복사해야 한다.

### (b) 아이패드 — 포트폴리오 태블릿 반응형 부재

- `TemplateEditorial.jsx`의 마소닉 그리드는 `columns:4 220px` 기본, `@media(max-width:900px){columns:3}`, `@media(max-width:600px){columns:2}` — 이번 세션에서 새로 만든 `constants/breakpoints.js`(`BP.md=768, BP.lg=1024`)와 값이 맞지 않는다. 즉 GalleryPage/ExplorePage는 768~1023px에서 3컬럼으로 통일했는데, 정작 방문자에게 가장 자주 보여줄 포트폴리오 페이지만 다른 기준(900px)을 쓰고 있어 태블릿 사용자 입장에서 앱 안에서 페이지마다 그리드가 다르게 반응한다.
- `TemplateMinimal.jsx`도 동일하게 `@media(max-width:600px)` 단일 분기만 있어 768~1023px 구간이 데스크탑과 동일한 3열 정방형 그리드로 나온다 — 아이패드 화면 폭 대비 각 칸이 좁다.
- Hero 영역(회원 아바타·이름·통계 바)은 고정 px 기반 레이아웃이라 태블릿 세로 모드(768px)에서 검증된 적이 없다.

### (c) 모바일 — 포트폴리오 접근 경로 자체가 없음

- `mobile/screens/` 어디에도 `/portfolio/:profileName`에 대응하는 화면이 없다. 웹은 클라이언트에게 문의 링크·예약 링크와 함께 포트폴리오 링크를 공유하는 게 핵심 플로우인데, 모바일 앱에서는 본인 포트폴리오조차 미리보기할 방법이 없다.
- 사진작가가 촬영 현장에서 모바일로 클라이언트에게 자기 포트폴리오를 보여주고 싶어도 앱 안에서는 불가능하고, 별도로 브라우저 앱을 열어 URL을 직접 타이핑해야 한다.
- 네이티브로 6개 템플릿 전부를 RN으로 재구현하는 것은 비용 대비 효과가 낮다 — 웹 포트폴리오가 이미 SEO 메타태그·팔로우·팔로워모달까지 완성돼 있어, 이를 모바일에서 통째로 재구현하는 것은 중복 투자다.

---

## 3. 개선 방향

### (a) 웹 — 템플릿 레지스트리 패턴

- `renderTemplate()`의 switch문을 **`TEMPLATE_REGISTRY` 객체**(`{ EDITORIAL: TemplateEditorial, SCRL: TemplateScrl, ... }`)로 교체. 새 템플릿 추가 시 이 객체에 한 줄만 추가하면 되고, `PortfolioPage.jsx`의 분기 로직 자체는 더 이상 건드릴 필요가 없다.
- 미구현 템플릿(FILM/SPLIT/MOSAIC/MAGAZINE)은 레지스트리에 등록하지 않고, "레지스트리에 없으면 `TemplateComingSoon` + EDITORIAL 폴백"이라는 **단일 경로**로 처리 — 현재 죽어있는 `TemplateComingSoon`을 실제로 연결해 중복 코드를 제거한다.
- 템플릿에 공통으로 넘기는 props(통계·팔로우 핸들러 등)를 `sharedProps`에 이미 있는 것처럼 **하나의 객체로 통합**해 신규 템플릿 작성 시 spread 한 번으로 끝나게 한다(이미 부분적으로 되어 있으나 photoCount/followerCount 등 4개가 EDITORIAL·ComingSoon 분기에서만 개별 전달되는 것을 통합).

### (b) 아이패드 — 브레이크포인트 정렬

- `TemplateEditorial.jsx`, `TemplateMinimal.jsx`의 포트폴리오 마소닉 그리드 브레이크포인트를 `constants/breakpoints.js`(`BP.md=768`, `BP.lg=1024`) 기준으로 재정렬 — 이번 요청이 명시적으로 "아이패드"를 지목했으므로, 이전 라운드에서 보류했던 900/600 값 변경을 여기서는 정식으로 진행한다.
- Hero 영역(아바타·통계 바)을 768~1023px 구간에서 검증하고, 필요 시 통계 칸 개수·패딩을 태블릿 전용으로 소폭 조정한다.

### (c) 모바일 — 아웃링크 브리지 (WebView 대신 `Linking`)

- 새 네이티브 의존성(WebView 등) 없이, React Native 내장 `Linking.openURL()`로 **실제 웹 포트폴리오 URL을 시스템 브라우저에서 연다**. 이유:
  - 포트폴리오 페이지는 이미 6개 템플릿·SEO·팔로우·댓글까지 완성돼 있어 네이티브로 재구현하면 이중 유지보수가 발생한다.
  - WebView는 인증 쿠키·JS 브릿지·테마 불일치 등 부가 복잡도가 크고, 이 페이지는 애초에 "공개" 페이지라 로그인 세션 공유가 필요 없다.
  - `Linking.openURL()`은 Expo managed workflow에서 추가 네이티브 링킹 없이 바로 동작한다.
- `ProfileScreen.js`에 "🌐 내 포트폴리오 보기" 메뉴 항목 추가 — `profileName`이 있으면 웹 URL을 열고, 없으면(아직 미설정) 안내 메시지.
- 확장성 측면: 추후 "공유하기"(Share API) 버튼도 동일 URL을 재사용하면 되므로, 이 시점에 웹 포트폴리오 URL을 만드는 로직을 `mobile/src/utils/portfolioUrl.js` 같은 단일 헬퍼로 분리해둔다.

---

## 4. 사용자 페르소나

| 페르소나 | 상황 | 니즈 |
|---|---|---|
| 사진작가 (본인 포트폴리오 관리) | 촬영 현장에서 클라이언트에게 포트폴리오를 보여주고 싶음 | 모바일 앱 안에서 바로 열람·공유 가능해야 함 |
| 신규 방문자 (클라이언트) | 아이패드로 작가 포트폴리오 링크를 받아 열람 | 그리드가 태블릿 폭에 맞게 적당한 크기로 보여야 함 |
| 팀 개발자 | 새 템플릿(FILM 등)을 다음 스프린트에 구현 예정 | `PortfolioPage.jsx`를 거의 안 건드리고 템플릿 파일만 추가하면 되길 원함 |

---

## 5. 유저 스토리

### 웹 — 템플릿 확장성
- As a **개발자**, I want to **새 템플릿을 레지스트리에 한 줄만 추가해서 등록하길**, so that **`PortfolioPage.jsx`의 분기 로직을 매번 수정하지 않아도 된다**.
- As a **개발자**, I want to **미구현 템플릿의 폴백 UI가 한 곳에만 정의돼 있길**, so that **안내 문구나 스타일을 바꿀 때 한 파일만 고치면 된다**.

### 아이패드
- As a **클라이언트**, I want to **아이패드로 포트폴리오를 열었을 때 사진이 3컬럼으로 적당한 크기로 보이길**, so that **작품을 충분히 감상할 수 있다**.
- As a **사진작가**, I want to **아이패드를 세로/가로로 돌려도 포트폴리오 레이아웃이 자연스럽게 전환되길**, so that **클라이언트 미팅 중 자신 있게 보여줄 수 있다**.

### 모바일
- As a **사진작가**, I want to **모바일 앱에서 내 포트폴리오를 한 탭으로 열어볼 수 있길**, so that **현장에서 클라이언트에게 바로 보여줄 수 있다**.
- As a **사진작가**, I want to **프로필명이 아직 없을 때는 안내를 받길**, so that **왜 포트폴리오를 열 수 없는지 헷갈리지 않는다**.

---

## 6. 수용 기준 (Acceptance Criteria)

### 웹 — 템플릿 레지스트리
- [ ] **AC-W1**: `PortfolioPage.jsx`에 `TEMPLATE_REGISTRY` 객체가 정의되고, `renderTemplate()`이 switch 대신 이 객체 조회로 동작한다.
- [ ] **AC-W2**: 레지스트리에 없는 템플릿 키(FILM/SPLIT/MOSAIC/MAGAZINE)는 살아있는 `TemplateComingSoon` 경로 하나로만 처리되고, 기존 죽은 코드/중복 JSX가 제거된다.
- [ ] **AC-W3**: 새 템플릿을 레지스트리에 추가하는 것만으로 `renderTemplate()`의 나머지 로직 변경 없이 정상 동작함을 코드 리뷰로 확인한다.

### 아이패드
- [ ] **AC-T1**: `TemplateEditorial.jsx`의 `.portfolio-masonry`가 768~1023px에서 3컬럼, ≥1024px에서 4컬럼으로 `BP`/`mq` 토큰을 참조해 렌더링된다.
- [ ] **AC-T2**: `TemplateMinimal.jsx`의 그리드도 동일 기준으로 768~1023px 구간에 대응한다.
- [ ] **AC-T3**: 820px(아이패드 Air), 768px(아이패드 미니) 두 폭에서 Playwright 스크린샷으로 레이아웃 깨짐 없음을 확인한다.

### 모바일
- [ ] **AC-M1**: `ProfileScreen.js`에 "내 포트폴리오 보기" 메뉴 항목이 추가되고, `profileName`이 있으면 `Linking.openURL()`로 웹 포트폴리오 URL을 연다.
- [ ] **AC-M2**: `profileName`이 없는 계정에서는 열기 대신 안내 메시지가 뜬다.
- [ ] **AC-M3**: `npx expo export --platform web`이 에러 없이 성공한다.

---

## 7. 기능 범위

### In Scope (이번 구현)
- 웹: `PortfolioPage.jsx` 템플릿 레지스트리 리팩토링, 죽은 코드 제거.
- 웹: `TemplateEditorial.jsx`/`TemplateMinimal.jsx` 마소닉 그리드 태블릿 브레이크포인트를 `BP`/`mq`로 정렬.
- 모바일: `ProfileScreen.js`에 포트폴리오 아웃링크 메뉴 + `mobile/src/utils/portfolioUrl.js` 헬퍼.

### Out of Scope (다음 버전)
- FILM/SPLIT/MOSAIC/MAGAZINE 4개 템플릿의 실제 디자인·구현 — 레지스트리 구조만 준비하고 내용물은 별도 스프린트.
- 모바일 네이티브 포트폴리오 뷰어(6개 템플릿 RN 재구현) — 아웃링크 브리지로 충분하다고 판단, 추후 사용률 보고 재검토.
- 포트폴리오 공유(Share API) 버튼 — URL 헬퍼만 준비, 실제 공유 버튼 UI는 P2.

---

## 8. 기술 트레이드오프

| 옵션 | 장점 | 단점 | 채택 |
|---|---|---|---|
| 모바일: WebView 임베드 | 앱을 벗어나지 않는 매끄러운 UX | 새 네이티브 의존성, 인증/테마 복잡도 | ❌ |
| 모바일: `Linking.openURL()` 아웃링크 | 의존성 0개, 즉시 동작, 유지보수 이중화 없음 | 앱을 벗어나 시스템 브라우저로 전환됨(경험 단절) | ✅ |
| 웹: switch문 유지 + case만 계속 추가 | 당장 변경 적음 | 템플릿 늘어날수록 파일 비대화, 확장성 요청과 배치 | ❌ |
| 웹: 템플릿 레지스트리 객체 | 신규 템플릿 추가가 1줄 | 초기 리팩토링 비용 | ✅ |
| 아이패드: 900px 그대로 유지 | 변경 없음(안전) | 이번 요청의 핵심("아이패드")을 충족 못함 | ❌ |
| 아이패드: BP.lg(1024) 기준 재정렬 | 앱 전체 그리드 기준 통일 | 900~1023px 구간 실사용자에게 시각적 변화(컬럼 수 동일하게 유지되므로 실질 임팩트 작음) | ✅ |

---

## 9. 우선순위 로드맵

### P0 — 즉시 (확장성 핵심)
| 항목 | 플랫폼 | 예상 공수 |
|---|---|---|
| `PortfolioPage.jsx` 템플릿 레지스트리 리팩토링 + 죽은 코드 제거 | 웹 | 1시간 |
| `TemplateEditorial.jsx` 마소닉 그리드 BP 정렬 | 웹 (태블릿) | 30분 |
| `TemplateMinimal.jsx` 그리드 BP 정렬 | 웹 (태블릿) | 30분 |
| 모바일 포트폴리오 아웃링크 메뉴 + URL 헬퍼 | 모바일 | 1시간 |

### P1 — 단기
| 항목 | 플랫폼 | 예상 공수 |
|---|---|---|
| Hero 영역 태블릿 세로 모드 시각 검증·미세 조정 | 웹 (태블릿) | 1~2시간 |
| 모바일 "공유하기" 버튼 (Share API, URL 헬퍼 재사용) | 모바일 | 1시간 |

### P2 — 중기
| 항목 | 플랫폼 | 예상 공수 |
|---|---|---|
| FILM/SPLIT/MOSAIC/MAGAZINE 실제 디자인·구현 | 웹 | 템플릿당 반나절~1일 |
| 모바일 네이티브 포트폴리오 뷰어 재검토 (사용률 확인 후) | 모바일 | 재평가 필요 |

---

## 10. 성공 지표 (KPI)

- **확장성**: 신규 템플릿 추가 시 `PortfolioPage.jsx` diff가 레지스트리 1줄 + 컴포넌트 파일 추가로 끝나는지 (switch문 분기 추가 불필요).
- **태블릿 커버리지**: 768px·820px·1024px 3개 폭에서 포트폴리오 페이지 레이아웃 깨짐 0건.
- **모바일 접근성**: ProfileScreen에서 포트폴리오까지 도달하는 탭 수 1탭.

---

## 11. 관련 파일

### 웹
- `frontend/src/pages/PortfolioPage.jsx` — 템플릿 레지스트리 리팩토링
- `frontend/src/components/portfolio/templates/TemplateEditorial.jsx` — 마소닉 그리드 BP 정렬
- `frontend/src/components/portfolio/templates/TemplateMinimal.jsx` — 마소닉 그리드 BP 정렬
- `frontend/src/constants/breakpoints.js` — 참조만, 변경 없음

### 모바일
- `mobile/screens/ProfileScreen.js` — 포트폴리오 아웃링크 메뉴 추가
- `mobile/src/utils/portfolioUrl.js` — 신규, URL 빌더 헬퍼

### 관련 기획/디자인 문서
- `DESIGN_PROMPTS/design/DESIGN_PROMPT_portfolio-strong-identity.md` — 기존 EDITORIAL 아이덴티티 작업
- `DESIGN_PROMPTS/design/DESIGN_PROMPT_tablet-breakpoint-system.md` — BP/mq 토큰 정의 출처
- `DESIGN_PROMPTS/design/DESIGN_PROMPT_mobile-design-parity.md` — 모바일 라이트 테마 컨벤션 참고
