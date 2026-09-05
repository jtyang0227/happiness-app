# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Harness 작업 원칙 (Inspect → Plan → Execute → Verify → Review → Fix → Re-verify)

Claude Code는 단순 코드 생성기가 아니라 스스로 계획·실행·검증하는 Software Engineering Agent로 동작한다.
모든 작업은 아래 루프를 따른다: **Inspect → Plan → Execute → Verify → Review → Fix → Re-verify**

1. **먼저 이해하고 그다음 수정** — 수정 전 관련 코드·설정·기존 컨벤션을 확인한다. 충분한 근거 없이 새
   라이브러리·구조를 도입하지 않는다(아래 "개발자" 역할 규칙과 동일 원칙).
2. **Plan 먼저** — Goal / Constraints / Existing Context / Implementation Plan / Verification Plan을
   내부적으로 정리한 뒤 구현을 시작한다. 복잡한 작업은 여러 단계로 분해한다.
3. **작은 단위로 실행** — 탐색 → 최소 변경 → 검증 → 확인 → 다음 변경 순으로 진행하고, 각 단계가 이전
   단계의 가정을 깨지 않는지 확인한다.
4. **기존 코드를 최대한 존중** — 기존 함수·컴포넌트·유틸리티·에러 처리 방식·네이밍·디렉터리 구조·기존
   dependency를 우선 재사용한다. 구현 가능하다는 이유만으로 새 라이브러리를 추가하지 않는다.
5. **검증은 선택이 아니다** — 이 저장소에 실제로 존재하는 명령만 사용한다(다른 스택의 `pytest`/`go test`
   같은 명령을 상상해서 실행하지 않는다). 상세 절차는 `기능 구현 테스트 규칙` 섹션 참고:
   - 백엔드: `./gradlew clean build -x test` + `./gradlew test`
   - 프론트엔드: `npm run build` ("Compiled successfully." 확인)
   - 모바일: `npx expo export --platform web` ("Finished saving JS Bundles" 확인)
6. **실패하면 원인을 분석하고 수정한다** — 실패 상태로 완료라고 보고하지 않는다. 확인 → 원인 분석 →
   관련 코드 확인 → 수정 → 재실행 → 통과 확인 루프를 돈다. 에러 은닉, 테스트 삭제, 검증 우회로 실패를
   숨기지 않는다.
7. **자기검토(Self Review)** — 완료 전 Correctness / Regression / Edge Cases / Security / Performance /
   Maintainability / Scope(요청 범위를 벗어난 불필요한 변경 여부) 7가지를 스스로 점검한다.
8. **git diff 확인** — push 전 `git status`/`git diff`로 의도치 않은 파일 변경, 디버그 코드
   (console.log 등), 시크릿·크레덴셜, 임시 파일이 섞이지 않았는지 확인한다.
9. **요구사항 대조** — 최초 요구사항을 항목별로 완료/미완료 대조하고, 미완료 항목이 있으면 계속
   진행한다.
10. **모호한 요구사항 처리 우선순위** — 기존 코드 패턴 → 프로젝트 문서(CLAUDE.md) → 테스트 코드 →
    설정 파일 → 사용자의 명시적 요구사항 → 일반적인 소프트웨어 엔지니어링 관행 순으로 판단한다. 이래도
    판단 불가능한 중요한 결정만 사용자에게 질문하고, 사소한 구현 디테일 때문에 작업을 중단하지 않는다.
11. **위험한 변경은 먼저 확인** — DB 스키마 변경, 데이터 삭제, 인증/권한 변경, 운영 설정 변경, 마이그
    레이션, 대규모 삭제, 배포 설정 변경은 영향을 먼저 분석한다(운영 DB `ddl-auto: validate` 규칙과 연계).
12. **절대 금지** — 테스트를 무력화하거나 삭제해서 통과시키기, 에러 은닉용 try-catch 남발, lint 규칙
    무분별 disable, 근거 없는 타입 우회, 검증 없이 "완료"라고 보고, 검증 결과 조작.

**작업 규모별 강도**
- Simple: Inspect → Implement → Test → Review
- Medium: Inspect → Plan → Implement → Test → Diff Review → Fix → Re-test
- Complex: Inspect → Requirements/Architecture 분석 → 상세 Plan → 단계별 구현 → 단위/통합 테스트 →
  Build → Diff Review → Security Review → Final Verification

**최종 보고 형식**: 변경 사항 / 검증(실행한 명령과 결과) / 주의 사항 순으로 간결히 보고한다. 검증하지
않은 항목은 통과했다고 표현하지 않는다.

---

## 기획 자동 Loop 규칙

**메시지에 "기획"이 포함된 요청이 들어오면 반드시 `/loop` 스킬을 즉시 호출한다.**

Loop 수행 순서:
1. `DESIGN_PROMPTS/design/DESIGN_PROMPT_<feature>.md` 디자인 프롬프트 작성 (Claude.ai 아티팩트용)
2. 백엔드 구현 (Spring Boot — 엔티티/서비스/컨트롤러)
3. 프론트엔드 구현 (React 페이지/컴포넌트/API 연동)
4. 디자인 완성 (DESIGN_PROMPT 파일 포함, inline style 준수)
5. `/verify` 로 런타임 검증
6. `git commit + push` 완료

`/loop` 는 모든 단계가 완료될 때까지 자율적으로 반복한다. 사용자 승인 없이 진행한다.

---

## 에이전트 역할 정의

이 프로젝트에서 Claude는 작업 유형에 따라 아래 시니어급 역할로 동작한다.  
**모든 역할은 시니어 10년 이상 수준의 판단력·품질 기준을 유지한다.**

### 기획자 (PM / Product Manager)
- 사용자 가치 중심으로 기능 우선순위를 결정한다
- 요구사항 분석 → 유저 스토리 → 수용 기준(AC) 순으로 문서화한다
- 기술 부채와 비즈니스 임팩트를 함께 고려해 트레이드오프를 명시한다
- 새 기능 작업 시 `DESIGN_PROMPTS/planning/` 하위에 기획 문서, `DESIGN_PROMPTS/design/` 에 디자인 프롬프트를 먼저 작성한다

### 디자이너 (Senior UX/UI Designer)
- 모바일 퍼스트, 접근성(WCAG 2.1 AA) 기준을 항상 준수한다
- 컬러는 `constants/colors.js` 토큰만 사용하고 하드코딩하지 않는다
- 이모지/유니코드로 아이콘을 대체하고 외부 아이콘 라이브러리를 추가하지 않는다
- 인터랙션마다 hover·focus·active 상태를 정의한다
- 스켈레톤 로딩과 EmptyState를 모든 비동기 화면에 적용한다

### 개발자 (Senior Full-Stack Developer)
- 프론트엔드: React 18 함수형 컴포넌트, inline style, React Router v6 준수
- 백엔드: Spring Boot 3 / Java 25, feature-based 패키지, JPA + JPQL 사용
- 보안 취약점(XSS, SQLi, IDOR, 파일 업로드 우회)을 코드 작성 시 자동으로 차단한다
- 외부 라이브러리 추가 전 반드시 기존 코드로 구현 가능한지 먼저 검토한다
- 모든 API 호출은 try-catch + 사용자 친화적 오류 처리를 포함한다

### QA (Senior QA Engineer)
- 기능 구현 후 반드시 골든 패스(happy path) + 엣지 케이스를 모두 테스트한다
- 백엔드: `./gradlew test` 통과 확인 후 커밋한다
- 프론트엔드: `npm run build` 성공 확인, 수동 체크리스트(로그인·CRUD·반응형) 수행
- 회귀(regression) 가능성이 있는 변경은 인접 기능도 함께 검증한다
- 테스트 실패 시 "무시하고 배포" 금지 — 근본 원인을 찾아 수정한다

### DBA (Senior Database Administrator)
- 운영 DB는 `ddl-auto: validate` 고정 — `create`/`create-drop` 절대 금지
- 새 컬럼·인덱스·테이블은 `CLAUDE.md` 운영 DB 마이그레이션 섹션에 SQL을 기록한다
- N+1 쿼리 발생 가능성을 항상 검토하고 JPQL fetch join 또는 별도 쿼리로 해결한다
- 인덱스는 WHERE·ORDER BY·JOIN 컬럼에만 추가하고 과잉 인덱싱을 피한다
- 운영 마이그레이션은 `IF NOT EXISTS` / `IF EXISTS` 구문으로 멱등성을 보장한다

### Admin (어드민 운영자)
- 위 5개 역할의 권한을 모두 갖는다 (기획 + 디자인 + 개발 + QA + DB)
- 어드민 전용 기능(`/admin/**`)은 인증된 ADMIN 역할만 접근 가능하도록 강제한다
- 회원 관리·콘텐츠 삭제·순서 변경 등 불가역적 작업은 확인 다이얼로그를 반드시 추가한다
- 어드민 UI는 실수를 방지하는 방향으로 설계한다 (위험 액션은 빨간색 + 이중 확인)
- 운영 데이터 접근 로그는 서버 콘솔에 INFO 레벨로 남긴다
- **Claude Code 에이전트**: `.claude/agents/admin.md` — 어드민 패널/운영 데이터 총괄 에이전트 (subagent_type: `admin`).
  회원·사진·태그·신고 관리 기능 구현, 위험 액션 이중 확인 강제, `AdminModerationPage`(백엔드 연동 완료 —
  `report/` 패키지, `GET /api/admin/reports`, `PUT /api/admin/reports/:id`) 같은 어드민 기능 완성 담당. "어드민 기능 추가",
  "회원 관리 기능", "해피니스 앱 관리해줘" 요청 시 호출.

---

## AI 협업 역할 (AI Tool Roles)

이 프로젝트는 작업 영역별로 담당 AI 도구를 지정하여 협업한다.

### 기획 (Planning) — Pomelli
- 요구사항 분석 및 기능 정의
- 화면 및 사용자 플로우 설계
- 작업 우선순위 결정
- 기획 변경 사항은 Pomelli 기준으로 작성하고 `DESIGN_PROMPTS/planning/` 에 문서화한다

### 디자인 (Design) — Stitch / designer 에이전트
- UI/UX 디자인 및 컴포넌트 구조 제안
- 스타일 및 디자인 시스템 관리
- 반응형 레이아웃 설계
- UI/UX 관련 사항은 Stitch의 결과를 우선 반영한다
- **Claude Code 에이전트**: `.claude/agents/designer.md` — Google Stitch 방법론 기반 자율 디자인 에이전트 (subagent_type: `designer`). "디자인해줘", "화면 만들어줘" 요청 시 자동 호출.
- **Claude Code 스킬**: `.claude/skills/design/SKILL.md` (`/design`) — 현재 세션에서 바로 실행되는 Stitch 워크플로우(UNDERSTAND→PLAN→GENERATE→BUILD→**PREVIEW(Playwright 브라우저 스크린샷 자가 검수·수정 루프, 생략 금지)**→ITERATE). `designer` 에이전트와 역할은 겹치지만 PREVIEW 단계 필수 여부가 다르다.

### 자동화 (Automation) — AI Studio
- 반복 작업 자동화 및 스크립트 생성
- 배포 및 워크플로우 자동화
- 생산성 향상을 위한 도구 연동
- 반복 작업 및 자동화는 AI Studio를 적극 활용한다
- **Claude Code 에이전트**: `.claude/agents/deployer.md` — 배포/CI-CD 관리 에이전트 (subagent_type: `deployer`).
  GitHub Actions(`deploy.yml`) 실패 진단, 배포 전 빌드·마이그레이션 체크, Railway/Vercel 트러블슈팅,
  운영 DB 마이그레이션 절차 안내 담당. "배포해줘", "배포 확인", "CI 실패 확인" 요청 시 호출.

### 협업 원칙
- 기획 변경은 Pomelli 기준으로 작성한다
- UI/UX 사항은 Stitch 결과를 우선 반영한다
- 반복 작업·자동화는 AI Studio를 적극 활용한다
- 코드 구현 시 위 역할 분담을 참고하여 일관된 개발 프로세스를 유지한다

---

## 작업 완료 규칙

**모든 작업이 완료되면 반드시 아래를 수행한다:**
1. 작업 내용을 이 CLAUDE.md에 반영 (아키텍처 변경, 새 파일, 설정 변경)
2. **빌드 검증** — push 전 반드시 빌드 성공을 확인한다:
   - 프론트엔드 변경 시: `cd frontend && npm run build` → "Compiled successfully." 확인
   - 백엔드 변경 시: `cd backend && ./gradlew clean build -x test` → "BUILD SUCCESSFUL" 확인
   - 빌드 실패 시 오류를 수정한 후 다시 빌드를 실행한다. 빌드가 실패한 상태로 push 금지.
3. 변경 사항 요약 후 `git commit` + `git push` 까지 완료

---

## 디자인 작업 규칙

**UI/UX 관련 작업(신규 화면, 컴포넌트 개선, 레이아웃 변경)을 할 때는 반드시 아래를 수행한다:**

1. 작업 전에 `DESIGN_PROMPT_<feature>.md` 파일을 생성한다
2. 파일 안에 claude.ai에서 아티팩트로 요청할 수 있는 프롬프트를 작성한다
3. 프롬프트에는 반드시 아래 시스템 컨텍스트를 포함한다:

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템 (Toss 디자인 시스템, 2026-08-29~):
  primary:       '#3182F6'
  primaryDark:   '#1B64DA'
  primaryLight:  '#E8F3FF'
  accent:        '#4E9FFF'
  bg:            '#F2F4F6'
  surface:       '#ffffff'
  border:        '#E5E8EB'
  text:          '#191F28'
  textSecondary: '#4E5968'
  textMuted:     '#8B95A1'
  danger:        '#F04452'
  darkBg:        '#111417'
  darkSurface:   '#1A1E22'
  galleryBg:     '#111417'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
- backdrop-filter/blur, 브랜드 컬러 tint된 그림자, 그라디언트 오브 장식 금지 — 플랫 서페이스만 사용
- 그림자는 중립 회색(rgba(0,0,0,0.04~0.12))만 사용
```

4. 생성된 디자인 프롬프트 MD는 작업 후 `DESIGN_PROMPTS/design/` 폴더에 정리한다
5. **항상** 디자인 작업 시 Claude.ai에서 아티팩트로 요청할 수 있는 디자인 프롬프트를 `DESIGN_PROMPTS/design/DESIGN_PROMPT_<feature>.md` 형식으로 먼저 작성한다

### 현재 디자인 방향 (2026-08-29 기준 — Toss 디자인 시스템으로 전면 교체)

> **Toss 디자인 시스템** 채택 — 이전의 AKIRA Neo-Tokyo(레드+시안) 액센트와
> Cosmos × Pinterest 다크 에디토리얼 방향을 전면 폐기했다.
> 과거 방향 문서는 모두 `DESIGN_PROMPTS/deprecated/`로 이동했다 (iOS 26 Liquid Glass,
> Cosmos/dot-concept, AKIRA Neo-Tokyo 관련 문서 전부 포함).
> 상세: `DESIGN_PROMPTS/design/DESIGN_PROMPT_toss-design-system.md`

**핵심 원칙:**
- **단일 브랜드 컬러**: Toss Blue(`#3182F6`) 하나만 CTA·활성 탭·배지에 사용, 배경을 칠하지 않음
- **플랫 서페이스**: 블러/글래스모피즘/그라디언트 오브 금지, 그림자는 중립 회색만 사용 — **구현 완료** (`constants/glass.js` 삭제)
- **밝은 회색조 배경**: 앱 기본 배경 `#F2F4F6`, 카드 `#ffffff` — **구현 완료** (global.css body, App.jsx bg)
- **의미 컬러 분리**: success/danger/warning은 브랜드 액센트와 무관한 상태 전달 전용
- **다크 예외 영역**: 이미지 뷰어/에디터는 계속 어둡게 유지하되 남색/보라 undertone 없는 중립
  웜그레이-블랙(`#111417`/`#1A1E22`/`#22262B`)으로 통일
- **장식 애니메이션 최소화**: RGB 글리치·aurora 배경·pulseGlow 등 old-era 모션 제거, `spin`/`pulse`/
  `fadeInUp`/`slideUp` 정도의 실용적 모션만 유지 (`constants/animations.js`)
- **어드민도 동일 적용**: 어드민 패널의 glass.js light 계열 예외를 폐지하고 플랫 Toss 서페이스로 통일

**구현 완료 (Toss 디자인 시스템 전환):**
- `constants/colors.js`(웹) / `constants/colors.js`(모바일): Toss 팔레트로 전면 교체
- `constants/glass.js` 삭제 — `constants/animations.js`(GLOBAL_KEYFRAMES, SPRING/EASE)로 대체
- `components/common/AkiraLogo.jsx` → `Logo.jsx`: RGB 글리치 애니메이션 제거, 정적 렌더링
- `App.jsx`, `Header.jsx`, `AdminLayout.jsx`, `GalleryPage.jsx`, `ListPage.jsx`, `SeriesPage.jsx`,
  `LoginPage.jsx`, `SignUpPage.jsx`: glass 유틸/다크 아우라 배경 제거, 플랫 서페이스로 재작성
- `styles/theme.css`, `styles/global.css`: CSS 변수 토큰 및 전역 keyframes/스크롤바/포커스링/
  셀렉션 색상 교체, 다크 body 배경(`#090909`) → 밝은 배경(`#F2F4F6`)
- 나머지 40여 개 파일의 raw AKIRA hex 리터럴을 Toss 블루 계열로 일괄 치환 (웹+모바일)

### 디자인 작업 우선순위 로드맵

전체 우선순위 및 각 작업별 프롬프트 파일은 `DESIGN_PROMPTS/00_ROADMAP.md` 참조.

**P0 — 즉시 수정 (블로커)**
| 파일 | 작업 |
|------|------|
| `P0_01_EMPTY_STATE.md` | 갤러리·탐색·프로필 빈 상태 UI |
| `P0_02_GALLERY_RESPONSIVE.md` | 갤러리 반응형 (모바일 2컬럼) + useBreakpoint 훅 |
| `P0_03_COMMENTS_SECTION.md` | CommentsSection 컴포넌트 분리 (Modal·Detail 공용) |
| `P0_04_MODAL_UX.md` | 모달 body 스크롤 잠금 + 포커스 트랩 |
| `P0_05_IMAGE_ALT.md` | 이미지 alt 텍스트 + aria-label 접근성 |

