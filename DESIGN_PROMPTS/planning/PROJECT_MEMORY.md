# PROJECT MEMORY — Happiness 한 장 요약 (2026-10-22 기준)

> 새 세션은 이 문서를 먼저 읽고, 세부는 `CLAUDE.md`(약 2000줄)에서 해당 절만 찾아 본다.
> 클라우드 컨테이너는 매번 새로 만들어지므로 **저장소에 커밋된 문서만 다음 세션에 남는다** — 이 파일이 그 "메모리"다.
> 내용이 바뀌는 작업을 끝내면 이 파일의 해당 줄도 같이 고친다(길게 쓰지 말고 한 줄씩).

## 1. 제품
- **사진작가 포트폴리오 + 업무 앱.** "보여주기(포트폴리오·작업 노트) → 일 받기(문의·예약) → 일 처리하기(일정·약속·납품·수금)".
- 운영 주소: 웹 `https://happiness.io.kr`(Vercel), API `https://api.happiness.io.kr`(Railway). 별도 저장소 **happiness-admin**(운영자용)과 DB를 공유한다.
- 포트폴리오: 템플릿 4종 + **직접 구성(BLOCKS)** — 새 블록은 서버 `PortfolioLayoutValidator.BLOCK_PROPS` + 웹 `blocks/blockRegistry.js` 두 곳에 추가.
- **SNAPDAY 출사(모임 안, 새 API·`apps/web`만 — 컷오버 후 운영)**: 월간 출사 투표(`/gatherings/polls`)→확정→모임, AI 계절 추천, 출사 시작/종료, 스토리 편집기, 베스트 포토. 문서 `planning/snapday/`.
- 웹 메뉴 4개: **둘러보기**(`/explore`, 공개 — 사진|작업|스팟 탭) · **내 작업**(`/series`) · **업무**(`/workspace` 허브 + 문의·예약·일정·약속·납품 탭) · **모임**(`/gatherings`) + "＋ 올리기"(`/photo/new` = 이미지 에디터).
- 모바일(Expo) 탭: 탐색 · 갤러리(내 사진) · 등록 · 피드 · 프로필(나머지 기능은 프로필 메뉴에서 진입).

## 2. 스택·구조
| 영역 | 기술 | 위치 |
|---|---|---|
| 백엔드 | Spring Boot 3.4.5, Java 21 빌드, JPA+JPQL, feature 패키지 | `backend/src/main/java/com/happiness/app/<feature>/` |
| 백엔드(전환 중) | **NestJS 12 + Prisma 7 (TypeScript)** — Spring 경로 전부 옮김(프록시는 컷오버 전 안전망), 배치는 `BATCH_ENABLED`·`scripts/run-batch.mjs`. 어드민은 별도 진입점 `dist/admin-main.js`(8091, 스키마 `admin`) | `apps/api/` (`PLANNING_typescript-migration.md`) |
| 어드민 웹(전환 중) | Next.js 16 + TS(happiness-admin CRA 이관, webpack 빌드) | `apps/admin/` |
| 웹 | React 18 CRA, React Router v6, **inline style만**, Context(Redux 없음) | `frontend/src/` |
| 모바일 | React Native 0.88 + **Expo SDK 58**(작업 브랜치, 실기기 확인 전 — master는 SDK 49) + React Navigation 7, 전 파일 TS | `mobile/` (실제 네비게이터는 `src/navigation/AppNavigator.tsx`) |
| DB | dev H2(create-drop) / prod Supabase PostgreSQL(**ddl-auto: update**, 풀러 때문에 `prepareThreshold: 0`) | |
| 기타 | Supabase Storage, Upstash Redis(장애 시 통과), Firebase Analytics(웹, `utils/analytics.js`, env 없으면 꺼짐), Gemini 챗봇, 읽기 전용 MCP 서버(`mcp-server/`) | |

