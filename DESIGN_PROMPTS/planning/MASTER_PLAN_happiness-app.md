# MASTER PLAN — Happiness 앱 전체 로드맵

> 작성일: 2026-08-28 | PM: Claude | 대상: 웹 · 모바일 · 어드민 전체

---

## 0. 이 문서가 왜 필요한가

`CLAUDE.md`의 "Project Overview"는 기능 분석·로드맵 전체 내용을 `PORTFOLIO_FEATURES.md`에서
참조하라고 안내하지만, **저장소를 확인한 결과 이 파일은 실제로 존재하지 않는다**(`find`로
직접 확인, 추측 아님). `DESIGN_PROMPTS/planning/`에는 기능별 기획 문서가 30개 넘게 쌓여
있지만 앱 전체를 한눈에 보여주는 단일 문서는 없었다. 이 문서가 그 공백을 메운다.

**이 문서가 다루지 않는 것**: 이미 상세 기획 문서가 있는 개별 기능(포트폴리오 확장성,
멀티플랫폼 UI/UX, 매거진 스프레드 등)을 다시 쓰지 않는다 — 아래 "11. 관련 파일"에서 참조만
한다. 이 문서는 **"이미 만든 걸 실제로 쓸 수 있게 만드는" 우선순위**에 집중한다.

---

## 1. 배경

Happiness는 사진작가용 포트폴리오 갤러리 앱이다. 백엔드(Spring Boot 3 / Java 25) ·
프론트엔드(React 18 SPA) · 모바일(React Native / Expo 49) 3-tier로 구성되어 있고, 기능
자체는 상당히 완성도가 높다 — 인증(이메일+4종 소셜 로그인), 사진 CRUD, 팔로우/피드/댓글,
시리즈, 포트폴리오(6종 템플릿 중 4종 구현), 촬영 문의·예약, 클라이언트 납품 포털, 방문자
분석, 모델-작가 약속(Meets), 어드민 패널까지 갖췄다.

문제는 **기능의 양이 아니라, 이미 만든 기능들이 실제로 "살아있는 상태"인지**다. 이 문서는
그 질문에 답하기 위해 작성됐다.

---

## 2. 현황 진단 (코드 검증 — 추측 없음)

### (a) 웹

- 대부분의 페이지가 이번 세션 동안 "Cosmos 화이트" 테마로 전환 완료됨(Gallery/Explore/
  Header/FeedPage/PhotoDetailPage 정보패널/Profile/Series 등). 의도적으로 다크를 유지하는
  영역: 로그인/회원가입, 이미지 뷰어·에디터, 포트폴리오 EDITORIAL/DARK_ROOM/SCRL 템플릿,
  어드민 패널(별도로 glass.js light 계열 — 화이트 전환과는 다른 계열).
- 포트폴리오 템플릿은 이번 세션에 **레지스트리 패턴으로 리팩토링 완료**(`TEMPLATE_REGISTRY`
  객체, switch문 아님) — 새 템플릿 추가가 구조적으로 쉬워짐. 단 실제로 구현된 건 4종
  (EDITORIAL/SCRL/MINIMAL/DARK_ROOM)뿐이고, 나머지 4종(FILM/SPLIT/MOSAIC/MAGAZINE)은
  **사용자가 프로필 설정에서 선택 가능한 옵션으로 노출돼 있음에도** 실제로는 EDITORIAL
  레이아웃 + "준비 중" 배너로 대체된다.
- 태블릿 브레이크포인트(`constants/breakpoints.js`의 `BP`/`mq`)가 이번 세션에 신설되어
  Header/AdminLayout/EditorShell/PhotoDetailPage/GalleryPage/ExplorePage/포트폴리오
  템플릿에 적용됨. 단 GalleryPage의 600px, ExplorePage의 640px, 매거진 스프레드 등
  일부는 값이 `BP` 토큰과 정확히 일치하지 않아 의도적으로 보류된 상태.

### (b) 모바일

- 콘텐츠 화면은 라이트 테마, 네비게이션 바(헤더/탭바)와 로그인/회원가입은 다크 — 웹과는
  다른 독자적인 테마 정책(의도된 것, 문서화됨).
- 이번 세션에 장르 필터·시리즈 콜라주 카드·Meets 기능·포트폴리오 아웃링크(시스템 브라우저
  오픈 + 공유하기)가 추가됨.
- **`mobile/screens/ListScreen.js`, `mobile/screens/PostDetailScreen.js`는
  `AppNavigator.js`에 전혀 등록되지 않은 고아 파일**이다(코드로 확인). `ListScreen`은
  `photo.likes`/`photo.favorites` 필드명을 쓰는데, 실제 API 응답은 `likesCount`/
  `savesCount`다 — 초기 프로토타입 단계에서 남은 죽은 코드로 보인다.