**P1 — 단기 (1~2주)**
| 파일 | 작업 |
|------|------|
| `P1_01_SKELETON_LOADING.md` | shimmer 스켈레톤 카드 (갤러리·탐색·목록) |
| `P1_02_BUTTON_COMPONENT.md` | 공통 Button 컴포넌트 (variant/size/loading) — **구현 완료** (Feature 38, `components/common/Button.jsx`) |
| `P1_03_INPUT_COMPONENT.md` | 공통 Input·Textarea·FormField 컴포넌트 — **구현 완료** (Feature 38, `components/common/Input.jsx`) |
| `P1_04_HEADER_REDESIGN.md` | Header 아바타 드롭다운 (프로필·로그아웃) |
| `P1_05_EXPLORE_SORT.md` | 탐색 정렬·활성 필터 배지·결과 수 표시 |
| `P1_06_AVATAR_UPLOAD.md` | 프로필 아바타 이미지 업로드 |
| `08_COLOR_PALETTE_DETAIL.md` | 5색 팔레트 추출 · PhotoDetail 강화 (네비게이션/전체화면/관련사진/공유/인쇄) |
| `10_ADMIN_PANEL.md` | Admin 패널 — 갤러리 순서 관리(GalleryOrderPage) · 회원 관리 · 대시보드 |

**P2 — 중기 (1개월)**
| 파일 | 작업 |
|------|------|
| `P2_01_PHOTOFORM_LAYOUT.md` | PhotoForm 2컬럼 레이아웃 (프리뷰·보정패널·메타데이터 바) |
| `P2_02_BEFORE_AFTER.md` | Before/After 이미지 스플릿 슬라이더 |
| `P2_03_INFINITE_SCROLL.md` | 무한 스크롤 (useInfiniteScroll 훅) |
| `P2_04_DRAFT_AUTOSAVE.md` | PhotoForm 드래프트 자동저장 (useDraft 훅) |
| `P2_05_AUTHOR_PROFILE.md` | 작가 공개 프로필 페이지 (/u/:profileName) |
| `09_PORTFOLIO_BUILDER.md` | 슬라이드쇼 뷰어 · 매거진 레이아웃 · PDF 내보내기 · 임베드 코드 |
| `11_IMAGE_EDITOR.md` | 독립 이미지 에디터 SPA — React+TS+Zustand+Konva, 업로드·Transform·색상보정·필터·오버레이·Export (Format.com 스타일) |

---

## Project Overview