## 3. 검증 명령 (이것만 쓴다)
- 백엔드: `cd backend && ./gradlew clean build -x test` + `./gradlew test` → 결과는 `build/test-results/test/*.xml`의 `tests= failures=`로 확인 (현재 **62개** 통과: `CoreFlowIntegrationTest` 55 + `ClientIpTest` 3 + `InquiryEmailServiceTest` 2 + `JwtTokenProviderTest` 2).
- TS API: `cd apps/api && npm run build` + 계약 테스트 `API_BASE_URL=http://localhost:8080|8090 npm run test:contract`(두 서버 모두 통과해야 단계 완료, 로컬 PG·Redis·Spring 필요 — `apps/api/README.md`). 어드민: `ADMIN_API_BASE_URL=http://localhost:8081|8091 npm run test:contract-admin`(Spring 어드민 띄우는 법은 README "어드민 진입점"). 어드민 웹: `cd apps/admin && npm run typecheck && npm test && npm run build`.
- 웹: `cd frontend && CI=true npm run build` → "Compiled successfully." (새 화면은 `App.jsx`에 `lazyPage()`로 등록)
- 모바일: `cd mobile && npx expo export --platform web` → "Finished saving JS Bundles"(SDK 58부터는 "Exported:"). 의존성 맞추기는 Expo API가 막혀 있어 `EXPO_OFFLINE=1 npx expo install --fix -- --legacy-peer-deps`. 로그인 후 화면은 `--dev` 번들 + 로컬 bootRun으로 확인 가능(`secureStorage.web.js`).
- 로컬 서버 종료는 포트로: `fuser -k 8080/tcp 3000/tcp` (`pkill -f`는 내 셸까지 죽인다).
- 클라우드 세션은 egress 정책상 `*.happiness.io.kr`·`*.vercel.app`에 못 붙는다 → 운영 상태는 `gh api repos/jtyang0227/happiness-app/commits/<sha>/statuses`·`/deployments`로만 본다.

## 3-1. 개발 환경 (새 컨테이너에서 다시 만들기)
- 클라우드 컨테이너: Node 22, Java 21(Gradle 9.5 wrapper), PostgreSQL 16(`pg_ctlcluster 16 main`), redis-server, Chromium+Playwright 기본 설치.
- **TS 전환 로컬 환경 한 번에**: `apps/api/scripts/dev-env.sh up > /tmp/happiness-dev/up.log 2>&1` → PG 역할·DB `happy/happy@localhost:5432/happiness`,
  Redis 6379, Spring 8080(같은 PG, `ddl-auto=update`로 스키마 생성), Nest 8090(`LEGACY_API_URL=http://localhost:8080`). `status`·`down` 지원, 로그 `/tmp/happiness-dev/*.log`.
  파이프(`| tail`)로 받으면 백그라운드 서버가 파이프를 잡아 명령이 안 끝난다 → 파일로 받을 것.
- `apps/api/.env`(커밋 금지)는 스크립트가 `.env.example`에서 로컬 DB 주소로 만든다. `JWT_SECRET`은 비워 두면 Spring과 같은 개발 기본값.
- 계약 테스트의 준비용 DB 조작(`test/contract/db.ts`)은 `DATABASE_URL`(기본 로컬 PG)을 쓴다.
- 외부 사이트(`*.happiness.io.kr`, 카카오·구글·네이버 API 등)는 egress 정책으로 막혀 있다 — OAuth 성공 경로는 로컬에서 확인 불가.
- **토큰 만료 후 재개**: `DESIGN_PROMPTS/planning/PROMPT_resume.md`("WORK_QUEUE 이어서 진행해줘. PROMPT_resume.md 절차대로.").