- `mobile/app.json`의 앱 아이콘·스플래시가 아직 placeholder(CLAUDE.md 자체 체크리스트에도
  명시됨). App Store Connect/Play Console의 개인정보 선언·연령 등급·스크린샷도 미완료.

### (c) 어드민

- 7개 어드민 페이지(Dashboard/GalleryOrder/Members/Photos/Category/Tags/Moderation) 존재.
- **`AdminModerationPage.jsx`는 프론트엔드 mock 데이터로만 동작한다** — 파일 내 TODO
  주석에 `GET/PUT/DELETE /api/admin/reports` 엔드포인트가 필요하다고 명시돼 있으나
  백엔드에 `report` 관련 패키지 자체가 없다(코드로 확인, 신고 데이터를 저장할 테이블도 없음).
- 백엔드 권한 체크는 `hasAnyRole('WM','SA')`인데 프론트엔드에는 `role: "ADMIN"`으로 매핑돼
  내려온다 — 이름이 다르다는 걸 모르고 새 기능에 `hasRole('ADMIN')`을 그대로 쓰면 동작하지
  않는다(이번 세션에 `admin` 에이전트 문서에 명시해둠).

### (d) 배포/운영 — 가장 중요한 발견

- `.github/workflows/deploy.yml`은 5단계(backend-ci/frontend-ci/docker-build/
  deploy-backend/deploy-frontend)가 전부 코드로 완성돼 있다.
- **하지만 `RAILWAY_TOKEN`/`VERCEL_TOKEN` 등 GitHub Secrets가 한 번도 등록된 적이 없어서,
  `deploy-backend`/`deploy-frontend` 잡은 항상 "스킵"된다(실패가 아니라 건너뜀 — 과거
  실행 로그로 확인, 이번 세션에서 새로 생긴 문제가 아니라 수 주 전부터 동일).** 즉 코드는
  계속 쌓이고 있지만 **실제 운영 서버에 배포된 적이 없을 가능성이 높다.**
- 이 항목은 GitHub Secrets를 등록하는 게 Railway/Vercel 계정 로그인이 필요한 작업이라
  **에이전트가 대신 해줄 수 없다** — 아래 로드맵에서 담당 주체를 명확히 구분했다.

### (e) 문서 정합성

- `CLAUDE.md`가 참조하는 `PORTFOLIO_FEATURES.md`가 존재하지 않음(위 0절).
- `DESIGN_PROMPTS/planning/`에 번호 문서(01~36) + `PLANNING_*.md`(최근 기능별) 두 계열이
  혼재 — 이번 문서는 후자 계열에 "마스터" 문서로 추가된다.

---

## 3. 개선 방향 / 전략

1. **"실제로 쓸 수 있게" 우선**: 새 기능을 더 만들기보다, 이미 만든 것 중 죽어있는 부분
   (배포, 모더레이션 백엔드)을 살리는 데 이번 로드맵의 우선순위를 둔다. 기능이 아무리
   많아도 배포가 안 되면 사용자 가치는 0이다.
2. **에이전트가 할 수 있는 일 / 사용자만 할 수 있는 일을 분리**: 배포 시크릿 등록처럼
   외부 서비스 로그인이 필요한 작업은 "구현" 항목이 아니라 "안내" 항목으로 분류한다.
3. **거짓 약속 제거**: 미구현 템플릿(FILM/SPLIT/MOSAIC/MAGAZINE)을 사용자가 선택 가능한
   옵션으로 계속 노출할지, 아니면 실제 구현 전까지 선택지에서 숨길지 결정이 필요하다
   (아래 8절 트레이드오프).
4. **죽은 코드 정리**: 모바일 고아 화면 2개는 삭제하거나 실제로 연결한다 — 방치하면
   유지보수 시 혼란만 늘어난다.

---

## 4. 사용자 페르소나

| 페르소나 | 니즈 |
|---|---|
| 사진작가 (핵심 사용자) | 자신의 작품을 온라인에 전문적으로 보여주고, 클라이언트 문의·예약을 받는다 |
| 신규 방문자/클라이언트 | 링크로 들어온 작가의 포트폴리오를 웹/아이패드/모바일 어디서든 매끄럽게 본다 |
| 운영자(Admin) | 회원·콘텐츠·신고를 관리하고, 실수로 잘못 누르지 않는다 |
| 개발자(유지보수) | 문서와 코드 상태가 일치해서 헷갈리지 않는다 |