**사진작가 포트폴리오 앱** — 풀스택 3-tier 구성:
- **backend/** — Spring Boot 3.4.5 + Java 25, Gradle 9.5
- **frontend/** — React 18 SPA
- **mobile/** — React Native 0.72 + Expo 49

기능 분석 및 로드맵 전체 내용: **`DESIGN_PROMPTS/planning/MASTER_PLAN_happiness-app.md`** 참조
(과거 `PORTFOLIO_FEATURES.md`를 참조했으나 저장소에 해당 파일이 없어 위 마스터 플랜 문서로 대체)

---

## Commands

### Backend
```bash
cd backend
./gradlew bootRun                        # Run dev server (port 8080)
./gradlew clean build -x test            # Build JAR (skip tests)
./gradlew test                           # Run tests
./gradlew test --tests "FullClassName"   # Run a single test class
./gradlew bootJar -x test --no-daemon    # 운영용 JAR 빌드 (app.jar)
```
H2 console available at `http://localhost:8080/h2-console` in dev.  
Production profile: `SPRING_PROFILES_ACTIVE=prod` → PostgreSQL 사용.

### Frontend
```bash
cd frontend
npm install
npm start           # Dev server on port 3000 (.env.development 로드)
npm test
npm run build       # 운영 빌드 (.env.production 로드)
```

### Mobile
```bash
cd mobile
npm install
npm start           # Expo dev server
npm run ios         # iOS simulator
npm run android     # Android emulator (uses 10.0.2.2:8080, not localhost)
```

### Docker (로컬 전체 스택 실행)
```bash
# 루트에서
cp .env.local.example .env.local   # 처음 한 번만 — 실제 값 채울 것
docker-compose up --build          # backend + redis 컨테이너 기동
docker-compose down                # 종료
```

---

## Deployment Architecture

```
User (Web / iOS / Android)
       │
       ▼
Cloudflare (무료 DNS + SSL + CDN + DDoS 보호)
       │
 ┌─────┴──────────────┐
 ▼                    ▼
app.example.com    api.example.com
 │                    │
Vercel             Railway
React SPA          Spring Boot
(무료)             (Hobby $5/월)
                       │
          ┌────────────┼──────────────┐
          ▼            ▼              ▼
     Supabase      Supabase       Upstash Redis
     PostgreSQL    Storage        (무료 10K cmd/일)
     (무료 500MB)  (무료 1GB)
```

### 서비스별 역할

| 영역 | 서비스 | 비용 |
|------|--------|------|
| Frontend | Vercel | 무료 |
| Backend | Railway | $5/월 |
| DB | Supabase PostgreSQL | 무료 (500MB) |
| Storage | Supabase Storage | 무료 (1GB) |
| Cache | Upstash Redis | 무료 (10K/일) |
| DNS + SSL | Cloudflare | 무료 |
| CI/CD | GitHub Actions | 무료 (2000분/월) |
| 도메인 | .com 구매 | ~$10/년 |

---

## Environment Variables

### 환경변수 관리 원칙
- **`.env.local`** — 로컬 개발 시크릿 (절대 커밋 금지, .gitignore 포함)
- **`.env.local.example`** — 팀원 공유용 템플릿 (커밋 가능, 실제 값 없음)
- **Railway Variables** — 운영 환경변수 (Railway 대시보드에서 설정)
- **GitHub Secrets** — CI/CD 파이프라인용 시크릿

### 필수 환경변수 목록

```bash
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...           # 프론트엔드/백엔드 공용
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # 백엔드 전용 (절대 프론트 노출 금지)
SUPABASE_BUCKET=images

# JWT
JWT_SECRET=<openssl rand -base64 64>  # 최소 256비트

# Database (운영)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://default:token@host:port  # 운영 Upstash
REDIS_HOST=localhost                        # 로컬 개발

# CORS
CORS_ALLOWED_ORIGINS=https://app.example.com

# Spring
SPRING_PROFILES_ACTIVE=prod  # 운영 | dev (기본값)

# Gemini (AI 어시스턴트 챗봇 — 백엔드 전용, aistudio.google.com/apikey 에서 발급)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.0-flash  # 선택, 미설정 시 기본값

# Kakao OAuth (프론트엔드 — .env.development / Vercel)
REACT_APP_KAKAO_APP_KEY=YOUR_KAKAO_REST_API_KEY
REACT_APP_KAKAO_REDIRECT_URI=https://app.example.com/oauth/kakao/callback

# Google OAuth
REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
REACT_APP_GOOGLE_REDIRECT_URI=https://app.example.com/oauth/google/callback

# Naver OAuth
REACT_APP_NAVER_CLIENT_ID=YOUR_NAVER_CLIENT_ID
REACT_APP_NAVER_REDIRECT_URI=https://app.example.com/oauth/naver/callback

# Apple OAuth (HTTPS 필수)
REACT_APP_APPLE_CLIENT_ID=com.happiness.gallery.web
REACT_APP_APPLE_REDIRECT_URI=https://api.example.com/api/auth/oauth/apple/callback
```

---

## Architecture

### Backend (`com.happiness.app`)

Feature-based package layout:

- **photo/** — Core domain. `PhotoController` exposes REST endpoints for CRUD plus likes/saves/shares/tags. Entities: `Photo`, `PhotoLike`, `PhotoSave`, `PhotoShare`, `PhotoTag`. **버그 수정**: `PhotoResponse`가 `memberId`만 담고 작성자 이름/아바타를 전혀 반환하지 않아 PhotoDetailPage·FeedPage·매거진 뷰어 등 모든 화면에서 작성자가 항상 "익명"으로 표시되던 문제 수정 — `memberName`/`memberAvatarUrl`/`memberProfileName` 필드 추가 + `PhotoResponse.attachMember(s)()` 헬퍼로 `MemberRepository` 배치 조회(N+1 방지) 후 채워넣음. `PhotoController.getAllPhotos`/`getPhoto`, `FeedController.getFeed`에 적용. `SeriesController`의 사진 목록은 아직 미적용(known gap).
- **member/** — Auth & users. `AuthController` handles signup/login/stats/password-change. `KakaoOAuthService` handles Kakao OAuth. `SecurityConfig` (in `config/`) configures Spring Security. `Member` entity includes: avatarUrl, coverUrl, bio, websiteUrl, location, specialties (Phase 2-8 추가). `MemberStatsResponse` — 통계 6종(photoCount/totalLikes/totalSaves/totalShares/inquiryCount/unreadInquiryCount). Endpoints: `GET /member/:id/stats`, `PUT /member/:id/password`, `GET /members/search?q=&size=`(인증된 유저 누구나, 이름/프로필명 검색, 최대 30건, Meets 약속 요청 상대 찾기용 — `MemberRepository.searchByNameOrProfileName`). **버그 수정**: `AuthService.login()`이 `findByEmail(request.getEmail())`을 그대로 사용해 회원가입 시 소문자로 정규화된 이메일과 대소문자가 다르면 로그인이 항상 실패하던 문제 수정 — `.trim().toLowerCase()` 추가(signup과 동일하게 정규화).
- **member/service/GoogleOAuthService** — Google OAuth 2.0. `googleLogin(code)` → Token URL: `oauth2.googleapis.com/token`, UserInfo: `googleapis.com/oauth2/v2/userinfo`.
- **member/service/NaverOAuthService** — 네이버 OAuth 2.0. `naverLogin(code, state)` → Token: `nid.naver.com/oauth2.0/token`, UserInfo: `openapi.naver.com/v1/nid/me`.
- **member/service/AppleOAuthService** — Apple Sign In. `appleLogin(idToken, userJson)` → id_token JWT 디코딩(base64)으로 sub+email 추출. `generateClientSecret()` → JJWT ES256으로 client_secret JWT 생성.
- **member/service/AuthService** — `issueTokensForOAuth(MemberResponse, HttpRequest)` 추가 — 소셜 로그인 공통 JWT 발급.
- **portfolio/** — `PortfolioController` — 공개 포트폴리오. `GET /api/portfolio/{profileName}` (공개, 사진/시리즈/통계 포함). `GET /api/portfolio/{profileName}/config` (공개, 템플릿·스타일·섹션 JSON 반환). `PUT /api/portfolio/{profileName}/template` (인증 필요, IDOR 방지: 본인/ADMIN만). `PortfolioConfigResponse` DTO (`template`, `styleJson`, `sectionsJson`). `Member` 엔티티에 `portfolioTemplate`(VARCHAR 20), `portfolioStyleJson`(TEXT), `portfolioSectionsJson`(TEXT) 3개 컬럼 추가.
- **series/** — `SeriesController` (`/api/series`) — 시리즈/컬렉션 CRUD. `Series` 엔티티 + `SeriesPhoto` 조인 테이블. GET(목록/상세)은 공개, POST/PUT/DELETE/사진추가제거는 인증 필요.
- **inquiry/** — `InquiryController` (`/api/inquiry`) — 촬영 문의. `Inquiry` 엔티티. POST(문의 전송)는 공개. `InquiryEmailService`는 `@Autowired(required=false)`로 메일 서버 없어도 동작. 수신함/읽음처리/삭제는 인증 필요.
- **storage/** — Supabase Storage 연동. `SupabaseStorageService` (WebClient 기반 업로드/삭제), `StorageController` (`POST /api/upload/image`).
- **follow/** — `FollowController` (`/api/follows`) — 팔로우/언팔로우/확인/카운트/목록. `Follow` 엔티티 (UniqueConstraint on follower_id+following_id). `FollowService.getFollowingIds()` — FeedController에서 피드 구성에 사용.
- **comment/** — `CommentController` (`GET/POST /api/photos/:id/comments`, `DELETE /api/comments/:id`). `Comment` 엔티티 (parentId nullable = 대댓글 지원). `CommentService.getComments()` — LinkedHashMap으로 top-level 수집 후 replies attach.
- **feed/** — `FeedController` (`GET /api/feed?memberId=&page=&size=`) — `FollowService.getFollowingIds()` + `PhotoRepository.findByMemberIdInOrderByCreatedAtDesc()` (JPQL + Pageable).
- **photo/service/AutoTagService** — 키워드 추출(title+description, stop-word 필터) + MOOD_TAGS 매핑. `POST /api/photos/:id/auto-tags` (max 10 tags).
- **common/** — `HelloController` (health check), `ImageProcessingUtil` (upload + Thumbnailator resize).
- **board/** — Placeholder; `Board`/`Content` entities with repositories, no service layer yet.
- **config/** — `WebConfig` (CORS 설정 포함), `SecurityConfig`, `RedisConfig`, `AsyncConfig` (@EnableScheduling 추가).
- **delivery/** — 클라이언트 배달 포털. `DeliverySetController` (`/api/delivery`). `DeliverySet` 엔티티 (token 32자 UUID, expiresAt, BCrypt 비밀번호, status PENDING/APPROVED/REJECTED). `DeliverySetPhoto` (EmbeddedId 복합 PK, liked 필드). 공개 엔드포인트: GET/PUT `/api/delivery/{token}**`. 인증 엔드포인트: POST/GET/DELETE. 비밀번호 시도 5회 초과 시 15분 차단 (in-memory ConcurrentHashMap). @Scheduled(cron="0 0 * * * *") 만료 세트 자동 정리.
- **analytics/** — 방문자 분석. `AnalyticsController` (`/api/analytics`). `AnalyticsEvent` 엔티티 (eventType/targetType/targetId/memberId/visitorToken). 공개: POST `/api/analytics/track` (visitorToken 60req/min rate limit). 인증(본인만): GET summary/daily/top-photos/genre-distribution. `AnalyticsService`: KpiSummaryDto(기간 대비 % 변화), 일별 조회수(JPQL YEAR/MONTH/DAY), 장르 분포(PhotoRepository.countByGenre 재사용).
- **booking/** — 촬영 예약 캘린더. `BookingController` (`/api/booking`). `Booking` 엔티티 (shootDate/shootTime/status REQUESTED/CONFIRMED/REJECTED/CANCELLED). `BookingAvailability` (weekdays 콤마CSV, timeSlots 콤마CSV, isActive). `BookingBlockedDate` (UniqueConstraint member_id+blocked_date). 공개: GET `/{profileName}/availability`, POST `/{profileName}` (IP 기준 10req/min rate limit). 인증: 예약 확정/거절/취소, 예약 설정, 차단 날짜 관리. IDOR 검사: findByIdAndMemberId. `BookingBatchService.expireStaleBookings()` — `@Scheduled(cron="0 0 2 * * *")` 매일 02:00, `shootDate` 가 지난 REQUESTED 예약을 CANCELLED로 일괄 전환(bulk `@Modifying @Query`, 달력 슬롯 영구 점유 버그 해소) + `blockedDate` 30일 초과 `BookingBlockedDate` 삭제. 예외 발생 시 catch(Exception)+log.error로 스킵 후 다음날 재시도(delivery cleanup과 동일 패턴).
- **report/** — 콘텐츠 신고. `PhotoReportController` (`/api/photos`) — 사용자 신고 접수(`POST /api/photos/{photoId}/report`, reason 유효성 검사, OTHER이면 detail 필수, rate limit 10분 5건), 내 신고 목록(`GET /api/photos/reports/mine`), 읽지 않은 처리 결과 수(`GET /api/photos/reports/mine/unread-count`, `{"count":N}`), 결과 확인 처리(`PUT /api/photos/reports/mine/{id}/seen`). `AdminReportController` (`/api/admin/reports`) — 목록 페이징(`GET ?status=&page=&size=`), 상태 변경(`PUT /{id}`, RESOLVED/DISMISSED + resolutionNote). `Report` 엔티티 (photoId/reporterId/reason/detail/evidenceUrl/status/resolutionNote/reporterSeen/createdAt/resolvedAt). 배치 조회로 N+1 방지. 운영 로그 INFO 레벨.
- **testimonial/** — `TestimonialController` (`/api/testimonials`). `Testimonial` 엔티티 (memberId/clientName/clientRole/content/shootDate/featured/displayOrder). 공개: GET `/member/{memberId}`. 인증: POST/PUT/{id}/DELETE/{id} (IDOR 검사).
- **press/** — `PressController` (`/api/press`). `PressFeature` 엔티티 (publication/title/url/publishedDate/logoUrl), `Achievement` 엔티티 (type AWARD|EXHIBITION|PUBLICATION/title/organizer/location/yearMonth). 공개: GET `/member/{memberId}` → `{press:[], achievements:[]}`. 인증: POST/DELETE (각각).
- **pricing/** — `PricingController` (`/api/pricing`). `PricingPackage` 엔티티 (name/price/priceLabel/description/features TEXT/featured/displayOrder/active). 공개: GET `/member/{memberId}` (active만). 인증: GET `/my` (전체), POST/PUT/{id}/DELETE/{id}.
- **brand/** — `ClientBrandController` (`/api/brands`). `ClientBrand` 엔티티 (name/logoUrl/displayOrder). 공개: GET `/member/{memberId}`. 인증: POST/PUT/{id}/DELETE/{id}.
- **newsletter/** — `NewsletterController` (`/api/newsletter`). `NewsletterSubscriber` 엔티티 (memberId/email/token UUID/subscribedAt/unsubscribedAt, UNIQUE member_id+email). 공개: POST `/subscribe/{memberId}` (IP 기준 5req/min, 재구독 처리), GET `/unsubscribe/{token}`. 인증: GET `/subscribers`.
- **meet/** — `MeetController` (`/api/meets`) — 모델·작가 약속 커뮤니케이션 공간 (Feature 35). `Meet` 엔티티 (status PENDING/NEGOTIATING/CONFIRMED/COMPLETED/CANCELLED, locationName/Address/Lat/Lng, confirmedDate DATE, confirmedTime VARCHAR(10), initialMessage TEXT, @PrePersist/@PreUpdate updatedAt). `MeetAvailability` (meetId+memberId UNIQUE, availableDates/Times TEXT 콤마구분). `MeetMessage` (senderId/senderName/senderAvatar/content TEXT). IDOR 검사: `findByIdAndMemberId()` — 요청자·수신자 외 접근 차단. XSS: `sanitize()` HTML 태그 제거. 좌표 검증: lat(-90~90)/lng(-180~180). 상태 전환: PENDING→NEGOTIATING(accept), NEGOTIATING→CONFIRMED(confirmDate), CONFIRMED→COMPLETED(complete), 언제나→CANCELLED. 인증 필요(모든 엔드포인트): POST(생성), GET(목록/상세/pending-count), PUT(respond/confirm/location/cancel/complete), GET/POST(messages), GET/POST(availability). `MeetBatchService.completeExpiredMeets()` — `@Scheduled(cron="0 0 3 * * *")` 매일 03:00, `confirmedDate` 가 지난 CONFIRMED 약속을 COMPLETED로 일괄 전환(bulk `@Modifying @Query`). PENDING/NEGOTIATING 장기 무응답 자동 취소는 컷오프 일수 제품 결정 필요로 P1 보류 (`DESIGN_PROMPTS/planning/PLANNING_batch-jobs.md` 참고).
- **gathering/** — 사진 모임(Photo Gathering) SNS (Feature 37, 기획: `DESIGN_PROMPTS/planning/37_PHOTO_GATHERING_SNS.md`). **`meet/`(Feature 35, 1:1 모델-작가 약속)와 이름이 겹치지 않도록 의도적으로 `gathering`으로 명명** — 완전히 다른 기능(N명 그룹 촬영 모집)이니 혼동 금지. STEP3 슬라이스 1~5(모임 CRUD + 참여/미참여 + 대기자 승격 + 자동 상태전환 배치 + 모임 진행중 피드 + 좋아요/댓글 + 앨범 + 달력 + 인앱 알림 + Instagram 공유 백엔드+모바일)까지 구현 완료. **애니메이션 폴리시 패스**(`animate` 스킬, CLAUDE.md "장식 애니메이션 최소화" 정책 그대로 유지 — 스프링 바운스 없이 `fadeInUp`/`slideUp` 등 기존 실용적 모션만 재사용): 목록/피드/앨범/알림/참여자 관리/달력의 리스트 아이템에 30~40ms 스태거 등장 모션 추가, 참여·미참여 모달과 사진 업로드 바텀시트에 배경 페이드+카드 스케일업(scale(0) 아님, 0.97→1) 등장 모션 추가, 좋아요 하트 아이콘에 클릭 시 스케일 피드백(transition 기반, 반복 클릭에도 keyframe처럼 처음부터 재생되지 않음) 추가. **버그 회피**: 등장 애니메이션이 `transform`을 쓰는데 카드가 hover 시에도 `transform`(리프트/확대)을 쓰면 마운트 애니메이션의 `fill-mode: both`가 hover 값을 영구히 덮어써버려 호버가 죽는다 — `GatheringCard`/`AlbumPhoto`처럼 hover-transform이 있는 컴포넌트는 등장 애니메이션을 바깥 wrapper에, hover는 안쪽 요소에 분리해서 회피(이 패턴을 다른 곳에도 재사용할 것). `styles/global.css`의 전역 `fadeInUp`/`slideUp`/`fadeUp` keyframe에 `prefers-reduced-motion: reduce` 시 위치 이동 제거(페이드만 유지) 대응 추가 — 기존에 없던 전역 접근성 갭이었음. `GatheringInstagramController`(`/api/gatherings`, sibling 컨트롤러, 전체 인증 필요) — GET `/{id}/instagram-candidates`(이 모임의 PARTICIPATING 참여자 중 `Member.instagramId` 등록자 목록, 본인 제외, 요청자도 PARTICIPATING이어야 함)/POST `/{id}/instagram-share`(공유 시도 로깅, template은 PHOTO_ONLY/PHOTO_PARTICIPANTS/PHOTO_TEXT 중 하나). `InstagramStoryShare` 엔티티 — **status 컬럼 없음**(OS 레벨 딥링크의 실제 완료 여부를 서버가 알 방법이 없어 "시도"만 기록, 39_PHOTO_GATHERING_SNS.md 섹션 9 참고). `taggedMemberIds`는 `Gathering.hashtags`와 동일하게 콤마구분 문자열로 저장(별도 조인 테이블 없음). Instagram 실제 멘션/음악 자동 삽입은 API로 불가능하다는 조사 결과에 따라 서버는 태그 후보 목록 제공 + 로깅만 담당하고, 실제 이미지 합성·OS 딥링크 호출은 모바일 클라이언트 책임. `GatheringNotificationController`(`/api/gatherings/notifications`, 전체 인증 필요) — GET(목록, 페이징)/GET `/unread-count`(`{"count":N}`, `PhotoReportController.myUnreadCount()`와 동일 응답 구조)/PUT `/{id}/read`(단건 읽음, IDOR)/POST `/read-all`(전체 읽음). `GatheringNotification` 엔티티(memberId/gatheringId/type/message/relatedPostId/isRead) — FCM/APNs 없이 기존 폴링 배지 패턴(inquiry/meets와 동일)만 사용하는 Phase 1 범위. 알림 생성 트리거: 대기자 자동 승격(`PARTICIPATION_CONFIRMED`), 수동·자동 모집마감(`RECRUITMENT_CLOSED`), 배치 모임시작(`GATHERING_STARTED`)/모임종료(`GATHERING_ENDED`), 새 게시물(`NEW_POST`, 작성자 제외 참여자 전원)/새 댓글·좋아요(`NEW_COMMENT`/`NEW_LIKE`, 게시물 작성자에게만). "모집 마감 임박"·"모임 시작 1시간 전" 사전 알림은 별도 시간창 배치가 필요해 이번 슬라이스에서 제외(차기 과제). `GatheringBatchService`는 각 상태 전환 UPDATE 직전에 대상 모임 ID를 먼저 SELECT해 배치 알림 발송에 사용하고, 알림 발송 실패는 상태 전환 트랜잭션에 영향 없도록 별도 try/catch로 격리. `GatheringPostController`(`/api/gatherings`, sibling 컨트롤러) — 공개: GET `/{gatheringId}/posts`(피드, ONGOING/ENDED 상태만, 인증 시 `likedByMe` 포함)/GET `/{gatheringId}/album`(앨범, ENDED 상태만). 인증: POST `/{gatheringId}/posts`(게시물 작성, PARTICIPATING 참여자 + ONGOING만)/DELETE `/posts/{postId}`(삭제, 작성자 IDOR)/POST·DELETE `/posts/{postId}/like`(좋아요, PARTICIPATING + ONGOING·ENDED)/POST `/posts/{postId}/comments`(댓글, 동일 권한). `GatheringPost`/`GatheringPostComment` — `Comment`/`MeetMessage`와 동일하게 memberName/memberAvatarUrl을 작성 시점에 비정규화 저장(N+1 방지). `GatheringPhoto`(EXIF 없음, 이번 슬라이스 미포함) — sortOrder만 지원. `GatheringPostLike`(UNIQUE gathering_post_id+member_id). 피드 조회는 postId 목록으로 사진/좋아요/댓글을 각각 배치 조회 후 Java에서 그룹핑(N+1 방지). `likedByMe`는 `SecurityUtil.isAuthenticated()`로 선택적 인증 처리 — 비로그인 시 항상 false. 게시물 삭제는 작성자 본인만 가능하고 수정은 없음(모임 종료 후에도 동일). `GatheringBatchService.transitionGatheringStatuses()` — `@Scheduled(cron="0 */5 * * * *")` 5분마다, `BookingBatchService`/`MeetBatchService`와 동일하게 한 메서드 안에서 순차 bulk `@Modifying @Query` 4단계(모집마감시간 경과 RECRUITING→RECRUITMENT_CLOSED, RECRUITMENT_CLOSED→SCHEDULED, 시작시간 경과 SCHEDULED→ONGOING, 종료시간 경과 ONGOING→ENDED) 실행 후 `catch(Exception)` 로깅. `GatheringController`(`/api/gatherings`) — 공개: GET 목록(`?status=&page=&size=`)/상세. 인증: POST(생성, 아무 로그인 회원이나 가능 — 별도 운영자 역할 없음)/PUT·DELETE(수정·삭제, IDOR `findByIdAndCreatedBy`)/GET `/my`(생성+참여중 모임)/POST·DELETE `/{id}/participation`(참여·미참여 응답/취소)/GET `/{id}/participants`(참여자·대기자 목록, 생성자 전용)/POST `/{id}/close-recruitment`(수동 모집 마감). `Gathering` 엔티티 — status는 `Meet`/`Booking`과 동일하게 plain `String`(RECRUITING/RECRUITMENT_CLOSED/SCHEDULED/ONGOING/ENDED, 뒤 3개는 이번 슬라이스 미사용·차기 배치 전용). `GatheringParticipant` 엔티티(UNIQUE gathering_id+member_id, status PARTICIPATING/WAITING/NOT_PARTICIPATING/CANCELLED) — 참여 응답 시 정원 초과면 서버가 자동으로 WAITING 배정, 참여 취소 시 대기자 1순위(`joinedAt` 기준)를 같은 트랜잭션에서 자동 승격(동시 취소 경합 시 과소승격 가능성 있음 — `MeetBatchService`와 동일하게 별도 락 없이 허용, 기존 컨벤션 준수). `reason`(미참여 사유)은 서비스/DTO 레이어에서 생성자 전용 응답에만 채워짐. 모집 종료 후에는 참여/미참여 응답 API가 400을 반환. Member.instagramId(이미 구현되어 있던 필드) 재사용 예정 — 이번 슬라이스에는 아직 노출 안 함(다음 슬라이스인 Instagram 공유에서 사용).
- **assistant/** — AI 어시스턴트 챗봇 (Gemini 연동). `AssistantController` (`/api/assistant`) — 공개: `POST /chat`(포트폴리오 방문객 상담, IP 기준 10req/min). 인증: `POST /chat/workspace`(로그인 회원용 앱 사용법 안내, 회원 기준 20req/min). `GeminiClient` — Google Gemini `generateContent` REST API(`v1beta/models/{model}:generateContent`) 호출, 인증은 쿼리 파라미터가 아닌 `x-goog-api-key` 헤더 사용(access 로그에 키 노출 방지). DB 조회 없이 시스템 프롬프트만 사용하는 stateless 설계 — 대화 history는 프론트엔드가 클라이언트 메모리에서만 들고 있다가 매 요청에 실어 보내고, 서버는 저장하지 않는다. `gemini.api-key`(`GEMINI_API_KEY` 환경변수) 미설정 시 `AssistantException`으로 503 + 안내 메시지 반환(조용히 실패하지 않음). 메시지 길이(2000자)·history 턴 수(20턴) 상한으로 비용 폭주 방지.
- **Redis 장애 대응** — `IpBlockFilter`, `RefreshTokenStore`, `TokenBlacklistService` 모두 `catch(Exception)` 로 Redis 연결 실패 시 허용 통과/빈값 반환 (개발 환경 Redis 없이도 동작).

#### Spring 프로파일 구성

```
src/main/resources/
├── application.yml          # 공통 설정 + 환경변수 바인딩
├── application-dev.yml      # H2 in-memory, Redis localhost, SQL 로그 ON
└── application-prod.yml     # PostgreSQL, Upstash Redis, SQL 로그 OFF, ddl-auto=validate
```

**운영 주의사항**: `application-prod.yml`의 `ddl-auto: validate` — 절대 `create`/`create-drop` 금지.

**운영 DB 수동 마이그레이션 필요** (새 컬럼 추가 시):
```sql
ALTER TABLE photos ADD COLUMN IF NOT EXISTS display_order INTEGER;
ALTER TABLE series ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
-- Phase 4 — 포트폴리오 레이아웃
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_layout VARCHAR(20) DEFAULT 'grid';
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_cover_photo_id BIGINT;
-- Feature 28 — 포트폴리오 템플릿 시스템
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_template VARCHAR(20) DEFAULT 'EDITORIAL';
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_style_json TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_sections_json TEXT;
CREATE INDEX IF NOT EXISTS idx_members_portfolio_template ON members(portfolio_template);
CREATE TABLE IF NOT EXISTS inquiries (
  id BIGSERIAL PRIMARY KEY,
  receiver_member_id BIGINT NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  shoot_type VARCHAR(50),
  shoot_date VARCHAR(100),
  budget VARCHAR(100),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Phase 3 — 팔로우/댓글/EXIF
CREATE TABLE IF NOT EXISTS follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id BIGINT NOT NULL,
  following_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  photo_id BIGINT NOT NULL,
  member_id BIGINT NOT NULL,
  member_name VARCHAR(100) NOT NULL,
  member_avatar_url VARCHAR(500),
  content TEXT NOT NULL,
  parent_id BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS camera_model  VARCHAR(100);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS lens_model    VARCHAR(100);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS aperture      VARCHAR(20);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS shutter_speed VARCHAR(20);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS iso           INTEGER;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS focal_length  VARCHAR(20);
-- Phase 5 — 장르 분류 (26_GENRE_CLASSIFICATION)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS genre      VARCHAR(20);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sub_genres VARCHAR(60);
-- Feature 25 — 매거진 면·판 레이아웃
ALTER TABLE photos ADD COLUMN IF NOT EXISTS pan_type         VARCHAR(20) DEFAULT 'EDITORIAL';
ALTER TABLE photos ADD COLUMN IF NOT EXISTS magazine_caption TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS image_right      BOOLEAN DEFAULT FALSE;
-- Module: delivery — 클라이언트 배달 포털
CREATE TABLE IF NOT EXISTS delivery_sets (
  id             BIGSERIAL PRIMARY KEY,
  member_id      BIGINT NOT NULL,
  token          VARCHAR(64) UNIQUE NOT NULL,
  title          VARCHAR(200) NOT NULL,
  client_name    VARCHAR(100),
  status         VARCHAR(20) DEFAULT 'PENDING',
  password_hash  VARCHAR(255),
  expires_at     TIMESTAMP NOT NULL,
  feedback       TEXT,
  approved_at    TIMESTAMP,
  viewed_at      TIMESTAMP,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS delivery_set_photos (
  delivery_set_id BIGINT NOT NULL,
  photo_id        BIGINT NOT NULL,
  sort_order      INTEGER DEFAULT 0,
  liked           BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (delivery_set_id, photo_id)
);
-- Module: analytics — 방문자 분석
CREATE TABLE IF NOT EXISTS analytics_events (
  id            BIGSERIAL PRIMARY KEY,
  event_type    VARCHAR(30) NOT NULL,
  target_type   VARCHAR(20),
  target_id     BIGINT,
  member_id     BIGINT NOT NULL,
  visitor_token VARCHAR(32),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_member_type ON analytics_events (member_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at  ON analytics_events (created_at);
-- Module: booking — 촬영 예약 캘린더
CREATE TABLE IF NOT EXISTS booking_availability (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT UNIQUE NOT NULL,
  weekdays      VARCHAR(20)  DEFAULT '1,2,3,4,5',
  time_slots    VARCHAR(100) DEFAULT '10:00,14:00',
  buffer_hours  INTEGER DEFAULT 0,
  booking_note  TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  updated_at    TIMESTAMP
);
CREATE TABLE IF NOT EXISTS booking_blocked_dates (
  id           BIGSERIAL PRIMARY KEY,
  member_id    BIGINT NOT NULL,
  blocked_date DATE NOT NULL,
  reason       VARCHAR(100),
  UNIQUE (member_id, blocked_date)
);
CREATE TABLE IF NOT EXISTS bookings (
  id             BIGSERIAL PRIMARY KEY,
  member_id      BIGINT NOT NULL,
  shoot_date     DATE NOT NULL,
  shoot_time     VARCHAR(10),
  shoot_type     VARCHAR(20),
  client_name    VARCHAR(100) NOT NULL,
  client_phone   VARCHAR(30),
  client_email   VARCHAR(255),
  memo           TEXT,
  status         VARCHAR(20) DEFAULT 'REQUESTED',
  reject_reason  VARCHAR(200),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  confirmed_at   TIMESTAMP,
  cancelled_at   TIMESTAMP
);
-- Module: portfolio-world-class — 세계 수준 포트폴리오 (32_PORTFOLIO_WORLD_CLASS)
CREATE TABLE IF NOT EXISTS testimonials (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT NOT NULL,
  client_name   VARCHAR(100) NOT NULL,
  client_role   VARCHAR(100),
  content       TEXT NOT NULL,
  shoot_date    VARCHAR(20),
  is_featured   BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_testimonials_member_id ON testimonials(member_id);
CREATE TABLE IF NOT EXISTS press_features (
  id             BIGSERIAL PRIMARY KEY,
  member_id      BIGINT NOT NULL,
  publication    VARCHAR(100) NOT NULL,
  title          VARCHAR(200),
  url            VARCHAR(500),
  published_date VARCHAR(20),
  logo_url       VARCHAR(500),
  display_order  INTEGER DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS achievements (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT NOT NULL,
  type          VARCHAR(20) NOT NULL,   -- AWARD | EXHIBITION | PUBLICATION
  title         VARCHAR(200) NOT NULL,
  organizer     VARCHAR(100),
  location      VARCHAR(100),
  year_month    VARCHAR(7),             -- "2025.05"
  url           VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS pricing_packages (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT NOT NULL,
  name          VARCHAR(100) NOT NULL,
  price         INTEGER,
  price_label   VARCHAR(50),
  description   TEXT,
  features      TEXT,           -- JSON 배열
  is_featured   BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS client_brands (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT NOT NULL,
  name          VARCHAR(100) NOT NULL,
  logo_url      VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id               BIGSERIAL PRIMARY KEY,
  member_id        BIGINT NOT NULL,
  email            VARCHAR(255) NOT NULL,
  token            VARCHAR(64) UNIQUE NOT NULL,
  subscribed_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  unsubscribed_at  TIMESTAMP,
  UNIQUE (member_id, email)
);
ALTER TABLE members ADD COLUMN IF NOT EXISTS cover_video_url VARCHAR(500);
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_taglines TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_sections_enabled TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS blur_hash VARCHAR(500);
-- Feature 35 — 모델-작가 약속 커뮤니케이션
CREATE TABLE IF NOT EXISTS meets (
  id BIGSERIAL PRIMARY KEY,
  requester_id BIGINT NOT NULL,
  receiver_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  location_name VARCHAR(200),
  location_address VARCHAR(400),
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  confirmed_date DATE,
  confirmed_time VARCHAR(10),
  initial_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meets_requester ON meets(requester_id);
CREATE INDEX IF NOT EXISTS idx_meets_receiver ON meets(receiver_id);
CREATE TABLE IF NOT EXISTS meet_availabilities (
  id BIGSERIAL PRIMARY KEY,
  meet_id BIGINT NOT NULL,
  member_id BIGINT NOT NULL,
  available_dates TEXT,
  available_times TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (meet_id, member_id)
);
CREATE TABLE IF NOT EXISTS meet_messages (
  id BIGSERIAL PRIMARY KEY,
  meet_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  sender_avatar VARCHAR(500),
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meet_messages_meet_id ON meet_messages(meet_id);
-- Module: report — 콘텐츠 신고 (PhotoReportController / AdminReportController)
CREATE TABLE IF NOT EXISTS reports (
  id              BIGSERIAL PRIMARY KEY,
  photo_id        BIGINT NOT NULL,
  reporter_id     BIGINT NOT NULL,
  reason          VARCHAR(30) NOT NULL,     -- COPYRIGHT | INAPPROPRIATE | PRIVACY | SPAM | OTHER
  detail          TEXT,                    -- reason=OTHER 일 때 필수, 그 외 선택
  evidence_url    VARCHAR(500),
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | RESOLVED | DISMISSED
  resolution_note VARCHAR(300),
  reporter_seen   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reports_photo_id    ON reports(photo_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status      ON reports(status);
-- Module: gathering — 사진 모임 SNS (Feature 37, 첫 슬라이스만 — 모임 CRUD + 참여/대기자)
CREATE TABLE IF NOT EXISTS gatherings (
  id                        BIGSERIAL PRIMARY KEY,
  title                     VARCHAR(200) NOT NULL,
  description               TEXT,
  detail_description        TEXT,
  location                  VARCHAR(300) NOT NULL,
  start_date_time           TIMESTAMP NOT NULL,
  end_date_time             TIMESTAMP NOT NULL,
  max_participants          INTEGER NOT NULL,
  recruitment_end_date_time TIMESTAMP NOT NULL,
  status                    VARCHAR(20) NOT NULL DEFAULT 'RECRUITING',
  thumbnail_url             VARCHAR(500),
  preparation_note         TEXT,
  fee                       VARCHAR(100),
  shoot_theme               VARCHAR(200),
  location_intro            TEXT,
  reference_image_url       VARCHAR(500),
  hashtags                  VARCHAR(300),
  created_by                BIGINT NOT NULL,
  created_at                TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gatherings_status     ON gatherings(status);
CREATE INDEX IF NOT EXISTS idx_gatherings_start_date ON gatherings(start_date_time);
CREATE INDEX IF NOT EXISTS idx_gatherings_created_by ON gatherings(created_by);
CREATE TABLE IF NOT EXISTS gathering_participants (
  id           BIGSERIAL PRIMARY KEY,
  gathering_id BIGINT NOT NULL,
  member_id    BIGINT NOT NULL,
  status       VARCHAR(20) NOT NULL,  -- PARTICIPATING | WAITING | NOT_PARTICIPATING | CANCELLED
  reason       VARCHAR(200),          -- 미참여 사유, 생성자만 조회
  joined_at    TIMESTAMP NOT NULL,
  UNIQUE (gathering_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_gathering_participants_gathering ON gathering_participants(gathering_id, status);
CREATE INDEX IF NOT EXISTS idx_gathering_participants_member    ON gathering_participants(member_id);
-- Module: gathering — 모임 진행중 피드 + 앨범 (Feature 37, 두 번째 슬라이스)
CREATE TABLE IF NOT EXISTS gathering_posts (
  id                BIGSERIAL PRIMARY KEY,
  gathering_id      BIGINT NOT NULL,
  member_id         BIGINT NOT NULL,
  member_name       VARCHAR(100) NOT NULL,
  member_avatar_url VARCHAR(500),
  content           TEXT,
  hashtags          VARCHAR(300),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gathering_posts_gathering ON gathering_posts(gathering_id);
CREATE TABLE IF NOT EXISTS gathering_photos (
  id                  BIGSERIAL PRIMARY KEY,
  gathering_post_id   BIGINT NOT NULL,
  image_url           VARCHAR(500) NOT NULL,
  caption             VARCHAR(300),
  sort_order          INTEGER DEFAULT 0,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gathering_photos_post ON gathering_photos(gathering_post_id);
CREATE TABLE IF NOT EXISTS gathering_post_likes (
  id                 BIGSERIAL PRIMARY KEY,
  gathering_post_id  BIGINT NOT NULL,
  member_id          BIGINT NOT NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (gathering_post_id, member_id)
);
CREATE TABLE IF NOT EXISTS gathering_post_comments (
  id                 BIGSERIAL PRIMARY KEY,
  gathering_post_id  BIGINT NOT NULL,
  member_id          BIGINT NOT NULL,
  member_name        VARCHAR(100) NOT NULL,
  member_avatar_url  VARCHAR(500),
  content            TEXT NOT NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gathering_post_comments_post ON gathering_post_comments(gathering_post_id);
-- Module: gathering — 인앱 알림 Phase 1 (Feature 37, 네 번째 슬라이스)
CREATE TABLE IF NOT EXISTS gathering_notifications (
  id               BIGSERIAL PRIMARY KEY,
  member_id        BIGINT NOT NULL,
  gathering_id     BIGINT NOT NULL,
  type             VARCHAR(30) NOT NULL,
  message          VARCHAR(300) NOT NULL,
  related_post_id  BIGINT,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gn_member_read ON gathering_notifications(member_id, is_read);
CREATE INDEX IF NOT EXISTS idx_gn_created_at  ON gathering_notifications(created_at);
-- Module: gathering — Instagram Story 공유 로그 (Feature 37, 다섯 번째 슬라이스)
CREATE TABLE IF NOT EXISTS instagram_story_shares (
  id                  BIGSERIAL PRIMARY KEY,
  gathering_id        BIGINT NOT NULL,
  member_id           BIGINT NOT NULL,
  gathering_post_id   BIGINT,
  template            VARCHAR(30) NOT NULL,
  caption_text        VARCHAR(300),
  tagged_member_ids   VARCHAR(500),
  shared_at           TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_instagram_shares_gathering ON instagram_story_shares(gathering_id);
CREATE INDEX IF NOT EXISTS idx_instagram_shares_member    ON instagram_story_shares(member_id);
```

#### PhotoRepository 주요 쿼리 메서드

```java
findByMemberIdOrderByCreatedAtDesc(Long memberId)        // 멤버별 사진
findByColorMoodOrderByCreatedAtDesc(String mood)          // 무드별 사진
search(keyword, colorMood, memberId, imageRatio, genre, Sort) // 복합 필터+동적 정렬 (JPQL + Sort)
searchFuzzy(kw, colorMood, memberId, imageRatio, genre)   // pg_trgm 유사도 검색 (native, PostgreSQL only, H2 fallback)
countByGenre()                                            // 전체 장르별 사진 수 통계
countByGenreForMember(Long memberId)                      // 멤버별 장르 통계
findTitleSuggestions(q, Pageable)                        // 자동완성용 제목 목록 (JPQL LIKE, 최대 5건)
findByMemberIdInOrderByCreatedAtDesc(List<Long>, Pageable) // 피드 — 팔로우 유저 최신순
findIdsByMemberId(Long memberId)                          // 계정 삭제 cascade용 photo ID 목록
deleteByMemberId(Long memberId)                           // 회원 탈퇴 시 cascade
```

**검색 fallback 전략** (`PhotoController.getAllPhotos`):
- 키워드 있을 때: `searchFuzzy()` → `DataAccessException` 시 `search()` LIKE로 자동 fallback
- 키워드 없을 때: `search()` JPQL (동적 Sort 지원)

**운영 DB 설정** (Supabase SQL Editor, 최초 1회):
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- 한글·영문 대소문자 무관 검색을 위한 LOWER() 표현식 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_photos_title_trgm ON photos USING GIN (LOWER(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_photos_desc_trgm  ON photos USING GIN (LOWER(description) gin_trgm_ops);
```

**사진 삭제 시 cascade 순서** (`PhotoController.deletePhoto`):
1. `PhotoLike`, `PhotoSave`, `PhotoShare`, `PhotoTag` 연관 레코드 먼저 삭제
2. 이미지 파일 삭제 (`ImageProcessingUtil.deleteImage`)
3. `Photo` 엔티티 삭제

#### 파일 업로드 API

```
POST /api/upload/image?folder=photos
Authorization: Bearer <token>
Content-Type: multipart/form-data
Body: file=<이미지>

Response: { "url": "https://...supabase.co/storage/v1/object/public/images/photos/uuid.jpg", "status": "success" }
```

- 허용 타입: JPEG, PNG, WebP, GIF
- 최대 크기: 20MB
- 파일명: UUID 자동 생성 (경로 예측 불가)
- `folder` 파라미터에 `..` 및 `/` 포함 시 400 반환

### Frontend (`src/`)

- **pages/** — Route-level components (Login, SignUp, Gallery, Explore, List, PhotoDetail, PhotoForm, **Profile**, **Portfolio**, **KakaoCallback**, **Series**, **InquiryFormPage**, **InquiryInboxPage**, **PhotoSortPage**, **FeedPage**, **ImageEditorPage**, **ClientDeliveryPage**, **DeliveriesPage**, **BookingPage**, **BookingDashboard**, **MeetsPage**, **MeetDetailPage**, **admin/AdminDashboardPage**, **admin/AdminGalleryOrderPage**, **admin/AdminMembersPage**, **admin/AdminPhotosPage**). **ClientDeliveryPage** (`/proof/:token`, 공개, Standalone): 납품 세트 뷰어. 로딩→만료(410)→비밀번호→성공 4단계 상태 처리. 3열 사진 그리드 + 하트 토글(♡/♥). 스티키 하단바: 전체 다운로드 + 최종 승인 버튼. 토큰 localStorage 미저장 보안 준수. **DeliveriesPage** (`/deliveries`, 인증 필요): 납품 세트 목록. 상태 배지(PENDING/REVIEWED/APPROVED/REJECTED). 링크 복사 버튼(토큰 화면 미노출). DeliveryCreateModal. **BookingPage** (`/booking/:profileName`, 공개, Standalone): 3단계 예약 위저드 — 촬영 유형 → 날짜/시간 → 연락처 폼. 과거 날짜 클라이언트 차단. **BookingDashboard** (`/bookings`, 인증 필요): 예약 목록 4탭 필터, 확정/거절/취소 액션, 가용 시간 설정 버튼. **ImageEditorPage** (`/editor` 및 `/photo/new`, `/photo/:id/edit` — ProtectedRoute): useReducer 기반 EditorContext, 3-panel 레이아웃(LeftPanel 썸네일 스트립 + CenterCanvas + RightPanel 탭), 비파괴 편집(EditState per image), Undo/Redo(50단계), 전체 페이지 Drag & Drop 업로드(UploadDropZone), Ctrl+Z/Y/Escape 단축키, `?photoId=` 쿼리로 갤러리 사진 자동 로드, ExportModal(JPG/PNG/WEBP, 품질·크기 설정, 다중 순차 다운로드, Supabase 갤러리 업로드). **버그 수정**: `CenterCanvas.jsx`에서 "이미지 로드" `useEffect`의 의존성 배열이 그 아래에서 `const renderCanvas = useRef(...)`로 선언되는 `renderCanvas`를 선언 전에 참조해 `/photo/new` 진입 시 무조건 `ReferenceError: Cannot access 'renderCanvas' before initialization`로 크래시하던 문제 수정 — 신규 사진 등록 진입점 전체가 막혀있었음. `renderCanvas`(및 이를 참조하는 `editStateRef`/`zoomRef`) 선언부를 "이미지 로드" effect보다 앞으로 이동해 해결. **ProfilePage** (Phase 2-8+28~30): 6탭 구조(내 작품·저장함·시리즈·분석(📊)·예약(📅)·설정), 아바타/커버 이미지 업로드(hover overlay), 6종 통계, 설정 탭에 확장 폼(bio/websiteUrl/location/specialties 체크박스) + `PortfolioLayoutPicker`(grid/magazine/slideshow 3-옵션 카드 선택) + **포트폴리오 템플릿 선택 UI**(7종 카드 그리드, PUT /api/portfolio/{profileName}/template 저장, profileName 없을 때 안내 메시지) + 비밀번호 변경(kakao 유저 숨김). **FeedPage** (Phase 3): 팔로우 유저 최신 사진, 더 보기 페이지네이션, 빈 피드 안내. **PhotoDetailPage** (Phase 4 강화): 컬러 팔레트(useColorExtraction K-means), 전체화면 뷰어(PhotoViewer), 이전/다음 네비게이션(PhotoNavigation), 공유 버튼(ShareButton), 관련 사진(RelatedPhotos), 인쇄 CSS 포함. **PortfolioPage** (Feature 28 — 템플릿 시스템, Feature: 포트폴리오 확장성 개선으로 레지스트리 패턴 리팩토링): GET /api/portfolio/{profileName}/config 로 template 로드 후 `TEMPLATE_REGISTRY` 객체({EDITORIAL/SCRL/MINIMAL/DARK_ROOM: 컴포넌트}) 조회로 렌더링 — 새 템플릿은 이 객체에 한 줄만 추가하면 됨(switch문 아님). 레지스트리에 없는 키(FILM/SPLIT/MOSAIC/MAGAZINE)는 `TemplateComingSoon`(children 감싸는 배너 래퍼, 실제로 호출되는 살아있는 컴포넌트로 재작성됨) + EDITORIAL 폴백으로 처리. 모든 템플릿에 공통 전달되는 `templateProps`(member/photos/series/photoCount/followerCount/followingCount/totalLikes/following/followLoading/onFollow/onOpenFollowModal) 단일 객체로 통합. **components/portfolio/templates/** — TemplateEditorial(기존 PortfolioPage 레이아웃 컴포넌트화, `.portfolio-masonry` 마소닉 그리드는 `constants/breakpoints.js`의 `mq.tablet`/`mq.mobile` 기준 768~1023px 3컬럼/≥1024px 4컬럼 — **버그 수정**: 히어로의 전문분야 배지·소셜링크·팔로우/문의/슬라이드쇼 버튼·통계바 8곳에 남아있던 `backdropFilter: blur()` + 아바타 원의 그라디언트 채움이 CLAUDE.md 플랫 서페이스 규칙 위반이라 전부 제거 — blur 대신 배경 불투명도만 높인 flat rgba, 그라디언트 대신 `COLORS.primary` 단색으로 교체. `PortfolioPage.jsx`의 팔로워 목록 모달 아바타도 동일하게 수정), TemplateScrl(CSS scroll-snap: y mandatory + IntersectionObserver + 우측 도트 인디케이터 + 키보드 ↑↓ 네비), TemplateMinimal(흰 배경 3열 정방형 그리드, 소문자 타이포, hover title overlay — **버그 수정**: `.minimal-grid` 클래스가 실제 그리드 컨테이너에 적용되지 않아 모바일 2컬럼 반응형이 전혀 동작하지 않던 문제 수정, 태블릿 구간 gap 1px 축소 추가), TemplateDarkRoom(#080808 배경 + 마우스 스포트라이트 + 무드 필터 + 클릭 피처 영역). **PortfolioSlideshowPage** (`/portfolio/:profileName/slideshow`, 공개, Header 없음): 풀스크린 슬라이드쇼 — PortfolioCoverPage(커버 슬라이드) + 사진들. 키보드(←/→/Space/Esc), 터치 스와이프(>50px), 자동재생 3s, hover 일시정지, 최대 7개 도트 인디케이터, PDF 인쇄(PrintButton), EmbedCodeModal(3크기 iFrame 코드). **Apple Glass 강화**(DESIGN_PROMPTS/design/DESIGN_PROMPT_apple-glass-slideshow.md): 상단바/하단바/이전·다음 원형 버튼/재생토글/`PrintButton`에 `backdropFilter: blur(20px) saturate(180%)` + 반투명 화이트 틴트 + 얇은 테두리 + 상단 스펙큘러 하이라이트(`inset 0 1px 0 rgba(255,255,255,0.25)`)로 구성된 글라스 머티리얼 적용 — 풀블리드 사진 위에 뜨는 컨트롤 크롬에 한정된 예외이며, 로컬 `glass()` 헬퍼로만 존재(전역 유틸/토큰 변경 없음, 앱 전체 Toss 플랫 디자인 정책은 그대로 유지). `EmbedCodeModal`(콘텐츠 다이얼로그)과 다른 화면은 대상 아님. **Admin Panel** (`/admin/**`, ADMIN 권한): AdminLayout(사이드바 + 상단바), 대시보드, GalleryOrderPage(멤버 선택 + 드래그 정렬), MembersPage(검색 + 권한변경 + 삭제), PhotosPage(검색 + 인라인 장르 팝오버 편집 + 강제삭제), **AdminCategoryPage**(`/admin/categories`, 장르별 분포 통계 테이블 + 분류 현황 요약). **버그 수정**: `GET /api/auth/members`는 다른 대부분의 컨트롤러처럼 `ApiResponse<T>`(`{success, code, message, data, timestamp}`)로 감싸 반환하는데, `AdminDashboardPage`/`AdminMembersPage`/`AdminGalleryOrderPage` 3곳 모두 `res?.data`(= ApiResponse 래퍼 객체 자체)를 회원 배열로 착각해 사용 — 대시보드는 "전체 회원" 통계가 항상 `—`로만 표시되고, 회원 관리·갤러리 순서 페이지는 `members.filter is not a function`으로 완전히 크래시하던 문제. 세 곳 모두 `res?.data?.data`(실제 배열)를 읽도록 수정. (`/api/photos`는 이 앱에서 예외적으로 `{status, data}` 형태의 별도 래퍼를 쓰므로 동일 언래핑 실수를 반복하지 않도록 주의 — 컨트롤러마다 응답 포맷이 다르다.) **AdminTagsPage**(`/admin/tags`): 태그 전체 목록(사진 수·최근 사용일), 태그 삭제(사용 중 경고), 태그 병합(MergeModal — 원본/대상 드롭다운 + 2단계 확인), 미사용 태그 통계. **AdminModerationPage**(`/admin/moderation`): 신고 목록 4탭(전체/대기중/처리완료/무시됨), 무시하기/사진 삭제(2단계 위험 액션 빨간색), 신고 썸네일·사유·신고자·날짜 표시. **MeetsPage** (`/meets`, 인증 필요, Feature 35): 약속 목록 + 상태별 탭 필터(전체/대기중/날짜조율/확정/완료). 상대 아바타·이름·상태배지·장소·메시지 수 카드. `NewMeetModalWrapper` — 회원 검색(이름/@프로필명) → `MeetRequestModal` 3단계 위저드. `useAuthStore(s => s.user)` 사용(AuthContext 아님). **MeetDetailPage** (`/meets/:id`, 인증 필요): 3-탭 레이아웃(📅 날짜/📍 장소/💬 채팅, Cosmos 언더라인 스타일). 달력 탭: `MeetCalendar` 가용일 토글 + NEGOTIATING 시 날짜 확정 폼. 장소 탭: `MeetLocationPicker` readOnly/편집 모드. 채팅 탭: `MeetChat` 460px 컨테이너. PENDING 수신자: 수락/거절 액션 카드. CONFIRMED: 확정 날짜 + 완료 처리 버튼. **GatheringsPage** (`/gatherings`, 공개, Feature 37): 모집중인 모임 카드 그리드(스켈레톤+EmptyState) + 인증 시 "내 모임" 목록 + "모임 만들기" 버튼(로그인 회원 누구나). **GatheringFormPage** (`/gatherings/new`, `/gatherings/:id/edit`, 인증 필요): PhotoForm처럼 생성/수정 공용 컴포넌트, `datetime-local` 입력(외부 날짜 라이브러리 없음), 백엔드와 동일한 클라이언트 사전 검증(제목/장소 필수, 시작<종료, 모집마감<시작). **GatheringDetailPage** (`/gatherings/:id`, 공개): status별 분기 — RECRUITING(참여/미참여 모달, 미참여 사유 라디오+직접입력, 정원 초과 시 대기자 등록 안내, 생성자 전용 참여자관리·모집마감 버튼), RECRUITMENT_CLOSED·SCHEDULED(마감 안내), ONGOING·ENDED(모임 피드 — 참여자만 사진/글 업로드·좋아요·댓글, `myStatus`는 서버에 "내 참여 상태 조회" 전용 엔드포인트가 없어 응답 후 로컬 state로만 추적하는 낙관적 UI, ENDED에는 앨범 링크 추가). **GatheringManagePage** (`/gatherings/:id/manage`, 인증 필요, 생성자 전용): 403 시 접근거부 화면, 참여자·대기자·미참여(사유 포함, 이 페이지에서만 노출) 3섹션, 모집 마감 버튼. **GatheringAlbumPage** (`/gatherings/:id/album`, 공개): 모임 종료 후 사진 모아보기 그리드(제목·참여자수·사진수·게시글수 헤더) + 모임 피드로 돌아가기 링크. **GatheringCalendarPage** (`/gatherings/calendar`, 인증 필요): `MeetCalendar.jsx`와 동일하게 외부 라이브러리 없이 순수 JS Date API로 구현한 월간 달력 — `GET /api/gatherings/my` 데이터를 `startDateTime` 날짜(YYYY-MM-DD)별로 그룹핑해 점(dot) 마커로 표시, 날짜 클릭 시 해당 날짜의 모임 목록(제목·시간·참여인원·상태배지)을 하단에 표시. `GatheringsPage`의 "+ 모임 만들기" 옆에 "📅 달력" 진입 버튼 추가. 별도 백엔드 엔드포인트 없이 기존 `/my` 응답을 클라이언트에서 날짜별로 재구성(모임 개수가 적은 초기 단계에 적합, 추후 규모가 커지면 서버 사이드 월별 필터링 고려 가능). **components/gathering/** — 피드 게시물 작성 모달(사진 다중 업로드는 `uploadApi.uploadImage(file, 'gatherings', onProgress)` 재사용, 캡션/본문/해시태그 입력, 사진 또는 본문 중 하나 이상 필수). **GatheringNotificationsPage** (`/gatherings/notifications`, 인증 필요): 내 알림 목록(최신순 페이징), 미읽음 좌측 파란 accent border+굵은 글씨+닷 표시, 타입별 이모지 아이콘, 클릭 시 읽음 처리(낙관적 업데이트+실패 시 롤백) 후 해당 모임 상세로 이동, "모두 읽음" 버튼. Header 내비게이션에 "모임"(`/gatherings`) 항목 추가 + 기존 `inquiry`/`meets`와 동일한 폴링 배지 패턴(`badge: 'gatherings'`)으로 미읽음 알림 수 표시.
- **Feature 38 — 3플랫폼 UI/UX 개선 (P1 8개 + P2 5개 완료)**: `DESIGN_PROMPTS/planning/PLAN_38_MULTIPLATFORM_UX_V2.md` 기획 + `DESIGN_PROMPTS/design/DESIGN_PROMPT_{common-components,desktop-layout,mobile-loading-states,tablet-layouts}.md` 디자인 프롬프트 기반. `Skeleton.jsx` 색상 토큰을 구 Cosmos 팔레트에서 Toss 토큰(`#E5E8EB`/`#F2F4F6`, 다크 `#1A1E22`/`#22262B`)으로 교체. **MeetsPage**·**BookingDashboard** — `useIsDesktop()`(matchMedia 기반 로컬 훅) 도입, ≥1024px에서 좌 목록 패널(320px/360px) + 우 상세 패널 2컬럼 레이아웃 추가, 카드 클릭이 데스크탑에서는 선택만 하고 모바일/태블릿에서는 기존처럼 상세로 바로 이동. **버그 수정**: `bookingApi.getMyBookings()`가 존재하지 않는 `/booking/my` 엔드포인트를 호출해 `BookingDashboard`가 항상 500 에러로 실패하던 문제, `BookingDashboard.jsx`가 응답 필드 `shootDate`/`shootTime` 대신 `date`/`time`을 참조해 날짜가 항상 빈 값으로 보이던 문제 — 배포 이후 이 화면이 사실상 한 번도 정상 동작한 적이 없었음. **FeedPage** — `.feed-grid` className을 추가해 태블릿(768~1023px)에서만 2컬럼 CSS grid로 전환(데스크탑 maxWidth 680px 단일 컬럼·모바일 단일 컬럼은 그대로 유지, 의도적으로 태블릿에서만 2컬럼이었다가 데스크탑에서 다시 1컬럼으로 되돌아가는 비선형 구조 — 데스크탑은 가독성 우선). **ProfilePage** — 768px 이상에서 좌 사이드바(태블릿 260px/데스크탑 300px, 아바타·통계·수직 아이콘 탭 메뉴 중앙정렬) + 우 콘텐츠 2컬럼 레이아웃 추가, 커버 배너는 좁은 사이드바에 안 맞아 태블릿 이상에서 숨김. 탭 바는 동일한 `TABS`/`activeTab` state를 공유하되 className 기반으로 옮겨 모바일 수평 언더라인 ↔ 태블릿+ 수직 아이콘 필 메뉴를 CSS media query만으로 전환(인라인 스타일과 충돌하는 마진만 `!important`로 재정의). `constants/breakpoints.js`에 화면 유형 6종(콘텐츠 목록/사진 갤러리/상세 뷰/폼 입력/대시보드/프로필)별 반응형 전략표를 주석으로 문서화(C-5) — 신규 화면 개발 시 참조 기준. **P2 5개 항목 후속 완료**: (A-5) `MeetsPage` 모바일/태블릿 단일 컬럼 카드 hover를 `GatheringCard`와 동일한 `translateY(-2px)+box-shadow` 패턴으로 통일(데스크탑 2컬럼의 좌측 목록 패널은 리스트 성격이 강해 배경색 전환만 유지), `PhotoCard.jsx`의 무드 배지·저장 버튼 오버레이에 남아있던 `backdropFilter: blur()` 제거(문서화된 예외가 아닌 위반 사례였음, flat rgba로 교체). (A-6) `MeetsPage`/`BookingDashboard`/`InquiryInboxPage`의 플랫 텍스트 빈 상태를 기존 `DotEmptyState` 컴포넌트(theme="light")로 통일. (B-5) 모바일 `GalleryScreen`의 웹 전용 12컬럼 `packRows` 알고리즘을 제거하고 `ExploreScreen`과 동일한 `FlatList numColumns={2}` 패턴으로 교체. (C-4) `GatheringFormPage`에 768px 이상 좌 "기본 정보"+우 "장소·일정·참여 정보·이미지" 2컬럼 폼 레이아웃 추가 — **AC1(PhotoFormPage 태블릿 2컬럼)은 스킵**: `App.jsx` 라우팅 확인 결과 `/photo/new`·`/photo/:id/edit`는 실제로 `ImageEditorPage`가 렌더링되고 `PhotoFormPage`는 import만 될 뿐 어떤 Route에도 연결되지 않은 죽은 코드였음(이미 CLAUDE.md에 문서화돼 있던 사실을 재확인). (B-4) 모바일 `BookingScreen.js`(신규, 상태별 SectionList + 확인/거절 액션, 가용시간 설정은 웹으로 딥링크)·`DeliveryScreen.js`(신규, 납품 세트 목록 + `expo-clipboard`로 링크 복사)·`GatheringNotifBadge.js`(신규, `GatheringsScreen` 헤더 우측 30초 폴링 알림 배지, 웹 알림 페이지로 딥링크) 추가, `ProfileScreen` 메뉴에 "📅 예약 관리"/"📦 납품 관리" 진입점 추가. `mobile/src/api/bookingApi.js`·`deliveryApi.js`(신규) + `gatheringApi.getUnreadCount()` 추가. `expo-clipboard` 신규 의존성(SDK 49 호환 `~4.3.1`).
- **Feature 39(a) — 통합 일정 캘린더**: `DESIGN_PROMPTS/planning/PLAN_39_PHOTOGRAPHER_WORK_SUPPORT.md` 기획 + `DESIGN_PROMPTS/design/DESIGN_PROMPT_integrated-calendar.md`. **IntegratedCalendarPage** (`/calendar`, 인증 필요, ProtectedRoute): Booking(CONFIRMED)·Meet(CONFIRMED)·Gathering(SCHEDULED/ONGOING) 3개 일정 도메인을 한 달력에서 색상으로 구분해 조회(예약=파랑 `primary`, 약속=초록 `success`, 모임=주황 `#B45309`). `bookingApi.getMyBookings('CONFIRMED')` + `meetApi.list()` + `gatheringApi.getMy()`를 `Promise.allSettled`로 병렬 호출 후 클라이언트에서 날짜별로 병합 — 신규 백엔드 통합 API 없음(3개 응답 중 하나 실패해도 나머지는 정상 표시, 실패한 유형명을 주황 배너로 안내). 날짜 정규화는 `dateKeyOf()`(ISO 문자열 앞 10자 slice)로 통일. `components/calendar/UnifiedCalendar.jsx`(신규 공용 컴포넌트, `dateKeyOf`/`formatDateKo` export) — 월간 달력 그리드(월 이동, 오늘 표시, 날짜당 최대 3색 도트) + 선택 날짜 패널(목록은 `renderItem` prop으로 페이지별 커스텀) 로직을 추출해 `GatheringCalendarPage`(`/gatherings/calendar`, Feature 37, 그대로 유지)와 `IntegratedCalendarPage` 양쪽에서 재사용. `/gatherings/calendar` 경로·기능은 변경하지 않음(Gathering 전용 달력과 통합 캘린더는 관심사 분리, PLAN_39 트레이드오프 결정). Header 내비게이션에 "📅 일정"(`/calendar`) 항목 추가(문의함-약속 사이). **버그 수정(부수 발견)**: 웹 `bookingApi.js`의 `getAvailabilitySettings/saveAvailabilitySettings/addBlockedDate/deleteBlockedDate`가 실제 백엔드 컨트롤러 경로(`/booking/availability-settings`, `/booking/blocked-dates`)와 다른 존재하지 않는 `/booking/settings/availability`, `/booking/settings/blocked-dates`를 호출하고 있어 `AvailabilityModal.jsx`("가용 시간 설정" 버튼)가 항상 404로 실패하던 문제, 그리고 `AvailabilityModal.jsx`가 `AvailabilitySettingsDto`의 실제 필드(`weekdays`/`timeSlots` — 콤마CSV 문자열)를 무시하고 존재하지 않는 `enabledDays`(배열)·`blockedDates` 필드를 참조하던 문제까지 함께 수정 — 이 화면도 배포 이후 정상 동작한 적이 없었을 가능성이 높음. `GET /api/booking/blocked-dates`(신규, 내 차단 날짜 목록 조회, `BookingService.getBlockedDates()`) 추가 — 기존에는 목록 조회 엔드포인트 자체가 없어 프론트가 조회할 방법이 없었음. `POST /api/booking/blocked-dates`도 기존 204(no body) 대신 생성된 `BlockedDateResponse`를 반환하도록 변경(프론트가 실제 서버 id를 즉시 받아 씀).
- **Feature 39(d) — 모바일 가용시간 설정**: `DESIGN_PROMPTS/design/DESIGN_PROMPT_mobile-availability-settings.md`. 신규 `mobile/screens/AvailabilitySettingsScreen.js` + `mobile/src/api/bookingApi.js` 6개 메서드 추가(`cancelBooking`/`getAvailabilitySettings`/`saveAvailabilitySettings`/`getBlockedDates`/`addBlockedDate`/`deleteBlockedDate`, 웹과 동일한 실제 백엔드 경로 사용). `BookingScreen.js`의 "⚙ 설정" 버튼을 (Feature 38 당시의) 웹 딥링크 Alert에서 네이티브 화면 이동으로 교체. `ProfileScreen.js` 메뉴에 "📅 통합 일정"(웹 `/calendar`로 `Linking.openURL`, 네이티브 통합 달력은 P2) 항목 추가 + 기존 "📅 예약 관리"는 "🗓 예약 관리"로 이모지만 조정(통합 일정과 시각적 구분). `AppNavigator.js`에 `AvailabilitySettings` 스택 등록.
- **components/layout/Header** — PC 상단 헤더(768px 이상) + 모바일 하단 BottomNav(768px 미만) 분기. BottomNav: 탐색·갤러리·등록(원형 강조)·목록·프로필, safe-area 대응. PC 헤더: 문의함·약속 링크에 미읽음/대기 배지 표시 (inquiryApi.getUnreadCount + meetApi.getPendingCount). **LangSwitcher** 컴포넌트 — 드롭다운 언어 선택 (🌐 버튼, 국기+원어 레이블, 현재 언어 체크마크)
- **components/magazine/MagazineViewer** — 풀스크린 오버레이 뷰어: 상단바(닫기/제목/TOC☰/공유↗/인쇄🖨), 슬라이드 전환(translateX+opacity 320ms), ←→키보드+화살표버튼, TOC 사이드패널(240px 슬라이드인), 하단 썸네일 스트립(active 자동스크롤)+도트 인디케이터(≤7개)+페이지 번호, body 스크롤 잠금
- **components/magazine/MagazineSpread** — panType별 스프레드 라우터 (7종 → spreads/ 하위 컴포넌트 디스패치)
- **components/magazine/PanSelector** — 7종 판 타입 선택 UI (인라인 SVG 미리보기 그리드, 선택 체크마크)
- **components/magazine/spreads/** — 7종 스프레드 컴포넌트: FullBleedSpread(전면판 그라디언트 오버레이), SplitSpread(58/42 이미지/텍스트, imageRight 지원), EditorialSpread(70%+30% 사이드바 작가정보/태그/좋아요), TriptychSpread(3장 나란히+프레임 번호), FeatureSpread(대표60%+보조3장), PortraitFocusSpread(중앙 세로+컬러bg), FilmStripSpread(다크bg+필름 천공+수평 스크롤 스냅)
- **components/photo/GenreBadge** — 클릭 가능한 장르 배지 (primary solid + sub outline), /explore?genre=X 이동
- **components/common/GenreTabBar** — 수평 스크롤 탭, showAll·counts·genres 프롭, theme(dark/light). dark 테마: Cosmos 언더라인 스타일(활성 탭 bold+2px 흰선, 비활성 rgba(255,255,255,0.45)); light 테마: pill 버튼 스타일 유지
- **components/photo/GenreSelector** — 4열 그리드 선택 UI (primary/sub/disabled 상태), AI 추천 배너
- **components/common/Toast** — 타입별(success/error/warning/info) 컬러 바+아이콘, 최대 3개 스택, 오른쪽 슬라이드 애니메이션. `ToastStack` 컴포넌트로 다중 토스트 표시 가능
- **components/common/GridSpanPicker** — 12-컬럼 너비 선택
- **components/common/ImageUploader** — 드래그&드롭 + 진행률 + 미리보기
- **components/common/Button** (Feature 38-A1) — `variant`(primary/secondary/ghost/danger) × `size`(sm/md/lg) 매트릭스, hover/focus-visible/active/disabled/loading 5상태. loading 시 호출 측이 넘긴 label 뒤에 점 3개 펄스 애니메이션을 붙이고 클릭 차단(라벨 자체를 하드코딩 문자열로 교체하지 않음 — 호출 측이 "저장 중"/"삭제 중" 등 상황에 맞는 라벨을 그대로 넘기면 됨).
- **components/common/Input** (Feature 38-A2) — `Input`/`Textarea`/`FormField` 3종. default/focus/error/disabled 4상태, WCAG 2.1 AA 속성(`aria-invalid`/`aria-describedby`/`role="alert"`) 포함. `FormField`가 label-htmlFor 자동 연결 + 에러/헬퍼텍스트 렌더링을 담당.
- **components/common/GenreSelector** — 주 장르(1개) + 서브 장르(최대 2개) 선택 컴포넌트 (PhotoForm 사용)
- **components/common/GenreTabBar** — 장르 필터 수평 스크롤 탭바 (ExplorePage 사용). dark=Cosmos 언더라인, light=pill
- **components/photo/GenreBadge** — 단일 장르 뱃지 + SubGenreBadges (PhotoDetail 사용)
- **components/photo/PhotoCard** — 이미지 카드 (색체학 무드 뱃지 포함)
- **components/photo/ColorPalette** — 5색 팔레트 표시 컴포넌트 (복사 기능, shimmer 로딩)
- **components/photo/PhotoViewer** — 전체화면 오버레이 뷰어 (ESC/클릭 닫기, 키보드 네비). **Apple Glass 강화**: 닫기·이전·다음 버튼에 슬라이드쇼(PortfolioSlideshowPage.jsx)와 동일한 `glass()` 레시피 적용 — 풀블리드 사진 위에 뜨는 컨트롤에 한정, 배경/이미지 자체는 변경 없음.
- **components/photo/PhotoNavigation** — 사진 이전/다음 화살표 오버레이 (키보드 ← →)
- **components/photo/ShareButton** — Web Share API / clipboard 공유 버튼
- **components/assistant/ChatWidget** — 플로팅 AI 어시스턴트(Gemini 연동) 위젯. `App.jsx`에서 `!isStandalone`일 때 `Header`와 함께 전역 마운트, 컴포넌트 내부에서 모드를 스스로 결정: 로그인 상태면 `workspace`(회원 전용 앱 사용법 안내, `POST /assistant/chat/workspace`), 비로그인 + `/portfolio/:profileName` 경로면 `portfolio`(방문객 상담, 공개 `POST /assistant/chat`), 그 외에는 렌더링하지 않음. DB 조회 없이 시스템 프롬프트 응답만 하므로 대화 history는 클라이언트 state로만 유지하고 매 요청에 실어 보낸다(서버 미저장). 현재는 웹 프론트엔드에만 적용, mobile(RN)은 별도 작업 필요.
- **components/photo/RelatedPhotos** — 같은 작가 관련 사진 3열 그리드 (최대 6개)
- **components/layout/AdminLayout** — 어드민 사이드바+상단바 셸 (모바일 햄버거 지원)
- **hooks/useColorExtraction** — Canvas K-means(k=5) 대표 색상 추출 훅 (캐싱 포함)
- **contexts/AuthContext** — 전역 인증 상태 (login/signup/updateProfile/logout + localStorage)
- **contexts/LanguageContext** — 다국어(ko/en/ja/zh) 상태. `useLang()` → `{ lang, changeLang, t, SUPPORTED_LANGS }`. `t(key, vars)` — `{var}` 치환 지원. `detectLang()` — localStorage > navigator.language > 'ko' 순 감지
- **i18n/** — `index.js`(TRANSLATIONS, SUPPORTED_LANGS, LANG_META), `ko.js`/`en.js`/`ja.js`/`zh.js` (각 ~150 키)
- **constants/colors.js** — `GENRE_META`(12 장르, emoji/label/color/description) + `GENRE_LIST` 추가
- **constants/breakpoints.js** (Feature: 멀티플랫폼 UI/UX 개선 P0/P1) — `BP = { sm:480, md:768, lg:1024, xl:1280 }` + `mq` 미디어쿼리 헬퍼(mobile/tablet/desktop/upToTablet/**tabletUp**). GalleryPage 마소닉 그리드 768~1023px 3컬럼 브레이크포인트에 사용. **`mq.tabletUp`**(`min-width:768px`, Feature: 포트폴리오 확장성 개선에서 추가) — PC헤더/어드민 사이드바처럼 "모바일이냐 아니냐" 2단만 구분하는 곳 전용. **버그 수정**: Header.jsx/AdminLayout.jsx가 원래 `min-width:768px`이어야 할 자리에 `mq.desktop`(`min-width:1024px`)을 잘못 사용해 768~1023px 구간에서 PC 헤더와 모바일 BottomNav가 동시에 렌더링되던 회귀 수정 — `mq.desktop`(3단 그리드용, ≥1024)과 "모바일의 반대"(2단용, ≥768)는 의미가 다르므로 혼용 금지. 이후 Header.jsx(PC/모바일 767·768 분기 + 콘텐츠 maxWidth), AdminLayout.jsx(사이드바 767·768 분기, 기존 768·769에서 Header와 동일 기준으로 통일), EditorShell.jsx(모바일 서랍 768 분기 ×4), PhotoDetailPage.jsx(모바일 768 + 태블릿 1024 분기, 태블릿에서 이미지 섹션 58%→52% 축소 — 기존에 누락돼 있던 AC 항목 반영), ExplorePage.jsx(태블릿 3컬럼 분기를 GalleryPage와 동일하게 1024 경계로 통일), RelatedPhotos.jsx(480 분기)에 순차 적용. GalleryPage의 600px 모바일 분기, ExplorePage의 640px 모바일 분기, TemplateEditorial/TemplateMinimal의 포트폴리오 마소닉 900·600 분기는 `BP` 토큰과 값이 정확히 일치하지 않아(실제 화면 폭 기준이 달라짐) 시각적 회귀 위험 때문에 이번 라운드에서 값 변경 없이 보류 — 해당 파일을 다른 이유로 수정할 때 점진적으로 맞춰나간다.
- **hooks/usePhotos** — 사진 CRUD + 상태 관리
- **hooks/useToast** — 다중 토스트 상태 관리 (`toasts[]` 배열 + 타입별 자동 닫힘 시간), 구버전 단일 `toast` 객체 하위 호환 유지
- **services/api.js** — photoApi + authApi + inquiryApi + seriesApi
  - `photoApi.search({ keyword, colorMood, memberId, imageRatio, genre, sortBy, order })` — 복합 필터+정렬 (GET /photos)
  - `photoApi.getGenreStats(memberId?)` — GET /photos/genres/stats (장르별 사진 수 통계)
  - `photoApi.getAll({ sortBy, order })` — 전체 사진 목록 (정렬 지원)
  - `photoApi.getByMember(memberId, { sortBy, order })` — 멤버별 사진 목록
  - `photoApi.reorder(orders)` — 순서 일괄 저장 `[{id, displayOrder}]`
  - `authApi.kakaoLogin(code)` — POST /auth/oauth/kakao → TokenResponse
  - `authApi.googleLogin(code)` — POST /auth/oauth/google → TokenResponse
  - `authApi.naverLogin(code, state)` — POST /auth/oauth/naver → TokenResponse
  - `authApi.getMember(id)` — GET /auth/member/:id
  - `authApi.getStats(id)` — GET /auth/member/:id/stats (6종 통계)
  - `authApi.changePassword(id, data)` — PUT /auth/member/:id/password
  - `photoApi.getSuggestions(q)` — GET /photos/suggestions (자동완성)
  - `photoApi.searchByTags(tags, {sortBy, order})` — GET /photos?tags=콤마구분
  - `photoApi.getFeed(memberId, {page, size})` — GET /feed (팔로우 피드)
  - `photoApi.autoTag(photoId)` — POST /photos/:id/auto-tags
  - `followApi.follow/unfollow/isFollowing/getCount/getFollowers/getFollowing` — 팔로우 CRUD
  - `commentApi.getComments/addComment/deleteComment` — 댓글 CRUD
  - `inquiryApi.send/getInbox/getUnreadCount/markRead/remove` — 문의 CRUD
  - `seriesApi.getByMember/getOne/create/update/remove/addPhoto/removePhoto` — 시리즈 CRUD
- **services/deliveryApi.js** — `create/getMyList/getDetail/markViewed/approve/reject/delete`. `getDetail(token, password)` → `POST /delivery/{token}` 바디 전송 (쿼리 파라미터 금지 — 서버 로그 노출 방지).
- **services/analyticsApi.js** — `track(data)` raw fetch 사용(JWT 없음, 무음 실패). `getSummary/getDaily/getTopPhotos/getGenreDistribution` — Axios + JWT.
- **services/bookingApi.js** — `getAvailability/createBooking/getMyBookings/confirmBooking/rejectBooking/cancelBooking/getAvailabilitySettings/saveAvailabilitySettings/addBlockedDate/deleteBlockedDate/getBlockedDates` (11 메서드, Feature 39(a)에서 `getBlockedDates` 추가 + 나머지 4개 메서드가 호출하던 존재하지 않는 `/booking/settings/**` 경로를 실제 백엔드 경로 `/booking/availability-settings`·`/booking/blocked-dates`로 수정).
- **services/meetApi.js** (Feature 35) — `create/list/getPendingCount/getDetail/respond/submitAvailability/getAvailability/confirmDate/updateLocation/cancel/complete/getMessages/sendMessage` (13 메서드). import: `apiClient from '../api/apiClient'`. 모든 호출 → `r.data` 자동 언래핑.
- **services/gatheringApi.js** (Feature 37) — `list/getDetail/getMy/create/update/remove/respond/cancelParticipation/getParticipants/closeRecruitment` (1차 슬라이스) + `createPost/getFeed/deletePost/likePost/unlikePost/addComment/getAlbum` (피드/앨범 슬라이스) + `getNotifications/getUnreadCount/markNotificationRead/markAllNotificationsRead` (알림 슬라이스, 총 21 메서드).
- **services/api.js `reportApi`** — `list({status,page,size})` → GET /admin/reports (Page&lt;AdminReportResponse&gt;). `update(id,{status,resolutionNote})` → PUT /admin/reports/{id}. `submit(photoId,{reason,detail,evidenceUrl})` → POST /photos/{photoId}/report. `myReports()` → GET /photos/reports/mine. `myUnreadCount()` → GET /photos/reports/mine/unread-count. `markSeen(id)` → PUT /photos/reports/mine/{id}/seen.
- **services/portfolioApi.js** — `testimonialApi`(list/create/update/remove), `pressApi`(list/createPress/deletePress/createAchievement/deleteAchievement), `pricingApi`(list/myList/create/update/remove), `brandApi`(list/create/update/remove), `newsletterApi`(subscribe/unsubscribe/mySubscribers).
- **services/assistantApi.js** — `chatPublic(message, history)` → POST /assistant/chat(공개), `chatWorkspace(message, history)` → POST /assistant/chat/workspace(인증). `ChatWidget`에서 사용.
- **services/api.js `portfolioApi`** — `getConfig(profileName)` → GET /portfolio/{profileName}/config (공개). `updateTemplate(profileName, data)` → PUT /portfolio/{profileName}/template (인증 필요).
- **components/portfolio/TestimonialsSection** — 별점 5개 + 고객 추천사 카드 (아바타 이니셜, 더 보기 버튼, fadeSlideUp 애니메이션)
- **components/portfolio/PressAwardsSection** — "As Seen In" 로고 카드 + 수상 타임라인 (AWARD/EXHIBITION/PUBLICATION 배지)
- **components/portfolio/ClientLogoWall** — 클라이언트 브랜드 로고 격자 (텍스트 fallback)
- **components/portfolio/PricingSection** — 촬영 패키지 카드 (featured=MOST POPULAR 배너, JSON 피처 파싱, 문의하기 버튼)
- **components/portfolio/NewsletterSection** — 이메일 구독 폼 (유효성 검사, 재구독·이미구독 상태 처리)
- **components/portfolio/PortfolioContentManager** — 4탭 관리 UI (추천사/언론수상/패키지/클라이언트), ProfilePage 설정 탭에 내장
- **components/delivery/** — `DeliveryPasswordGate` (비밀번호 입력 UI), `DeliveryApproveModal` (선택 수·피드백 텍스트영역), `DeliveryCreateModal` (사진 선택·만료일 탭·선택적 비밀번호 4자 이상)
- **components/analytics/** — `KpiCard` (라벨/값/변화율 화살표), `LineChart` (Canvas 베지어+그라디언트, ResizeObserver), `DonutChart` (Canvas 도넛+범례), `TopPhotos` (메트릭 탭 전환), `AnalyticsDashboard` (전체 조합, 4기간 탭, 스켈레톤)
- **components/booking/** — `StepWizard` (연결선 단계 표시기), `ShootTypeSelector` (7종 3열 그리드, `SHOOT_TYPES` export하여 다른 컴포넌트에서 코드→라벨 매핑 재사용 가능), `BookingCalendar` (순수 JS Date API 달력), `TimeSlotPicker` (마감 오버레이 필 버튼), `BookingForm` (전화 숫자+하이픈 정제, 이메일 형식 검증), `AvailabilityModal` (요일 토글, 시간 슬롯 관리, 차단 날짜). **버그 수정**: `BookingPage.jsx` 3단계 요약에서 `shootType` 원본 코드(`WEDDING` 등)를 그대로 표시해 한글 UI 중간에 영문 enum이 노출되던 문제 — `ShootTypeSelector`의 `SHOOT_TYPES` 목록에서 라벨을 조회하도록 수정(어드민 쪽 `BookingDashboard.jsx`는 이미 자체 `SHOOT_LABELS`로 정상 처리 중이었음).
- **components/meet/** (Feature 35) — `MeetCalendar` (3색 날짜 표시: 파랑=내 선택, 보라=상대, 초록=겹침; 월 이동 화살표, 과거 날짜 비활성화), `MeetLocationPicker` (Kakao Maps JS SDK 동적 로드 + 키워드 검색 + 마커; `REACT_APP_KAKAO_MAP_KEY` 없으면 텍스트 입력 fallback; readOnly 시 지도+링크 표시), `MeetChat` (30초 polling setInterval, 날짜 구분선, 우측 파랑=본인/좌측 다크=상대, Enter 전송), `MeetRequestModal` (3단계 위저드: 날짜 선택→장소→메시지+요약)
- **services/uploadApi.js** — `uploadImage(file, folder, onProgress)` → Axios multipart 업로드
- **services/mockData.js** — (레거시, 현재 미사용)

Routing via React Router DOM v6. No Redux — state managed through Context + local state.

**공개 라우트** (로그인 불필요):
- `/portfolio/:profileName` — PortfolioPage (작가 공개 포트폴리오, 문의하기 + 촬영 예약 CTA 포함)
- `/portfolio/:profileName/slideshow` — PortfolioSlideshowPage (풀스크린 슬라이드쇼, 로그인 불필요)
- `/inquiry/:profileName?memberId=` — InquiryFormPage (촬영 문의 폼, 헤더 없는 standalone)
- `/proof/:token` — ClientDeliveryPage (납품 사진 확인, Standalone, Header 없음, BCrypt 비밀번호 보호)
- `/booking/:profileName` — BookingPage (촬영 예약 3단계 위저드, Standalone, Header 없음)
- `/oauth/kakao/callback` — KakaoCallbackPage (카카오 OAuth 콜백)
- `/oauth/google/callback` — GoogleCallbackPage (구글 OAuth 콜백)
- `/oauth/naver/callback` — NaverCallbackPage (네이버 OAuth 콜백)
- `/oauth/apple/result` — AppleResultPage (Apple 백엔드 리다이렉트 결과)
- `/gatherings` — GatheringsPage (사진 모임 목록, Feature 37)
- `/gatherings/:id` — GatheringDetailPage (모임 상세 — 모집공지/피드, Feature 37)
- `/gatherings/:id/album` — GatheringAlbumPage (모임 종료 후 앨범, Feature 37)

**보호 라우트** (로그인 필요):
- `/calendar` — IntegratedCalendarPage (예약·약속·모임 통합 캘린더, Feature 39)
- `/inbox` — InquiryInboxPage (문의 수신함)
- `/series` — SeriesPage (시리즈/컬렉션 관리)
- `/feed` — FeedPage (팔로우 피드)
- `/editor` — ImageEditorPage (이미지 에디터, Standalone — Header 없음)
- `/deliveries` — DeliveriesPage (납품 세트 목록 + 생성)
- `/bookings` — BookingDashboard (예약 수신함 + 가용 시간 설정)
- `/meets` — MeetsPage (약속 목록 + 상태별 탭 필터, Feature 35)
- `/meets/:id` — MeetDetailPage (약속 상세 — 달력/장소/채팅 3탭, Feature 35)
- `/gatherings/new`, `/gatherings/:id/edit` — GatheringFormPage (모임 생성/수정, Feature 37)
- `/gatherings/:id/manage` — GatheringManagePage (참여자 관리, 생성자 전용, Feature 37)
- `/gatherings/calendar` — GatheringCalendarPage (내 모임 달력, Feature 37)
- `/gatherings/notifications` — GatheringNotificationsPage (내 알림 목록, Feature 37)

**어드민 라우트** (ADMIN 권한 필요, `ProtectedRoute requiredRoles=['ADMIN']`):
- `/admin` — AdminDashboardPage (통계 카드 + 장르 도넛 차트 + 미분류 경고)
- `/admin/gallery-order` — AdminGalleryOrderPage (멤버 선택 + 드래그 순서 관리)
- `/admin/members` — AdminMembersPage (회원 목록, 권한 변경, 삭제)
- `/admin/photos` — AdminPhotosPage (전체 사진 목록, 인라인 장르 편집, 강제 삭제)
- `/admin/categories` — AdminCategoryPage (장르별 분포 통계 테이블, 미분류 경고)
- `/admin/tags` — AdminTagsPage (태그 목록·사진 수·최근 사용일, 태그 삭제, 태그 병합 MergeModal)
- `/admin/moderation` — AdminModerationPage (신고 목록 PENDING/RESOLVED/DISMISSED 탭, 2단계 사진 삭제 확인)

> ⚠️ `/gallery/sort` (PhotoSortPage) 는 일반 사용자 앱에서 **제거**됨.  
> 사진 표시 순서 관리는 어드민 패널(`/admin/gallery-order`)로 이관. `10_ADMIN_PANEL.md` 참조.

**소셜 OAuth 흐름 (카카오/구글/네이버)**:
1. LoginPage 버튼 클릭 → OAuth 제공자 인증 페이지로 리다이렉트
2. 인증 후 `/oauth/{provider}/callback?code=xxx` 리다이렉트
3. Callback 페이지 → `POST /api/auth/oauth/{provider}` → `TokenResponse(accessToken, refreshToken, member)` 수신 → `authStore.loginSuccess()`

**Apple OAuth 흐름** (form_post 특수 처리):
1. LoginPage Apple 버튼 → `appleid.apple.com/auth/authorize` (redirect_uri=백엔드 URL)
2. Apple → `POST /api/auth/oauth/apple/callback` (백엔드)
3. 백엔드 → id_token 파싱 → 회원 생성/조회 → JWT 발급 → 프론트엔드 `/oauth/apple/result?accessToken=...` 리다이렉트
4. AppleResultPage → `/auth/member/:id` 호출 → `authStore.loginSuccess()`

**모든 OAuth 엔드포인트** → `TokenResponse` 반환 (accessToken, refreshToken, member 포함)
- `POST /api/auth/oauth/kakao` — `AuthService.issueTokensForOAuth()` 공통 처리
- `POST /api/auth/oauth/google` — GoogleOAuthService
- `POST /api/auth/oauth/naver` — NaverOAuthService
- `POST /api/auth/oauth/apple/callback` — AppleOAuthService (백엔드 form_post 수신)

**갤러리 12-컬럼 그리드**: `packRows()` 알고리즘으로 `gridColSpan` 합이 12가 되도록 사진을 행으로 묶어 CSS flexbox로 렌더링. 각 사진은 `flex: gridColSpan` 비율로 너비 배분.

#### Frontend 환경변수 파일

```
frontend/
├── .env.development    # npm start 시 로드 (localhost)
└── .env.production     # npm run build 시 로드 (운영 URL)
```

Vercel 배포 시 실제 값은 Vercel 대시보드 Environment Variables에서 설정.

### Mobile (`mobile/`)

**폴더 구조 규칙:**
```
mobile/
├── assets/       # 앱 아이콘, 스플래시, favicon (placeholder 포함)
├── components/   # 재사용 가능한 공통 UI 컴포넌트
│   ├── ImageUploadButton.js  # expo-image-picker 기반 업로드 버튼
│   ├── SkeletonCard.js  # (Feature 38-B1) RN Animated opacity 펄스(0.4→1→0.4, 1200ms linear) 기반
│   │                      SkeletonPhotoCard/SkeletonFeedCard/SkeletonGatheringCard 3종, 외부 라이브러리 없음
│   └── EmptyState.js    # (Feature 38-B3) icon/title/description/actionLabel/onAction 공용 빈 상태 컴포넌트
├── constants/    # 색상·여백·폰트 상수 (colors.js, layout.js)
├── hooks/        # 커스텀 훅 (usePhotos, useToast)
├── screens/      # 페이지 단위 컴포넌트
│   ├── LoginScreen.js / SignUpScreen.js
│   ├── ExploreScreen.js     # 실제 API + 검색바 + 장르필터(GENRES 수평스크롤, 웹 GENRE_LIST와 동일 12종) + 무드필터 + 2컬럼 그리드. SkeletonPhotoCard(6개)/EmptyState 적용(Feature 38)
│   ├── GalleryScreen.js     # (Feature 38) **버그 수정**: `photos`/`loading`/`onPhotoPress`를 props로 받는 프레젠테이션
│   │                          컴포넌트였는데 실제 라이브 네비게이터(`App.js`→`src/navigation/AppNavigator.js`)는
│   │                          `Tab.Screen component={GalleryScreen}`으로 등록해 navigation/route만 넘겨주고 있어
│   │                          `photos.length`에서 매번 즉시 크래시하던 문제 — 화면이 `photoApi.getByMember(user.id)`로
│   │                          자기 데이터를 불러오는 자체 상태 관리 화면으로 전환, pull-to-refresh(ScrollView
│   │                          refreshControl) + SkeletonPhotoCard(4개)/EmptyState 추가. `mobile/navigation/AppNavigator.js`
│   │                          (구 state 기반, `screen`/`navigate` local state)는 `App.js`가 참조하지 않는 죽은 코드이므로
│   │                          그 파일 안의 `<GalleryScreen photos={...}/>` 같은 구식 호출부는 무시할 것.
│   ├── PhotoDetailScreen.js # 댓글/대댓글 + 좋아요/저장 (API 수정)
│   ├── PhotoFormScreen.js   # expo-image-picker 갤러리/카메라 + 파일업로드
│   ├── ProfileScreen.js     # bio/location/specialties/아바타업로드/통계 + "메뉴" 섹션(🤝 약속, 🌐 내 포트폴리오 보기 — Linking.openURL로 웹 포트폴리오 페이지를 시스템 브라우저에서 오픈 + 📤 공유하기(Share.share), profileName 없으면 안내 Alert). (Feature 38-B2) **버그 수정**: 통계 로딩이 RN에는 존재하지 않는 웹페이지 origin에 의존해 `fetch('/api/auth/member/:id/stats')` 상대경로로 호출하고 있어 항상 실패 후 조용히 catch되어 통계 섹션이 한 번도 채워진 적이 없었음 — `authMobileApi.getStats(id)`(신규, `GET /auth/member/:id/stats`, apiClient 기반이라 Android/iOS 베이스 URL 분기·Bearer 토큰·401 재발급 자동 적용) 추가 후 교체. ScrollView에 RefreshControl 추가해 pull-to-refresh 시 통계 재조회.
│   ├── SeriesScreen.js      # 시리즈 목록 + 펼치기/사진 그리드 + SeriesCollage(previewPhotos 1~3장 콜라주 보드 카드, 라이트 테마)
│   ├── FeedScreen.js        # 팔로우 피드 + 무한스크롤 (NEW)
│   ├── MeetsScreen.js       # 약속 목록 + 상태별 탭 필터(전체/대기중/조율중/확정/완료) + MeetCard + FAB(새 약속 요청 모달: 회원검색→날짜선택→메시지, 라이트 테마)
│   ├── MeetDetailScreen.js  # 약속 상세 — 커스텀 헤더 + 3탭(💬채팅 기본/📅일정/📍장소), PENDING 수신자 수락·거절 바, CONFIRMED 완료 처리 바, 채팅 30초 polling
│   ├── PortfolioSlideshowScreen.js  # (신규) 웹 PortfolioSlideshowPage와 동일 기능의 네이티브 슬라이드쇼 — `photoApi.getPortfolio(profileName)` 재사용(신규 백엔드 없음), FlatList 페이징 스와이프 + 자동재생 3s + 도트 인디케이터. 상단/하단 컨트롤바는 `expo-blur`의 `BlurView`(intensity=40, tint="dark") + 반투명 테두리 + 상단 하이라이트 라인으로 애플 Liquid Glass 머티리얼 구현(DESIGN_PROMPTS/design/DESIGN_PROMPT_apple-glass-slideshow.md, 웹과 동일 컨셉이나 이 화면에만 한정). `ProfileScreen.js` 메뉴 섹션의 "🌐 내 포트폴리오 보기"(외부 브라우저) 옆에 "🎞 슬라이드쇼로 보기"(네이티브 이동) 항목 추가. `AppNavigator.js` MainStack에 `PortfolioSlideshow` 등록(headerShown:false).
│   ├── GatheringsScreen.js  # (신규, Feature 37) 모집중 모임 + 내 모임(FlatList, RefreshControl), 웹 GatheringsPage 대응 — 단 웹과 달리 생성/수정/관리/달력 화면은 모바일 미구현(의도적 범위 축소, Instagram 공유 도달에 필요한 최소 화면만).
│   ├── GatheringDetailScreen.js  # (신규) 모임 정보 + RECRUITING 참여/미참여(Alert 확인) + ONGOING/ENDED 피드(읽기 전용 — 좋아요/댓글 작성은 미구현, 카운트만 표시). 참여자 게시물마다 "📷 공유" 버튼 → GatheringInstagramShare로 이동.
│   ├── GatheringInstagramShareScreen.js  # (신규) Instagram Story 공유 화면 — 템플릿 3종(사진중심/사진+참여자/사진+글) 선택, `GET /instagram-candidates`로 받은 참여자 중 기본 전체 체크된 태그 후보 목록(실제 멘션 아님을 명시), `react-native-view-shot`으로 미리보기 View를 이미지로 캡처 후 `react-native-share`의 `shareSingle({social: Social.INSTAGRAM_STORIES, backgroundImage})`로 OS 딥링크 호출. Instagram 미설치·공유 실패 시 Alert로 대체 안내. 공유 시도는 `shareToInstagram()`로 fire-and-forget 로깅(실패해도 공유 자체는 진행).
│   ├── BookingScreen.js  # (Feature 38-B4 신규 → Feature 39-d 갱신) 예약 조회 — 상태별(대기중/확정됨/완료/취소·거절) SectionList,
│   │                       REQUESTED 건에 확인/거절 Alert 액션. 우측 상단 "⚙ 설정"은 Feature 38 당시 웹 `/bookings` Linking
│   │                       딥링크였으나, Feature 39(d)에서 네이티브 `AvailabilitySettingsScreen`으로 직접 이동하도록 교체(P3 보류 해제).
│   │                       `ProfileScreen` 메뉴 "🗓 예약 관리"에서 진입.
│   ├── AvailabilitySettingsScreen.js # (신규, Feature 39-d) 가용 시간 설정 — 요일 토글 칩(백엔드 `weekdays`는 1=월..7=일
│   │                       CSV, 화면 표시는 일~토 순서라 `uiIndexToBackend`/`backendToUiIndex`로 매핑), 시간 슬롯(HH:MM 텍스트
│   │                       입력 + 정규식 검증, 외부 시간 피커 라이브러리 없음), 버퍼 시간, 예약 메모, 차단 날짜 목록 조회·추가·삭제.
│   │                       `bookingApi.getAvailabilitySettings/saveAvailabilitySettings/getBlockedDates/addBlockedDate/
│   │                       deleteBlockedDate` 사용. `BookingScreen`의 "⚙ 설정"에서 진입. `AppNavigator.js`에 `AvailabilitySettings`
│   │                       스택 등록.
│   └── DeliveryScreen.js # (신규, Feature 38-B4) 납품 세트 목록 — 상태 배지(PENDING/REVIEWED/APPROVED/REJECTED),
│                           `expo-clipboard`로 `/proof/:token` 링크 복사. 세트 생성(사진 선택 UI)은 범위 밖.
│                           `ProfileScreen` 메뉴 "📦 납품 관리"에서 진입.
├── services/     # API 호출 (api.js — photoApi/followApi/commentApi/seriesApi/meetApi re-export)
├── src/
│   ├── api/
│   │   ├── apiClient.js     # Axios + JWT 자동 첨부 + 토큰 재발급
│   │   ├── photoApi.js      # getAll/search/getFeed/uploadFile 추가
│   │   ├── followApi.js     # follow/unfollow/check/count/list (NEW)
│   │   ├── commentApi.js    # getComments/addComment/deleteComment (NEW)
│   │   ├── seriesApi.js     # getByMember/getOne/CRUD (NEW)
│   │   ├── meetApi.js       # create/list/getPendingCount/getDetail/respond/submitAvailability/getAvailability/confirmDate/updateLocation/cancel/complete/getMessages/sendMessage/searchMembers (웹 meetApi.js와 동일 엔드포인트)
│   │   ├── gatheringApi.js  # (신규, Feature 37) list/getMy/getDetail/respond/cancelParticipation/getFeed/getAlbum/getInstagramCandidates/shareToInstagram — 웹 gatheringApi.js의 부분집합(생성/수정/참여자관리/앨범페이지 없음, 모바일 범위 축소). getUnreadCount(신규, Feature 38-B4) 추가.
│   │   ├── bookingApi.js    # (Feature 38-B4: getMyBookings/confirmBooking/rejectBooking → Feature 39-d 확장) cancelBooking/
│   │   │                      getAvailabilitySettings/saveAvailabilitySettings/getBlockedDates/addBlockedDate/deleteBlockedDate
│   │   │                      6개 추가(총 8 메서드) — 웹 bookingApi.js와 동일 엔드포인트 계약 사용
│   │   └── deliveryApi.js   # (신규, Feature 38-B4) getMyList만 (세트 생성·상세·승인/거절은 범위 밖)
│   ├── navigation/
│   │   └── AppNavigator.js  # BottomTabNavigator(탐색/갤러리/등록/피드/프로필) + Stack(PhotoForm/Series/Meets/MeetDetail/Legal/Gatherings/GatheringDetail/GatheringInstagramShare)
│   ├── storage/secureStorage.js
│   ├── store/authStore.js
│   ├── utils/instagramShare.js / instagramShare.web.js  # (신규) `react-native-view-shot`/`react-native-share`(네이티브 전용 모듈) 래퍼 — **버그 회피**: 처음에 metro.config.js의 커스텀 `resolver.resolveRequest`로 웹 번들 시 이 두 패키지를 mock으로 리다이렉트하려 했으나 이 프로젝트의 Expo/Metro 조합에서 커스텀 리졸버가 전혀 호출되지 않는 것을 디버그 로그로 확인(원인 불명, 더 파고들지 않음) — Metro의 표준 플랫폼별 확장자 해석(`.web.js`)으로 전환해 해결. 새 네이티브 모듈을 웹 번들에서 제외해야 할 때는 이 파일 쌍 패턴을 그대로 재사용할 것(metro.config.js 커스텀 리졸버 방식은 이 프로젝트에서 작동하지 않는 것으로 확인됨).
│   └── utils/portfolioUrl.js  # getPortfolioUrl(profileName) — 운영 https://app.example.com, 개발 http://localhost:3000
├── store/
│   └── AuthContext.js       # useAuth() 인터페이스 (SecureStore 기반). **`App.js`에서 `<AuthProvider>`로 `<AppNavigator/>`를 감싸야 동작함** — 누락 시 useAuth() 사용하는 모든 화면에서 즉시 throw(버그 수정 완료)
└── utils/
    └── uploadImage.js
```

**규칙:**
- 화면(페이지) 단위 컴포넌트 → `screens/`
- 여러 화면에서 쓰는 UI 조각 → `components/`
- API 호출은 반드시 `services/api.js` 또는 `src/api/` 경유
- 색상·간격 하드코딩 금지 → `constants/colors.js`, `constants/layout.js` 상수 사용
- 상태 로직 재사용 → `hooks/`에 커스텀 훅으로 분리
- 이미지 선택: `expo-image-picker` (갤러리/카메라), 업로드: `POST /api/upload/image`

**네비게이션 구조 (AppNavigator.js):**
```
Root Stack
 ├── [미인증] AuthStack: Login → SignUp
 └── [인증] MainStack
      ├── Main (BottomTabNavigator)
      │    ├── ExploreTab   — 탐색 (🔍)
      │    ├── GalleryTab   — 갤러리 (🖼️)
      │    ├── PhotoFormTab — 등록 (＋, 원형 강조)
      │    ├── FeedTab      — 피드 (📰)
      │    └── ProfileTab   — 프로필 (👤)
      ├── PhotoDetail — 사진 상세 (modal, headerShown:false)
      ├── PhotoForm   — 사진 등록/수정 (Stack)
      ├── Series      — 시리즈 (Stack)
      ├── Meets       — 약속 목록 (Stack, ProfileScreen "메뉴" 섹션에서 진입)
      └── MeetDetail  — 약속 상세 (Stack, headerShown:false — 커스텀 헤더)
```

**주요 의존성 (mobile/package.json):**
```
expo: ~49.0.14
expo-image-picker: ~14.3.2      # 갤러리/카메라 이미지 선택
expo-file-system: ~15.4.5       # 파일 시스템 접근
expo-blur: ~12.4.1              # PortfolioSlideshowScreen 글라스 컨트롤바(BlurView)
react-native-view-shot: ^3.8.0  # (신규, Feature 37) Instagram 공유용 미리보기 View → 이미지 캡처, 네이티브 전용(웹은 instagramShare.web.js 스텁)
react-native-share: ^9.4.1      # (신규, Feature 37) Instagram Stories 딥링크 공유, 네이티브 전용(웹은 instagramShare.web.js 스텁)
expo-clipboard: ~4.3.1          # (신규, Feature 38-B4) DeliveryScreen 납품 링크 복사 — 웹/네이티브 모두 지원되는 공식 Expo 모듈
@react-navigation/bottom-tabs: ^6.5.20  # 하단 탭 네비게이션
react-dom / react-native-web    # 웹 export 지원
```

API base URL:
- Android 에뮬레이터: `http://10.0.2.2:8080`
- iOS 시뮬레이터: `http://localhost:8080`
- 운영: `https://api.example.com`

### MCP 서버 (`mcp-server/`)

`happiness-mcp-server` — 백엔드의 **공개·인증불필요 GET 엔드포인트만** 감싸는 읽기 전용 MCP(Model Context Protocol) 서버. Claude Desktop 등 MCP 클라이언트가 로그인 없이 사진/포트폴리오를 탐색할 수 있게 해준다. 쓰기/삭제/인증 필요 엔드포인트는 절대 노출하지 않음(`services/apiClient.ts`가 GET만 지원하도록 구조적으로 제한).

- **스택**: Node/TypeScript, `@modelcontextprotocol/sdk`, Zod, stdio transport(로컬 실행 전용)
- **도구 5종**: `happiness_search_photos`(`GET /photos`), `happiness_get_photo`(`GET /photos/:id`), `happiness_get_portfolio`(`GET /portfolio/:profileName`), `happiness_get_portfolio_config`(`GET /portfolio/:profileName/config`), `happiness_list_series`(`GET /series?memberId=`). 모든 사진/작가 응답에 `author_member_id`/`member.member_id`를 포함시켜 `happiness_list_series`가 요구하는 numeric member_id를 다른 도구 결과만으로 실제로 발견할 수 있도록 함(초기 설계 시 이 값이 어디에도 노출되지 않아 해당 도구가 사실상 도달 불가능했던 문제를 mcp-builder 평가셋 설계 중 발견해 수정).
- **의도적으로 제외**: `GET /photos/genres/stats` — 문서상 공개처럼 보이지만 실제로는 JWT 인증이 필요함을 curl로 직접 확인 후 제외(추측 금지 원칙)
- **설정**: `HAPPINESS_API_URL` 환경변수(기본 `http://localhost:8080/api`)
- **실행**: `cd mcp-server && npm install && npm run build && npm start`
- **평가셋**(`mcp-server/eval/`): `seed.mjs`(2명의 작가·사진 7장·시리즈 1개로 구성된 고정 시드 데이터 생성) + `evaluation.xml`(mcp-builder 스킬 가이드 형식의 QA 10쌍, 실제 도구 호출로 정답 검증 완료)
- 상세 사용법·Claude Desktop 연동 예시는 `mcp-server/README.md` 참고

### Docker

**로컬 개발** (`docker-compose.yml`): backend + redis  
**운영 배포** (`backend/Dockerfile`): 멀티스테이지 빌드 (JDK 21 빌드 → JRE 21 런타임)

```
backend/Dockerfile:
  Stage 1 (builder): eclipse-temurin:21-jdk-alpine → ./gradlew bootJar
  Stage 2 (runtime): eclipse-temurin:21-jre-alpine
    - 전용 유저(appuser) 실행 (root 금지)
    - JVM: -Xms128m -Xmx400m (Railway 512MB 플랜 최적화)
    - HEALTHCHECK: /actuator/health
```

---

## Claude Code 자동화 — 화면 변경 스크린샷 이메일 알림 (Stop hook)

happiness-admin 저장소(`.claude/hooks/notify-page-change.sh`, 별도 프로젝트)에서 이미 검증된 방식을 이 프로젝트에도
동일하게 적용. 화면 관련 파일이 바뀐 채로 턴이 끝나면(Stop 이벤트), Claude를 멈추지 않고 "변경된 페이지만
스크린샷 찍어 Gmail로 보내라"는 지시를 다시 주입한다.

- **감시 경로**: `frontend/src/pages`(웹, `.jsx`, `admin/` 하위 포함) + `mobile/screens`(모바일, `.js`) — happiness-admin은
  프론트엔드가 하나뿐이라 경로 1개만 봤지만, 이 프로젝트는 웹/모바일 두 화면 디렉터리를 모두 감시하도록 확장.
  `frontend/src/pages/admin/**`은 별도 제외하지 않음 — 사용자가 대비시킨 "어드민"은 별도 저장소인 happiness-admin을
  가리키는 것이지, 이 저장소 내부의 `/admin/**` 서브페이지가 아니기 때문.
- **동작 방식** (`.claude/hooks/notify-page-change.sh`, Stop hook으로 등록): Stop hook은 이번 턴에 어떤 도구가
  호출됐는지 알 수 없으므로, `git status --porcelain` + `git diff`를 감시 경로에 대해 직접 실행해 화면 파일 변경
  여부를 스스로 판단한다. 커밋 여부와 무관하게 "지금 워킹트리 상태"를 기준으로 하고(대부분 작업은 여러 턴에 걸쳐
  커밋 전 상태로 진행되므로), 두 명령의 출력을 합쳐 SHA256 해시를 낸 뒤 `.claude/.page-change-notify-marker`
  (로컬 상태, `.gitignore` 처리)에 저장해 같은 미완료 변경에 대해 매 턴 반복 알림이 뜨지 않게 한다. 변경이 없거나
  이미 알린 변경과 동일하면 조용히 `exit 0`. 새 변경이면 `jq`로 안전하게 이스케이프한
  `{"decision": "block", "reason": "..."}` JSON을 출력해 agent-browser 스크린샷 + Gmail MCP 발송 지시를 재주입.
- **수신 이메일**: `jtyang0227@gmail.com` (스크립트에 하드코딩).
- **스크린샷 첨부 시 필수 규칙** (happiness-admin에서 실제로 겪은 실패 사례 반영): Gmail MCP 첨부파일은 base64를
  도구 호출 파라미터로 직접 넣어야 하는데, 원본 스크린샷을 그대로 base64 인코딩하면 문자열이 너무 길어(수만 자)
  도구 호출로 옮겨 적는 과정에서 깨져 Gmail이 "base64 디코딩 실패"로 거부한다. 따라서 첨부 전 반드시 Python(PIL)
  등으로 가로 200~250px, JPEG 품질 40~50% 수준으로 리사이즈·압축 후 base64 인코딩하고, 인코딩된 문자열이 5000자를
  넘으면 더 줄인다. Gmail MCP가 이 채팅에 꺼져 있으면 조용히 실패하지 말고 사용자에게 켜달라고 반드시 알린다.
  (hook의 `reason` 필드 자체에 이 4가지 규칙이 이미 포함되어 매 실행마다 Claude에게 재주입됨.)
- **검증**: 화면 파일 없이 실행 → 무출력 exit 0 확인. 화면 파일(웹+모바일 각 1개) 변경 후 실행 → 올바르게 이스케이프된
  `{"decision":"block", ...}` JSON 확인. 동일 변경 상태로 재실행 → 무출력(중복 알림 없음) 확인. 새 파일이 추가로
  바뀌면 다시 알림이 뜨는 것까지 확인.

---

## CI/CD (GitHub Actions)

파일: `.github/workflows/deploy.yml`

```
master 브랜치 push 시 자동 실행:
  1. backend-ci   — Gradle 테스트 + bootJar 빌드
  2. frontend-ci  — npm ci + build + test
  3. docker-build — GHCR에 이미지 Push (sha + latest 태그)
  4. deploy-backend  — Railway CLI로 자동 배포
  5. deploy-frontend — Vercel Action으로 자동 배포

PR 시: 1, 2번(CI)만 실행
```

### GitHub Secrets 등록 목록

```
RAILWAY_TOKEN          — Railway Account → Tokens
VERCEL_TOKEN           — Vercel Settings → Tokens
VERCEL_ORG_ID          — Vercel Settings → General
VERCEL_PROJECT_ID      — Vercel Project → Settings
REACT_APP_API_URL      — https://api.example.com
REACT_APP_SUPABASE_URL — Supabase Project URL
REACT_APP_SUPABASE_ANON_KEY — Supabase anon key
```

---

## DNS 설정 (Cloudflare)

```
Cloudflare DNS 레코드 (Proxy ON):
  app  CNAME  cname.vercel-dns.com     ← React SPA
  api  CNAME  xxx.railway.app          ← Spring Boot
  @    CNAME  cname.vercel-dns.com     ← apex 도메인
  www  CNAME  app.example.com

SSL/TLS: Full (strict) 모드
HTTPS: Always Use HTTPS ON
```

---

## Supabase 설정

```
1. supabase.com → New Project (Region: Northeast Asia)
2. Settings → API → 키 복사
3. Storage → Bucket 생성: images (Public ON)
4. Storage → Policies:
   - SELECT: 전체 공개
   - INSERT: authenticated 유저만
5. Settings → Database → URI 복사 → DATABASE_URL
```

---

## Mobile 앱스토어 심사 준수 가이드

React Native(Expo) 코드가 App Store / Google Play 심사를 통과하기 위한 필수 체크리스트입니다.

### app.json 현재 설정 (mobile/app.json)

```json
{
  "expo": {
    "name": "Happiness",
    "slug": "happiness-gallery",
    "version": "1.0.0",
    "orientation": "portrait",
    "privacy": "public",
    "sdkVersion": "49.0.0",
    "platforms": ["ios", "android", "web"],
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash.png", "backgroundColor": "#F2F4F6" },
    "ios": {
      "bundleIdentifier": "com.happiness.gallery",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "프로필 사진 선택 및 사진 등록을 위해 사진 라이브러리에 접근합니다.",
        "NSCameraUsageDescription": "사진 촬영을 위해 카메라에 접근합니다.",
        "NSPhotoLibraryAddUsageDescription": "편집한 사진을 사진 라이브러리에 저장합니다."
      }
    },
    "android": {
      "package": "com.happiness.gallery",
      "versionCode": 1,
      "permissions": ["READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE", "CAMERA"]
    },
    "web": { "favicon": "./assets/favicon.png", "bundler": "metro" }
  }
}
```

**배포 전 필수:** `assets/icon.png` 1024×1024px, `assets/splash.png` 실제 이미지로 교체 (현재 placeholder).

### App Store (iOS) 심사 체크리스트

| 항목 | 요구사항 | 현재 상태 |
|------|---------|---------|
| **bundleIdentifier** | 고유 역방향 도메인 | ✅ `com.happiness.gallery` |
| **개인정보처리방침** | 앱 내 접근 가능한 URL 필수 | ✅ LegalScreen — LoginScreen/SignUpScreen/ProfileScreen 링크 완료 |
| **이용약관** | 회원가입 시 동의 절차 | ✅ SignUpScreen termsAgreed 체크박스 + 링크 완료 |
| **카메라 권한** | NSCameraUsageDescription 명시 | ✅ app.json 설정 완료 |
| **사진 라이브러리 권한** | NSPhotoLibraryUsageDescription 명시 | ✅ app.json 설정 완료 |
| **사용자 데이터** | 수집 항목 명시 | ⚠️ App Store Connect "App Privacy" 섹션 수동 작성 필요 |
| **연령 등급** | 콘텐츠 등급 설정 | ⚠️ App Store Connect에서 "4+" 수동 선택 필요 |
| **스크린샷** | 기기별 최소 3장 | ⚠️ 6.5", 5.5" iPhone, 12.9" iPad 수동 캡처 필요 |
| **앱 아이콘** | 1024×1024px PNG (알파 없음) | ⚠️ `assets/icon.png` 실제 아이콘으로 교체 필요 |
| **스플래시 스크린** | 로딩 화면 | ⚠️ `assets/splash.png` 실제 이미지로 교체 필요 |

### Google Play 심사 체크리스트

| 항목 | 요구사항 | 현재 상태 |
|------|---------|---------|
| **package** | 고유 패키지명 | ✅ `com.happiness.gallery` |
| **데이터 안전** | 수집 데이터 선언 | ⚠️ Play Console "데이터 안전" 섹션 수동 작성 필요 |
| **개인정보처리방침** | 공개 URL 필수 | ✅ 앱 내 LegalScreen 포함 / ⚠️ Play Console URL 등록 필요 |
| **CAMERA 권한** | 실제로 사용하는 권한만 선언 | ✅ PhotoFormScreen 카메라 촬영에 사용 |
| **STORAGE 권한** | READ/WRITE 선언 | ✅ 갤러리 이미지 선택에 사용 |
| **타겟 API 레벨** | Android 14(API 34) 이상 | ✅ `compileSdkVersion 34`, `targetSdkVersion 34` 설정 완료 |
| **콘텐츠 등급** | 설문 후 자동 부여 | ⚠️ Play Console 콘텐츠 등급 설문 수동 완료 필요 |

### 코딩 규칙 (심사 통과 유지)

- **실제 기능 구현**: 테스트 계정, 더미 버튼, 빈 화면 등 미완성 UI 금지
- **개인정보 최소 수집**: 이메일, 이름 외 불필요한 데이터 수집 금지
- **권한 최소화**: 실제로 필요한 권한만 선언 (현재 카메라·사진 라이브러리)
- **오류 처리**: 모든 API 호출에 사용자 친화적 오류 메시지 제공
- **로딩 상태**: 비동기 작업 중 반드시 ActivityIndicator 표시
- **오프라인 대응**: 네트워크 없을 때 앱이 크래시되지 않도록 try-catch 처리
- **LegalScreen**: `screens/LegalScreen.js` — 개인정보처리방침·이용약관 탭 UI. LoginScreen/SignUpScreen/ProfileScreen에서 링크됨
- **약관 동의**: SignUpScreen에서 termsAgreed 체크박스 필수. 미동의 시 가입 차단

### 배포 전 필수 작업

```bash
npm install -g eas-cli
eas login
eas build --platform ios      # App Store용 IPA
eas build --platform android  # Google Play용 AAB
```

---

## 기능 구현 테스트 규칙

**모든 기능 구현은 아래 테스트를 통과한 후 커밋한다.**

### 백엔드 테스트

```bash
cd backend
./gradlew clean build -x test          # BUILD SUCCESSFUL 확인
./gradlew test                         # BUILD SUCCESSFUL 확인

# 서버 실행 후 스모크 테스트
./gradlew bootRun &
curl -s http://localhost:8080/actuator/health
curl -s http://localhost:8080/api/photos | python3 -m json.tool
```

### 프론트엔드 테스트

```bash
cd frontend
npm run build    # "Compiled successfully." 확인
npm test -- --watchAll=false

# 수동 테스트 체크리스트:
#   - 로그인/회원가입 정상 동작
#   - 사진 등록 (파일 업로드): ImageUploader 드래그&드롭, 진행률, 미리보기
#   - 사진 등록 (URL 모드): URL 입력 후 미리보기 표시
#   - 갤러리: 사진 그리드 정상 렌더링
```

### 모바일 테스트

```bash
cd mobile
npm install --legacy-peer-deps
npx expo export --platform web 2>&1 | grep -E "Finished|Error"
# "Finished saving JS Bundles" 확인 (아이콘 CRC 경고는 무시 가능)

# 수동 테스트 체크리스트 (에뮬레이터/실기기):
#   - 로그인/회원가입 정상 동작
#   - 탐색 탭: API 사진 로드 + 검색 + 무드 필터
#   - 피드 탭: 팔로우 유저 사진 로드 + 무한스크롤
#   - 등록 탭: 갤러리/카메라 이미지 선택 → 업로드 → 등록
#   - 프로필 탭: 아바타 변경 + bio/location/specialties 저장
#   - 사진 상세: 좋아요/저장 + 댓글/대댓글 작성/삭제
#   - 시리즈: 목록 로드 + 사진 펼치기/접기
```

### 이미지 보정 기능 테스트 체크리스트

| 항목 | 테스트 방법 | 통과 기준 |
|------|------------|----------|
| 파일 업로드 탭 표시 | PhotoFormPage 접속 | "📁 파일 업로드" / "🔗 URL 입력" 탭 표시 |
| 이미지 선택 | 파일 업로드 탭 → 이미지 선택 | 캔버스 프리뷰 + 보정 패널 표시 |
| 노출 슬라이더 | 슬라이더 조작 | 프리뷰 밝기 실시간 변경 |
| 대비 슬라이더 | 슬라이더 조작 | 프리뷰 대비 실시간 변경 |
| 화이트 밸런스(A1) | 온도/색조 슬라이더 | 색온도 실시간 변경 |
| 바이브런스/채도(A2) | 색상 섹션 슬라이더 | 채도 실시간 변경 |
| HSL 패널(A3) | 색조 선택 섹션 → 색상별 슬라이더 | 특정 색상 범위만 선택적 변경 |
| 색 보정(B1) | 색 보정 섹션 → 존별 색조/채도 | 섀도/미드/하이라이트 색 오버레이 |
| 선명도(C1) | 선명도 섹션 슬라이더 | 엣지 선명도 변경 |
| 노이즈 제거(C2) | 노이즈 제거 섹션 | 노이즈 감소 |
| 전/후 비교(D1) | "◧ 전/후 비교" 버튼 → 드래그 | 분리선 이동으로 원본/보정 비교 |
| 클리핑 경고(D2) | "◈ 클리핑 확인" 버튼 | 과노출=빨강, 언더=파랑 오버레이 |
| 프리셋 저장(D3) | 프리셋 섹션 → "+ 저장" | 최대 20개 저장, 더블클릭 이름 수정 |
| 프리셋 내보내기 | 내보내기 버튼 | happiness-presets.json 다운로드 |
| 프리셋 불러오기 | 불러오기 → JSON 선택 | 기존 프리셋에 병합 |
| 내장 스타일 | 기본 스타일 프리셋 펼치기 | 8종 원클릭 적용 |
| 곡선 — 제어점 추가 | 캔버스 클릭 | 새 제어점 추가됨 |
| 곡선 — 제어점 이동 | 제어점 드래그 | 커브 모양 변경됨 |
| 전체 초기화 | 보정 후 "전체 초기화" 클릭 | 모든 값 기본값으로 리셋 |
| 등록하기 | 보정 후 폼 제출 | 보정된 이미지로 업로드 성공 |

#### 보정 엔진 아키텍처 (useImageAdjustments.js)

```
파이프라인 순서 (applyEffects):
  1. buildChannelLUTs  — exposure/contrast/whites/blacks/shadows/highlights + 온도/색조(A1)
  2. renderWithChannelLUTs — LUT 적용 (픽셀 루프)
  3. applyVibranceSaturation — 바이브런스/채도(A2), 픽셀별 HSL 변환
  4. applyCalibration (NEW) — 카메라 보정(C1), RGB 원색 색조/채도 조정 (Gaussian-코사인 가중치)
  5. applyHSLAdjustments — HSL 패널(A3), 8색상 가우시안-코사인 가중치
  6. applyColorGrading — 색 보정(B1), 존별 HSV 컬러 오버레이 + balance(NEW) 섀도/하이라이트 영역 확장
  7. applySharpening — 선명도(C1), 언샵마스크 + 엣지 마스킹
  8. applyNoiseReduction — 노이즈 제거(C2), 크로마 블러 + 루마 블러
  9. applyUnsharpMask(texture/clarity) + applyDehaze + applyVignette + applyGrain
```

새 exports:
- `DEFAULT_HSL_ADJUSTMENTS` — 8색상 { hue, saturation, luminance }
- `DEFAULT_COLOR_GRADING` — shadows/midtones/highlights { hue, saturation } + blending + **balance** (NEW, -100~+100)
- `DEFAULT_SHARPENING` — { amount, radius, detail }
- `DEFAULT_NOISE_REDUCTION` — { luminance, color }
- `DEFAULT_CALIBRATION` (NEW) — { red, green, blue } each { hue: 0, saturation: 0 }
- `applyCalibration(canvas, calibration)` (NEW) — RGB 원색 보정
- `applyHSLAdjustments(canvas, hslAdj)`
- `applyColorGrading(canvas, colorGrading)`
- `applySharpening(canvas, sharpening)`
- `applyNoiseReduction(canvas, noiseReduction)`
- `renderClippingOverlay(overlayCanvas, processedCanvas, threshold)` — 클리핑 경고 오버레이
- `DEFAULT_EFFECTS` — vibrance, saturation 추가됨
- `DEFAULT_ADJUSTMENTS` — temperature, tint 추가됨

ImageAdjustmentPanel: 모든 섹션을 아코디언으로, 변경 있을 때 ● 뱃지 표시. **카메라 보정 섹션**(NEW): 빨강/초록/파랑 원색 탭 + 색조/채도 슬라이더
PresetManager: MAX 5→20, 내보내기/불러오기(JSON), **XMP 내보내기**(NEW, Lightroom 호환 .xmp 파일), 내장 스타일 9종 (Fuji Velvia, Kodak Portra, Matte Fade, B&W Dramatic, Golden Hour, Cool Cinematic, Pastel Dream, Vibrant Pop, **Y2K 필름 스냅** NEW)

### Java 25 연결 확인

```bash
cd backend
java -version           # openjdk 25.x.x 확인
./gradlew -version      # Gradle 9.5.0 확인
./gradlew clean build -x test  # BUILD SUCCESSFUL (Java 25 툴체인으로 컴파일)
```

`build.gradle`의 툴체인 설정:
```groovy
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}
```

---

## 보안 체크리스트

- `.env.local` / 시크릿 파일 절대 커밋 금지
- `SUPABASE_SERVICE_ROLE_KEY`는 백엔드 서버만 사용 (프론트/모바일 노출 금지)
- `JWT_SECRET`은 최소 256비트 (`openssl rand -base64 64`)
- CORS `allowed-origins`에 와일드카드(`*`) 금지 — 정확한 도메인만 나열
- 파일 업로드: MIME 타입 + 크기 검증 필수 (`SupabaseStorageService.validateFile`)
- 운영 DB `ddl-auto: validate` 고정 (절대 `create`/`create-drop` 금지)
- Rate Limiting: Bucket4j IP 기준 100req/60s (`ApiAccessInterceptor`)