## 4. 작업 방식 (사용자 고정 규칙)
- 브랜치 `claude/photo-sorting-algorithm-mv383n`에서 작업 → push → `git push origin <branch>:master`(fast-forward, 강제 push 금지). PR은 요청 시에만.
- 커밋 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` + `Claude-Session:` 줄. 커밋·코드에 모델 ID 쓰지 않음.
- 여러 단계 작업은 `DESIGN_PROMPTS/planning/WORK_QUEUE.md`에 먼저 적고 항목마다 커밋. 새 세션은 큐 → `git log` 대조 → 재개.
- UI 작업은 `DESIGN_PROMPTS/design/DESIGN_PROMPT_<feature>.md` 먼저, 기획은 `DESIGN_PROMPTS/planning/`. 메시지에 "기획"이 있으면 `/loop`.
- 끝나면 CLAUDE.md 반영 + 빌드/테스트 + 커밋·push, 보고는 한국어로 "변경 / 검증 / 주의" 순서.
- 사용자가 채팅에 비밀번호를 적은 적이 있다 — **저장·재사용 금지.**

## 5. 디자인 규칙
- **Toss 디자인 시스템**: 브랜드 컬러 `#3182F6` 하나, 배경 `#F2F4F6`, 카드 흰색, 플랫(블러·그라디언트·컬러 그림자 금지, 회색 그림자만). 토큰은 `constants/colors.js`(웹·모바일).
- 예외: 이미지 뷰어·에디터는 중립 다크(`#111417`/`#1A1E22`), 풀블리드 사진 위 컨트롤만 glass 허용(슬라이드쇼·PhotoViewer).
- 아이콘은 이모지/유니코드, 외부 UI 라이브러리 추가 금지. 공통 `Button`·`Input/FormField`, 스켈레톤 + 빈 상태 필수, WCAG AA(`successText` #007A45처럼 대비 맞춘 토큰).

## 6. 반복해서 터진 함정 (먼저 의심할 것)
1. **응답 래퍼가 컨트롤러마다 다르다** — 대부분 `ApiResponse{success,code,message,data}` → 프론트는 `res.data.data`, `/api/photos`·`PhotoController`는 `{status,data}`. 언래핑 실수로 "항상 비어 있음"이 여러 번 났다.
2. **4xx가 500으로 바뀜** — 예외 핸들러 누락. `GlobalExceptionHandler`가 `ResponseStatusException`·`IllegalArgumentException`을 처리하니 서비스에서는 이 둘을 던진다.
3. **요청의 `memberId`를 믿는 IDOR** — 쓰기 API는 `SecurityUtil.getCurrentMemberId()` 기준, 본인/관리자 확인(`isSelfOrAdmin`). 2026-10-22 점검으로 팔로우·피드·태그·공유·AI 태그·납품 승인까지 정리.
4. **존재하지 않는 API 경로 호출**, **Jackson `isXxx` 필드명**(`isActive` → JSON `active`), 정규화(소문자·trim) 전 비교, 프론트·서버 검증 규칙 불일치.
5. 웹 access token은 메모리에만 → 새로고침 직후 공개 GET에는 토큰이 없어 "…ByMe" 값이 항상 false(인증 경로로 따로 조회).
6. hover에 `transform`을 쓰는 카드에 등장 애니메이션을 같은 요소에 주면 hover가 죽는다 → wrapper/inner 분리.
7. **공개·인증 요청의 401을 토큰 만료로 처리하면** apiClient가 `logout()`→`/login` 새로고침을 돌려 오류 문구가 사라진다(틀린 비밀번호가 "아무 반응 없음"으로 보였던 원인). 인증 요청은 인터셉터 예외 목록에 둔다.
8. 모바일 네이티브 전용 모듈은 `*.web.js` 스텁으로 웹 번들에서 뺀다(metro 커스텀 리졸버는 동작 안 함). 서버 주소는 `mobile/constants/config.js` 한 곳.
9. **Spring `XssProtectionFilter`가 쿼리·폼 파라미터·헤더를 HTML 이스케이프**한다(JSON 본문 제외) — `&`·`"` 같은 문자가 든 검색어는 `&amp;`로 비교된다. TS 전환에서도 같은 표로 재현(`apps/api/src/common/escape-html4.ts`).

## 7. 운영·배포 현황
- Vercel: GitHub 앱 연동으로 master push마다 Production — 정상.
- Railway: GitHub 앱 연동, `backend/` 변경 시에만 배포. **2026-10-20 13:49(256718e) 이후 배포가 멈춰 있음(⏸ 사용자 대시보드 확인 필요)** — 그 뒤 백엔드 수정(비슷한 사진, 보드 공유, 계정 찾기, 개인정보, 신고·차단, 보안 점검)은 운영 API에 미반영. 재배포 관례: `backend/railway.toml`의 `# redeploy-trigger-N` 숫자 올리기.
- GitHub Actions: 백엔드는 `deploy-backend`가 테스트 통과 후 `backend/` 변경 시 `railway up --ci` + health 확인(2026-10-28). **Secret `RAILWAY_TOKEN` 없으면 건너뜀** — 등록 필요. 수동 배포는 Actions › CI/CD — Deploy › Run workflow.
- **무료 전환 준비됨(11-06)**: 웹 Cloudflare Pages(`deploy-frontend-cloudflare`, Secrets `CLOUDFLARE_API_TOKEN`·`CLOUDFLARE_ACCOUNT_ID`), API Render Free(`render.yaml`), `keepalive.yml`(Variable `KEEPALIVE_URL`). 순서·되돌리기는 `planning/PLANNING_free-hosting.md`.
- 운영 DB 새 컬럼·테이블 SQL은 CLAUDE.md "운영 DB 수동 마이그레이션" 블록에 `IF NOT EXISTS`로 기록(ddl-auto update라 대개 자동 반영되지만 기록은 유지).

## 8. 사용자에게 남은 일 (코드로 못 하는 것)
- **SNAPDAY 외부 키**: 새 API 서버에 `GEMINI_API_KEY`(AI 실제 추천)·`HOLIDAY_API_KEY`(공공데이터포털 특일 정보) — 없으면 샘플·수동 공휴일 등록.
- **TS 전환 컷오버(11b)**: **먼저 운영 DB에 SNAPDAY 표 추가 + Prisma 기준선 기록**(`apps/api/scripts/prisma-baseline.sh app check→apply→resolve`, 어드민도 — B-1 "먼저"). 그다음 `DESIGN_PROMPTS/planning/PROMPT_ts-cutover.md` "B 상세" 순서대로(새 서비스 2개 → 어드민 API → 도메인 → Spring 중지+배치 → 웹 `WEB_APP_DIR` → 어드민 웹 → master 병합 승인). 각 단계 뒤 Actions › Smoke. 끝나면 "B 끝났어" → Claude가 C(정리).
- **어드민 이관 결정(TS 전환 11단계 전)**: 운영 Spring 어드민의 `DB_SCHEMA`(기본 `admin` — 앱 데이터가 아니라 자기 스키마만 봄)를 그대로 둘지 앱 데이터와 합칠지, happiness-admin 저장소를 README만 남기고 보관할지. 운영 어드민은 7월 master(c35e964)라 새 어드민 API 전에 `apps/api/prisma/admin/upgrade/2026-11-25_july-to-november.sql` 실행(lazy-init 500은 운영에 없는 11월 브랜치 버그).
- **Supabase 잠금**: `apps/api/db/supabase-lockdown.sql`을 SQL Editor에서 실행(공개 anon 키로 테이블 직접 접근 차단). happiness-admin이 REST(anon 키)로 DB를 읽는지 먼저 확인.
- 무료 전환: Render Blueprint 연결·값 입력 → `KEEPALIVE_URL` → `api` DNS 전환·Railway 중지 → Cloudflare 토큰 2개 등록 → 웹 도메인 전환·Vercel 해제(`PLANNING_free-hosting.md`).
- Firebase: 웹 앱 만들고 Vercel에 `REACT_APP_FIREBASE_*` 5개 → 재배포, GA4 향상된 측정의 "브라우저 기록 기반 페이지 변경" 끄기.
- GitHub Secret `RAILWAY_TOKEN`(Railway 프로젝트 토큰) 등록 → 백엔드 자동 배포 개통, 서비스 이름이 happiness-app이 아니면 Variable `RAILWAY_SERVICE`.
- Railway: `JWT_SECRET` 설정 확인(없으면 재시작마다 로그인 풀림), 멈춘 배포 원인 확인 후 재배포, 메일(`MAIL_*`)·`FRONTEND_URL`.
- 앱 스토어: Expo SDK 49 → 58 업그레이드(Play targetSdk 35·최신 Xcode — 계획 `PLANNING_expo-sdk-upgrade.md`, EAS 빌드·실기기 확인은 사용자), 심사용 데모 계정, 개인정보처리방침 공개 URL, App Privacy/데이터 안전 항목, `support@happiness.io.kr` 수신 확인.

## 9. 최근 큰 작업 (최신순, 자세한 건 커밋·문서)
| 날짜 | 커밋 | 내용 | 문서 |
|---|---|---|---|
| 11-25 | (이번 커밋) | TS 전환 보안 누락 점검 — 전역 속도 제한·IP 차단·스캐너 차단·보안 헤더를 새 API에 보완(나머지는 이미 패리티). 계약 `security.test.ts` Spring·새 API 양쪽 | `PROMPT_ts-security-parity.md` |
| 11-25 | 5ee568d~5ad112b | SNAPDAY 출사 기능 병합 — 월간 투표·공휴일·확정→모임·AI 추천(Gemini/샘플)·현장 모드·스토리 편집기·베스트 포토·출사 기록. 계약 새 API 95(SNAPDAY 4), Playwright 전 흐름 | `planning/snapday/TODO.md` |
| 11-25 | beb5742 | 새 API·웹 알려진 갭 — 시리즈 사진 작성자 정보, 웹 새로고침 후 access token 복구("…ByMe" false 경합, 느린 망 재현으로 전후 확인). 커버 N+1은 새 API에 이미 없음 | WORK_QUEUE "새 API·웹 알려진 갭" |
| 11-25 | c8dad10 | Expo SDK 49 → 58 1~3단계(RN 0.88·React 19·React Navigation 7, 업로드 MIME 버그 수정) — 웹·Android export, 웹 번들 화면 오류 0. EAS 빌드·실기기는 사용자, master 미반영 | `PLANNING_expo-sdk-upgrade.md` |
| 11-25 | 5fa7d08 | 운영 어드민이 7월 버전(표 19개)임을 확인 → 새 어드민 API용 스키마 업그레이드 SQL(추가만·멱등, 7월 스키마+행에 적용해 계약 47개 통과) | `apps/api/prisma/admin/upgrade/`, `PROMPT_ts-cutover.md` B-2 |
| 11-24 | dcdc2fd | Spring 스팟 목록·작업 탐색 PostgreSQL 500 수정(`CAST(:x AS String)`) — 11-24 병합으로 운영에 나간 스팟 기능의 실사용 버그. 로컬 재현은 `dev-env.sh`의 PG 환경으로(그냥 bootRun은 H2) | `apps/api/README.md` |
| 11-24 | b2c07c0 | TS 전환 11a 컷오버 준비 — render.yaml 새 서비스 2개, 웹 전환 스위치 `WEB_APP_DIR`, `apps/web/vercel.json`, 스모크(`scripts/smoke.mjs`·Actions Smoke). 발견·수정: `dotenv` devDependency라 운영 설치에서 API 시작 실패. 발견: Spring 작업 탐색 PG 500 | `PROMPT_ts-cutover.md` |
| 11-24 | f44dd80~d3303d2 | TS 전환 9단계 — 어드민 이관(API 115경로 `src/admin`, 계약 48개 Spring 어드민·Nest 양쪽, 웹 `apps/admin` CRA와 62장 동일). 발견: 어드민은 별도 스키마 `admin`, Spring 어드민 prod 로그인 500(lazy-init) | `apps/api/README.md` 어드민 진입점, PLANNING 4-1·5-1 |
| 11-24 | b85ca30 | TypeScript 전환 1~7단계 — `apps/api`(NestJS+Prisma)가 Spring 194개 경로 전부 + 배치 4개, 계약 테스트 92개(Spring·Nest·프록시 없는 Nest 모두 통과). 발견: Spring 스팟 목록 PG 500. Photoshop·Lightroom MCP 연결 | `planning/PLANNING_typescript-migration.md`, `PROMPT_ts-app-admin-adobe-mcp.md`, `docs/ADOBE_MCP.md` |
| 11-23 | 2cca51e~ | 출사 스팟(지도·목록·상세·사진 연결·중복 제안) + 모임 강화(스팟·초보 환영·인물 동의·장소 투표·피드백 요청) | `planning/ANALYSIS_chulsa-app-public-features.md` |
| 11-13 | 9820fbe·e99a6bc | 스킬 기반 점검 — 문의 메일 이스케이프·`ClientIp`, Supabase 잠금 SQL, 웹 화면별 코드 분할(268→120kB), 모바일 피드 버그 | CLAUDE.md "스킬 기반 점검" 절 |
| 11-12 | d5a6ebc | 공식 플러그인 4개(hookify·commit-commands·ralph-loop·claude-code-setup) + 가드 규칙 5개 + 편집 훅 교체 | CLAUDE.md "플러그인·가드 규칙" 절 |
| 11-12 | 9f0cd12 | Claude Code 스킬 11개 추가(React·RN·Expo 업그레이드/스토어·Supabase/Postgres·Spring Boot·보안·접근성·웹 테스트) | CLAUDE.md "외부 스킬" 절 |
| 11-06 | 6b957c2 | 무료 호스팅 전환 준비 — Cloudflare Pages 배포 job, Render Free Blueprint, keepalive | `planning/PLANNING_free-hosting.md` |
| 11-04 | 9220c3c | Firebase Analytics(웹 page_view + 가입·로그인·문의·예약·업로드, 토큰 경로 가림) | CLAUDE.md Frontend 절 |
| 10-22 | ce63791 | 모바일 웹 하단 탭 2차 — 다크 알약·활성 캡슐·프로필 사진·알약 밖 ＋ 원(Cosmos·Instagram 참고) | `design/DESIGN_PROMPT_bottom-nav-icons.md` |
| 10-22 | 2dc0f60 | 포트폴리오 "직접 구성" 블록 빌더(`/portfolio-builder`, 블록 12종, 서버 검증) | `planning/PLANNING_portfolio-blocks.md` |
| 10-22 | 8dfe427 | 보안 점검 8건(JWT 기본값, 납품 비밀번호, 팔로우·피드·태그·공유·AI 태그 IDOR) | `planning/SECURITY_AUDIT_2026-10-22.md` |
| 10-21 | 0131220 | 웹 화면 깨짐·위치 정리(390/1280 가로 넘침 0) | `design/DESIGN_PROMPT_web-layout-polish.md` |
| 10-21 | f389434 | 모바일 UI/UX 정리(흰 헤더·노치·대비·진입점) | `design/DESIGN_PROMPT_mobile-ux-polish.md` |
| 10-21 | cfc8689 | 앱 심사 대응(서버 주소, 탈퇴, 신고·차단, 권한, 아이콘) | `planning/PLANNING_app-store-review.md` |
| 10-21 | ff0277e·8cd7991 | 개인정보 보호(연락처 제거·마스킹·로그인 잠금), 메뉴명 "둘러보기" | `planning/PLANNING_privacy-protection-app.md` |
| 10-21 | c177cff | 아이디·비밀번호 찾기(웹·모바일·서버) | `planning/PLANNING_account-recovery.md` |
| 10-20 | — | 메뉴 4개 통합, 작업 노트·작업 탐색·감상·초안·크레딧·에디터 추천, 무드보드·공유, 비슷한 사진, 캐러셀 내보내기 | `planning/WORK_QUEUE.md`, `PLANNING_nav-consolidation.md` 등 |

## 10. 알려진 갭 (손대지 않은 것)
- 모바일 미구현: 출사 스팟 탐색·상세·사진 연결(모임 상세의 투표·배지만), 보드 목록·공유, 크레딧 편집, 추천사 연결, 모임 생성·관리, 웹 "미수금" 탭, AI 챗봇. 웹에는 차단 UI 없음.
- (Spring·운영) rate limit·로그인 잠금 인메모리 — 새 API는 2026-11-25 기능별 제한·로그인 잠금을 Redis 공유로(`shared-limit.service.ts`), 전역 IP 제한·조회 기록 제한만 인메모리(Upstash 명령 한도). access token은 비밀번호 변경 후에도 30분 유효.
- (Spring·운영 `frontend/`만) `SeriesController` 사진 목록에 작성자 정보 미첨부, 시리즈 커버 조회 N+1, 새로고침 후 "…ByMe" false — 새 API·`apps/web`에선 2026-11-25 해소(컷오버로 사라짐). `AdminTagsPage`는 mock.