---

## 5~7. 플랫폼별 유저 스토리 · 수용 기준 · 기능 범위

### 웹

**유저 스토리**
- As a **개발자**, I want to **미구현 포트폴리오 템플릿이 사용자에게 선택되지 않도록(또는
  선택 시 명확히 안내되도록)**, so that **선택했는데 아무것도 안 바뀌는 혼란을 없앤다**.
- As a **개발자**, I want to **`PORTFOLIO_FEATURES.md` 참조가 실제 문서를 가리키길**,
  so that **CLAUDE.md를 읽는 사람이 존재하지 않는 파일을 찾아 헤매지 않는다**.

**수용 기준**
- [ ] **AC-W1**: 프로필 설정의 템플릿 선택 UI에서 미구현 템플릿 4종에 "준비 중" 표시가
  선택 전에 보인다(선택 후에야 아는 게 아니라).
- [ ] **AC-W2**: `CLAUDE.md`의 `PORTFOLIO_FEATURES.md` 참조가 실제 존재하는 문서를
  가리키도록 갱신되거나, 해당 문서가 복원된다.

**기능 범위**: In — 템플릿 선택 UI 안내 문구, 문서 참조 정정. Out — FILM/SPLIT/MOSAIC/
MAGAZINE 실제 디자인·구현(별도 스프린트, 템플릿당 반나절 이상).

### 모바일

**유저 스토리**
- As a **개발자**, I want to **AppNavigator에 연결되지 않은 고아 화면이 저장소에 남아있지
  않길**, so that **다음에 이 코드를 볼 때 "이거 쓰는 건가?" 헷갈리지 않는다**.

**수용 기준**
- [ ] **AC-M1**: `ListScreen.js`/`PostDetailScreen.js`를 삭제하거나(더 이상 필요 없다면),
  실제 네비게이션에 연결하고 API 필드명을 현재 컨벤션(`likesCount`/`savesCount`)에 맞춘다
  — 둘 중 하나로 결론 낸다. **이 결정은 사용자 확인이 필요하다**(과거 작업 흔적을 임의로
  지우는 건 큰 판단이라 에이전트가 혼자 정하지 않는다).

**기능 범위**: In — 위 결정 반영. Out — 앱스토어 제출 자체(아이콘/스크린샷/개인정보
선언 등은 CLAUDE.md에 이미 체크리스트가 있고, 이 문서의 로드맵에서는 다루지 않는다 —
별도 배포 준비 작업이라 이 마스터 플랜의 "코드 개선" 범위를 벗어난다).

### 어드민

**유저 스토리**
- As a **운영자**, I want to **신고 목록이 실제 데이터를 보여주길**, so that **화면에
  보이는 게 실제 상황인지 mock인지 헷갈리지 않고 안심하고 조치할 수 있다**.

**수용 기준**
- [ ] **AC-A1**: `GET/PUT /api/admin/reports`, `DELETE /api/admin/reports/:id/photo`
  엔드포인트가 실제로 구현되고, `AdminModerationPage.jsx`가 mock 대신 이걸 호출한다.
- [ ] **AC-A2**: 새 엔드포인트가 `hasAnyRole('WM','SA')`로 서버사이드 권한 체크된다
  (`admin` 에이전트 문서의 명칭 불일치 주의사항 반영).
- [ ] **AC-A3**: 신고 대상 콘텐츠(사진) 삭제 같은 위험 액션에 이중 확인 UI가 있다
  (기존 `AdminMembersPage`/`AdminPhotosPage` 패턴 재사용).

**기능 범위**: In — 신고 백엔드 엔드포인트 3개 + 프론트 mock 교체. Out — 신고 사유
분류 체계 고도화, 자동 모더레이션(AI 필터링) 같은 확장 기능.

---

## 8. 기술 트레이드오프

| 이슈 | 옵션 | 장점 | 단점 | 채택 |
|---|---|---|---|---|
| 배포 시크릿 미등록 | 그대로 둔다 | 당장 할 일 없음 | 앱이 계속 미배포 상태로 남음 — 기능이 아무리 늘어도 실사용자 0명 | ❌ |
| | 사용자에게 등록 절차 안내 + 등록되면 즉시 배포 확인 | 실제 문제 해결의 유일한 경로 | 에이전트가 대신 못 함, 사용자 액션 필요 | ✅ |
| 미구현 템플릿 4종 | 계속 선택 가능하게 둔다("준비중" 배너로 폴백) | 코드 변경 없음 | 사용자가 골랐는데 아무 변화 없어 혼란 | ❌(현행 유지 시 최소한 선택 *전에* 안내는 추가) |
| | 선택 UI에서 미리 "준비중" 표시 | 혼란 방지, 구현 없이 가능 | 근본 해결(실제 디자인)은 아님 | ✅ (임시 조치, P0) |
| | 선택지에서 완전히 숨김 | 가장 깔끔 | 이미 그 값으로 저장된 기존 회원 설정 처리 필요(마이그레이션 고려) | P1 검토 |
| 모바일 고아 화면 | 조용히 삭제 | 정리됨 | 과거 작업 의도를 모른 채 지우면 필요했던 기능을 잃을 수 있음 | ❌ (사용자 확인 없이는) |
| | 사용자에게 물어보고 결정 | 안전 | 한 턴 더 필요 | ✅ |

---

## 9. 우선순위 로드맵

### P0 — 즉시 (신뢰도/가동 여부에 직결)

| 항목 | 담당 | 플랫폼 | 비고 |
|---|---|---|---|
| Railway/Vercel GitHub Secrets 등록 안내 | **사용자**(에이전트 불가) | 배포 | `deployer` 에이전트가 정확한 절차 안내 가능, 등록 자체는 대시보드 로그인 필요 |
| 미구현 템플릿 선택 UI에 "준비중" 사전 안내 추가 | 에이전트 | 웹 | 코드 변경만으로 가능, 공수 작음(1시간 내) |
| `AdminModerationPage` 백엔드 연동(report 엔티티/컨트롤러/서비스 + mock 교체) | 에이전트 | 어드민 | 신규 feature 패키지, `IF NOT EXISTS` 멱등 마이그레이션 SQL 필요 |

### P1 — 단기

| 항목 | 담당 | 플랫폼 | 비고 |
|---|---|---|---|
| 모바일 고아 화면(ListScreen/PostDetailScreen) 처리 방향 결정 + 반영 | 사용자 확인 후 에이전트 | 모바일 | 삭제 vs 연결, 판단 필요 |
| `CLAUDE.md`의 `PORTFOLIO_FEATURES.md` 참조 정정(문서 복원 또는 참조 제거) | 에이전트 | 문서 | 이 마스터 문서로 대체 링크 가능 |
| 미구현 템플릿 4종을 선택지에서 숨길지 최종 결정 | 사용자 확인 | 웹 | 기존 선택 회원 데이터 처리 포함 |

### P2 — 중기

| 항목 | 담당 | 플랫폼 | 비고 |
|---|---|---|---|
| FILM/SPLIT/MOSAIC/MAGAZINE 실제 디자인·구현 | 에이전트(`designer`/`/design`) | 웹 | 템플릿당 반나절~1일, 레지스트리 구조 덕분에 추가 자체는 쉬움 |
| 앱스토어 제출 준비(아이콘/스크린샷/개인정보 선언) | 사용자 | 모바일 | CLAUDE.md 기존 체크리스트 참고 |
| GalleryPage 600px/ExplorePage 640px 등 잔여 브레이크포인트 값 통일 | 에이전트 | 웹 | 해당 파일을 다른 이유로 만질 때 점진적으로 |

---

## 10. 성공 지표 (KPI)

- **배포 가동률**: `deploy-backend`/`deploy-frontend` 잡이 "스킵"이 아니라 실제 실행되어
  성공하는 최초 1회(그 이후 지속).
- **어드민 신뢰도**: `AdminModerationPage`가 실제 DB 데이터를 보여줌(mock 문자열 0건).
- **문서 정합성**: `CLAUDE.md`가 참조하는 파일 중 존재하지 않는 것 0건.
- **죽은 코드**: `AppNavigator.js`에 연결되지 않은 화면 파일 0개.

---

## 11. 관련 파일 (기존 기획 문서 — 여기서 다시 쓰지 않음)

- `DESIGN_PROMPTS/planning/PLANNING_multiplatform-uiux-improvement.md` — 웹/모바일/태블릿 UI 개선
- `DESIGN_PROMPTS/planning/PLANNING_portfolio-scalable-expansion.md` — 포트폴리오 템플릿 레지스트리·태블릿·모바일 아웃링크
- `DESIGN_PROMPTS/planning/PLANNING_portfolio-strong-identity.md` — 포트폴리오 아이덴티티 강화
- `.claude/agents/deployer.md` — 배포 파이프라인 상세 아키텍처·트러블슈팅
- `.claude/agents/admin.md` — 어드민 권한 명칭 불일치, 위험 액션 이중확인 원칙
- `.claude/skills/design/SKILL.md`, `.claude/skills/plan/SKILL.md` — 이번 세션에 신설된 디자인/기획 스킬
