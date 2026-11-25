# WORK_QUEUE — 이어서 할 작업 목록

> 이 파일은 **세션이 끊겨도(토큰 소진·컨테이너 재시작) 다음 세션이 그대로 이어받기 위한 단일 진실 공급원**이다.
> 규칙은 `CLAUDE.md` "작업 이어하기 규칙" 참고. 새 세션은 이 파일 → `git log --oneline -10` 순으로 읽고 🔄 항목부터 재개한다.
>
> 상태: ⏳ 대기 · 🔄 진행 중 · ✅ 완료 · ⏸ 보류(사유 필수)

## 현재 묶음 — TypeScript 전면 전환 (요청: "스프링부트·리액트 안 써도 되니 최근 제일 많이 쓰는 언어로 전체 변경", 2026-11-24)

계획: `PLANNING_typescript-migration.md` (사용자 선택: TypeScript 통일 + 단계별 전환). 각 단계는 계약 테스트가 Spring·Nest 양쪽에서 통과해야 ✅.

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | ✅ | 기반 — `apps/api` Nest 뼈대·Prisma 스키마(db pull)·응답/오류 형식·JWT 호환·가드·레거시 프록시·계약 테스트 하네스 | NestJS 12(ESM 전용 → `type: module`)·Prisma 7.10.1(최신 태그가 RC라 제외)·TS 6.0.3·vitest 3.2.7(4.x는 npm 설치 오류). 로컬: PG16 + Redis 7 + Spring(같은 PG) |
| 2 | ✅ | 인증·회원·계정 찾기 `/api/auth/**` | b85b7cf + (이번 커밋) — 프로필·비밀번호·통계·관리자 목록(마스킹)·검색·권한, 계정 찾기 4개(nodemailer), OAuth 4개. 계약 26개 Spring·Nest 둘 다 통과 + 서버 간 호환. **발견**: Spring XSS 필터가 쿼리·폼·헤더를 HTML 이스케이프(그대로 옮김), `@PreAuthorize` 거부가 500(Nest는 403 유지). 탈퇴(DELETE member)는 7단계 |
| 3 | ✅ | 사진·댓글·팔로우·피드·업로드·신고·차단 | ae387a7·9ee96c2·377bb73·c754f73·b521cdc·3c540fc·2c68d44 + (이번 커밋 — 사진 삭제·AI 태그). 계약 51개 양쪽 통과 + 서버 간 호환. **발견**: Spring WebP 사진 업로드 항상 실패(ImageIO 리더 없음, Nest는 처리), 저장소 키 `%2F` 인코딩, 사진 삭제 시 댓글·신고 남음(기록만). 로컬 가짜 Supabase `scripts/fake-supabase.mjs` |
| 4 | ✅ | 시리즈·포트폴리오·무드보드·탐색·비슷한 사진 | 비슷한 사진(3단계)·무드보드·시리즈 전체·포트폴리오(블록 검증기) — 계약 65개 양쪽 통과. dc9e1b4 |
| 5 | ✅ | 업무 — 문의·예약·납품·약속·분석 | 계약 78개 양쪽 통과(교차 1개는 OTHER 지정 시). 커밋 4b19011·3195dfe·b923b23·99fee6c·a102a2d |
| 6 | ✅ | 모임·스팟·알림·배치 | 모임 CRUD·참여·알림·장소 투표·피드·앨범·Instagram·스팟 + 배치 4개(run-batch.mjs로 확인), 계약 85개 양쪽. 커밋 78de64b·01e8c02·d61c6ae·3e7a67a. 발견: Spring 스팟 목록 PG 500(README) |
| 7 | ✅ | 추천사·언론·패키지·브랜드·뉴스레터·AI 어시스턴트 + 회원 탈퇴 | Spring 경로 0개(정적 대조 194/194), 프록시 끈 Nest에서 계약 92개 전부 통과·Spring 92개 통과. 커밋 2a32d07·b85ca30 |
| 8 | ✅ | 웹 → TypeScript → Next.js | 8a 40737e8 Next.js 셸 · 8b 3f1bb3f 전 파일 TS(tsc 0·vitest 13·빌드, CRA와 화면 46장 동일) · 8c 241d730 CI(api-ci·web-ci) + 컷오버 체크리스트(PLANNING 5-1). 운영 배포 전환은 11번 |
| 9 | ✅ | 어드민 이관 (happiness-admin → `apps/api` 어드민 진입점 + `apps/admin`) | 설계·충돌 표: PLANNING 4-1. **발견**: 어드민은 별도 스키마 `admin`(DB_SCHEMA) — 앱 테이블을 안 봄, 1:1로 옮기고 합칠지는 사용자 확인(11번). 하위 9a~9f |
| 9a | ✅ | 기반 — 어드민 Spring을 로컬 PG(`admin` 스키마)로 기동, 어드민 Prisma 스키마 pull, `admin-main.ts` 진입점(오류 `{error}`·JWT·DB 재검증 가드·로그인 잠금), 로그인·hello, 계약 하네스 | `prisma/admin/schema.prisma`(37표)·`prisma.admin.config.ts`, `src/admin/**`, `test/contract-admin`(`npm run test:contract-admin`, ADMIN_API_BASE_URL) 13개 양쪽 통과 + 서버 간 토큰. **발견**: Spring 어드민 prod 프로필 `lazy-initialization=true`라 `FieldEncryptor`가 생성되지 않아 회원을 읽는 모든 요청(로그인 포함)이 500 — 로컬 Spring은 `SPRING_MAIN_LAZY_INITIALIZATION=false`로 띄움, Nest는 해당 없음. 공개 팝업은 9c |
| 9b | ✅ | 회원(목록·상세·요약·역할·정지·삭제·메모·이력·원문 열람·내보내기) + 개인정보 접속기록·보안 감사(암호화 `PRIVACY_ENCRYPTION_KEY`) | 계약 26개 양쪽 통과. AES-256-GCM(`enc:v1:`) 서로 읽힘, 접속기록 해시 체인은 마이크로초까지 글자로 읽어 계산 — 두 서버 기록 60행 섞여도 양쪽 verify 유효. 정지 자동 해제 스케줄러(`ADMIN_BATCH_ENABLED`) |
| 9c | ✅ | 콘텐츠 — 사진·시리즈·포트폴리오·카테고리·정렬·댓글·프로필 콘텐츠·추천·배너·팝업·공지 | 계약 누적 37개 양쪽 통과(+공개 `/api/popups/active`). **발견**: 배너·팝업·공지 요청 DTO가 Lombok `isActive`/`isPinned`라 JSON 키가 `active`/`pinned` — 어드민 프론트가 보내는 `isActive`·`isPinned`는 무시돼 항상 비활성·고정 안 됨으로 저장되고, 응답도 `active`/`pinned`라 화면의 `b.isActive`가 늘 undefined(그대로 옮김). 피처드 등록자 id는 이메일을 Long으로 읽다 실패해 항상 null |
| 9d | ✅ | 업무·운영 — 문의·예약·거래·모임·뉴스레터·인증·신고(+AI 분류)·통계·시스템·콘텐츠 정책 | 계약 누적 48개 양쪽 통과, Spring 어드민 경로 115개 정적 대조 누락 0. AI 분류는 공식 SDK(`@anthropic-ai/sdk`)로 Spring과 같은 요청(claude-opus-5·500·thinking off·effort low). **발견**: Spring 예약 목록 `date` 필터가 PostgreSQL에서 500(`:date IS NULL` 형식 미정, 스팟 목록과 같은 유형 — Nest는 정상, `IS_SPRING`으로 구분) |
| 9e | ✅ | 웹 `apps/admin`(Next.js TS, Cosmos×Pinterest CSS 변수 유지) — CRA와 화면 비교 | 9e-a c72c77e Next 셸(CSS는 CRA 순서로 `_app`, webpack 빌드 — Turbopack 인라인 스크립트가 CSP 위반). 9e-b(이번 커밋) 전 파일 `.ts/.tsx`(55개), tsc 0, vitest 10, CRA와 62장 픽셀 동일(1장은 안티앨리어싱 4×2px — 재촬영 시 동일) |
| 9f | ✅ | 문서·CI·happiness-admin 저장소 처리 질문(README만 남길지 — 사용자 결정) | CI `admin-web-ci`(typecheck·test·build) 추가, api-ci는 두 Prisma 클라이언트 생성(깨끗한 체크아웃에서 확인). README "어드민 진입점", PLANNING 5-1 어드민 컷오버, CLAUDE.md·PROJECT_MEMORY. 저장소 처리·스키마 합치기는 11번에서 사용자 확인 |
| 10 | ✅ | 모바일 TypeScript | 전 파일 .ts/.tsx(73개, babel.config.js만 JS), TypeScript ~5.1(Expo 49 권장), tsc 0. expo export web·android 통과, 안드로이드 번들 크기 같음·.web.ts 스텁은 웹에만, 웹 번들 화면 3개 픽셀 동일. 커밋 190a06c |
| 11 | 🔄 | 컷오버(배포 전환·Spring 종료) | 운영 배포·DNS 변경 — 사용자 확인 후. 어드민도 포함: 운영 `DB_SCHEMA` 확인·앱 데이터와 합칠지, happiness-admin 저장소를 README만 남길지(PLANNING 5-1) |
| 11a | ✅ | 컷오버 A — 저장소 준비: render.yaml 새 서비스 2개, 웹 전환 스위치(`WEB_APP_DIR`), 스모크 스크립트·워크플로, 문서 | `render.yaml` happiness-api-ts·happiness-admin-api(빌드 `npm ci --include=dev`), deploy.yml `WEB_APP_DIR`(기본 frontend — 지금과 동일), `apps/web/vercel.json`(SPA 폴백 — 없으면 Vercel에서 깊은 링크 404), `_headers` `/_next/static/*`, 남은 CRA `public/index.html` 삭제, `scripts/smoke.mjs`·`smoke.yml`. **발견·수정**: `dotenv`가 devDependency라 운영 설치(`--omit=dev`)에서 API가 시작조차 못 함 → dependencies로(재현·확인). **발견**: Spring 작업 탐색 `location` 없으면 PG 500(`lower(bytea)`, 스모크가 잡음 — Nest 정상). 확인: 앱 계약 91·어드민 47 양쪽, 스모크 Nest 4대 통과 |
| 11b | 🔄 | 컷오버 B — 사용자 대시보드 작업(새 서비스·도메인·Spring 중지·웹/어드민 전환·master 병합) | master 병합 ✅(사용자 승인, b2c07c0 fast-forward — 11-23 스팟 기능도 함께 운영 배포). 1~6(새 서비스·도메인·Spring 중지·웹/어드민 전환)은 사용자 — GitHub 기록상 아직. 각 단계 뒤 Actions › Smoke. 병합 배포 결과: Railway(Spring, 스팟 포함) `Success - api.happiness.io.kr`, Vercel Production b2c07c0 성공, Cloudflare Pages 성공. Web CI만 실패(빌드 전 typecheck에 `next-env.d.ts` 없음 → `src/globals.d.ts`에 `*.css` 선언으로 수정). 전환 대기 중 Spring 수정: 스팟 목록·작업 탐색 PG 500(`bytea`) → JPQL `CAST(:x AS String)`, PG로 띄운 로컬에서 수정 전 500·후 200 재현 확인, 계약 91 양쪽·백엔드 62 통과. **발견(11-25)**: 운영 어드민은 7월 master(표 19개) — 새 어드민 API 전에 `apps/api/prisma/admin/upgrade/2026-11-25_july-to-november.sql` 실행 필요(B 2단계에 추가, 로컬 검증 완료) |
| 11c | ⏸ | 컷오버 C — 정리(Prisma 기준선·`backend/`·`frontend/` 삭제·CI 정리·happiness-admin 보관 안내) | 11b 완료 확인 뒤 |
| 12 | ✅ | Photoshop·Lightroom Classic MCP 연결(`.mcp.json` + `docs/ADOBE_MCP.md`) | 사용자 요청 "앱 → 어드민 → 포토샵·라이트룸 MCP"(실행 프롬프트 `PROMPT_ts-app-admin-adobe-mcp.md`). 앱·어드민과 독립이라 먼저 처리. 데스크톱 전용이라 클라우드에서 실행 확인 불가 |

## 현재 묶음 — SNAPDAY 출사 기능 병합 (요청: "어플에서 전달하는 프롬프트의 기능을 병합", 2026-11-25)

결정(사용자): **TS 전환본(`apps/api`·`apps/web`)에 구현**(표 정의만 Spring 엔티티 — 컷오버 전 스키마 주인), **Toss 디자인 유지**, **"모임" 안에 병합**(앱 이름·메뉴 유지).
기획 문서: `DESIGN_PROMPTS/planning/snapday/` (PROJECT_SPEC.html 외). 이미 있는 것: 모임·참가·대기자·피드·앨범·달력·알림·스팟·장소 투표·인스타 태그 후보.

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | ✅ | 기획 문서(PROJECT_SPEC.html·DEVELOPMENT_PLAN·DATABASE_SCHEMA·API_SPEC·TODO·README) + 디자인 프롬프트 | 5ee568d — 루트 대신 `DESIGN_PROMPTS/planning/snapday/`(저장소 규칙), 디자인 `DESIGN_PROMPT_snapday-outing.md` |
| 2 | ✅ | DB — Spring 엔티티(표 정의) + `prisma db pull` + 운영 SQL 기록 | (이번 커밋) 엔티티 7개(`outing/entity/*`, `gathering/entity/*`), 로컬 PG에 Hibernate가 표 생성 확인, pull은 모델 7개 추가뿐. `year/month`는 H2 예약어라 `poll_year/poll_month`. 백엔드 테스트 62 통과 |
| 3 | ✅ | 공휴일 — 공공데이터포털 특일정보 가져오기(키 없으면 안내) + 관리자 수동 등록 | (이번 커밋) `apps/api/src/outing/holiday.service.ts` — `HOLIDAY_API_KEY` 없으면 503 안내, 응답 파서 단위 테스트 3(`npm run test:unit`, CI 추가). 실제 API 호출은 이 세션 네트워크 차단으로 미확인 |
| 4 | ✅ | 월간 출사 투표 API — 생성(주말·공휴일 자동, 평일 추가)·투표(가능/불가, 수정)·집계·마감·확정→모임 생성·알림·마감 임박/자동 마감 배치 | (이번 커밋) `outing-poll.service.ts`·`outing.controller.ts`, 배치 10분(`run-batch.mjs outing-polls`로 자동 마감·임박 알림 1회 확인), 탈퇴 시 SNAPDAY 기록 삭제. 계약 테스트 `outing.test.ts` 3(새 API만), 새 API 전체 94 통과 |
| 5 | ✅ | 월간 출사 투표 웹 — 2027 월 목록·달력 투표·집계·추천 날짜·관리자 도구 | (이번 커밋) `OutingPollsPage`(/gatherings/polls)·`OutingPollPage`(/:id 달력·집계·운영 도구)·`OutingHolidaysPage`(관리자), 모임 홈 "🗳 출사 투표" 버튼·진행 중 배너, 알림함 POLL_* → 투표 화면. Playwright: 공휴일 등록→투표 생성→회원 가능/불가(새로고침 유지)→관리자에게 같은 집계→확정→모임 이동·회원 알림, 390/1280 가로 넘침 0·페이지 오류 0 |
| 6 | 🔄 | 현장 모드 — 출사 시작/종료(만든 사람·관리자) API + 웹 | API ✅(이번 커밋, `gathering-snapday.controller.ts`) — 웹 남음 |
| 7 | 🔄 | AI 계절 추천 — Gemini(기존 키) 구조화 결과·샘플 구분·저장·장소 후보 등록 + 웹 | API ✅(이번 커밋, `gathering-ai.controller.ts` — JSON 응답 강제, 주소·영업시간·상호 금지 지시, 결과 정리 단위 테스트, 키 없으면 SAMPLE, 10분 5회) — 웹 남음. 실제 Gemini 호출은 키·네트워크가 없어 미확인 |
| 8 | 🔄 | 베스트 포토 — 1인 3표·집계·앨범 표시 API + 웹 | API ✅(이번 커밋) — 웹 남음 |
| 9 | 🔄 | 스토리 편집기(웹, 9:16) — 사진·레이아웃·텍스트·스티커·멤버 태그·태그 복사·이미지 저장·공유 + 스토리 저장 API | 스토리 API ✅(이번 커밋, 태그는 같은 출사 참여자만·태그 알림) — 편집기 웹 남음 |
| 10 | 🔄 | 마이페이지 보강 — 출사 참여 이력·내 스토리 | API ✅(`GET /api/gatherings/my/history`, `/stories/mine`) — 웹 남음 |
| 11 | ⏳ | 전체 검증(계약 테스트·빌드·Playwright 390/1280) + 문서 정리 | |

## 현재 묶음 — 새 API·웹 알려진 갭 (요청: 컷오버 대기 중 "새 API 알려진 갭 수정", 2026-11-25)

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | ✅ | 시리즈 상세 사진에 작성자 정보 없음(화면 "익명") | `SeriesService.orderedPhotos`가 `attachMembers`로 한 번에 붙임 — Spring과 의도적 차이(계약 테스트 `IS_SPRING`), 양쪽 통과 |
| 2 | ✅ | 시리즈 커버 조회 N+1 | 새 API에선 이미 해소돼 있었음(목록 커버·미리보기 일괄 조회) — Spring만의 갭, 컷오버로 사라짐 |
| 3 | ✅ | 새로고침 후 "…ByMe"(모임 피드 좋아요 등)가 false | 원인은 서버가 아니라 웹: access token이 메모리에만 있어 새로고침 뒤 공개 GET에 토큰이 없음. 헤더의 로그인 전용 요청 401이 우연히 먼저 재발급해 주는 경합이라 평소엔 가려지고 느린 망·헤더 없는 화면(포트폴리오·작업 노트)에서 드러남. `apps/web` `apiClient` — refresh token이 있으면 요청 전에 한 번 복구(기존 재발급 큐 공유, 실패 시 로그아웃 없이 토큰 없이 진행). 헤더 요청을 6초 늦춘 Playwright: 이전 ♡(좋아요 1인데 안 누른 것처럼), 수정 후 ♥. 운영 웹(`frontend/`)은 컷오버 때 대체되므로 미적용 |

## 이전 묶음 — 출사 스팟 + 출사 모임 강화 (요청: "프롬프트 읽어서 작업 진행하고 에러 검증까지", 2026-11-23)

분석: `ANALYSIS_chulsa-app-public-features.md`, 프롬프트: `DESIGN_PROMPT_chulsa-spots.md`.

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | ✅ | P0 서버: `spot/` 패키지(Spot·PhotoSpot·API·보안·cascade) + 통합 테스트 | 통합 테스트 2개 추가(CoreFlow 52 통과) |
| 2 | ✅ | P0 웹: 둘러보기 "스팟" 탭(지도/목록) + `/spots/:id` + 에디터·사진 수정 스팟 선택 | 빌드 통과, 스팟 선택은 사진 상세(주인) + 내보내기 직후 링크(?spot=1). 브라우저 확인은 5번에서 |
| 3 | ✅ | P1 서버: 모임 ↔ 스팟·초보 환영·인물 동의, 장소 투표, 게시물 "피드백 원해요" + 테스트 | 통합 테스트 3개 추가(CoreFlow 55 통과) |
| 4 | ✅ | P1 웹·모바일: 모임 폼·상세(투표·배지), 모바일 상세 표시 | 웹 빌드·expo export web·android 통과. 브라우저 확인은 5번 |
| 5 | ✅ | 검증(빌드·테스트·브라우저 390/1280) + CLAUDE.md·PROJECT_MEMORY 반영 + push | gradle test 62/62, web build, expo export web·android, Playwright 웹 390/1280 + 모바일 웹 번들 — 상세 하단 여백·주소 중복 수정 |

## 이전 묶음 — 포트폴리오 "직접 구성" 블록 빌더 (2026-10-22)

기획: `PLANNING_portfolio-blocks.md`, 디자인: `DESIGN_PROMPT_portfolio-blocks.md`.

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | ✅ | 기획·디자인 프롬프트 (Behance 대조 — 네트워크 차단으로 공개 기능 기준) | |
| 2 | ✅ | 서버: `PortfolioLayoutValidator` + BLOCKS 템플릿 + 통합 테스트 | 테스트 52개 통과 |
| 3 | ✅ | 웹: 블록 레지스트리·렌더러 12종 + `TemplateBlocks` | |
| 4 | ✅ | 웹: `/portfolio-builder` 편집 화면 + 프로필 템플릿 카드 | |
| 5 | ✅ | 검증(빌드·테스트·브라우저 390/1280) + 문서 반영 + 커밋 | 테스트 52개, Playwright 저장→공개 반영·태그 제거·가로 넘침 0 |

## 이전 묶음 — 모바일 UI/UX 정리 (2026-10-21)

디자인: `DESIGN_PROMPT_mobile-ux-polish.md`.

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | ✅ | 390px 실화면 점검(웹 번들 + 로컬 백엔드, 로그인 후 화면까지) | `secureStorage.web.js` |
| 2 | ✅ | 탭·헤더·상태바·토큰·레이아웃·대비·진입점 수정 13건 | 디자인 프롬프트 표 |
| 3 | ✅ | 재검증 + 커밋 | 차단 숨김·신고 저장 확인, expo export web·android |

## 이전 묶음 — 모바일 앱 심사(App Store·Google Play) 대응 (2026-10-21)

기획: `PLANNING_app-store-review.md`.

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | ✅ | 동작하지 않는 소셜 로그인 버튼 제거(모바일) + 배포 빌드 서버 주소(localhost → 운영) | Apple 2.1 / 4.8 |
| 2 | ✅ | 앱 안에서 회원 탈퇴(모바일) | 탈퇴 시 댓글·차단도 삭제 |
| 3 | ✅ | 사진·댓글 신고 + 사용자 차단 (+ 댓글 작성자 위조·모바일 댓글 500/400 수정) | 모임 게시물 신고는 메일 |
| 4 | ✅ | 약관·연락처, 권한 최소화, 아이콘·스플래시, ATS·암호화 키 | |
| 5 | ✅ | 검증 + CLAUDE.md + push | gradle test 44/44, web build, expo export web·android — cfc8689 |
| 6 | ⏸ | Expo SDK 49 → 최신 업그레이드 | 스토어 targetSdk·Xcode 요구 — 큰 별도 작업이라 사용자 결정 필요 |
| 7 | ⏸ | 콘솔 작업(데모 계정·개인정보 URL·App Privacy·데이터 안전·지원 메일함·Railway 재배포) | 사용자 작업 — 기획서 4절 |

## 이전 묶음 — "탐색"→"아카이브" + 개인정보 보호(어드민과 동일 기준) (2026-10-21)

기획: `PLANNING_privacy-protection-app.md` (기준: happiness-admin 34984ce `PRIVACY_PROTECTION_PLAN.md`).

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | ✅ | 화면 문구 "탐색" → "아카이브" → **"둘러보기"**(사용자 요청으로 재변경, 웹·모바일·i18n, 경로 `/explore` 유지) | 주석만 남음 |
| 2 | ✅ | 공개·타인 응답에서 이메일·전화 제거(포트폴리오·회원 조회·검색·팔로워) | |
| 3 | ✅ | 로그인 타이밍 균일화 + 5회 실패 15분 잠금 | |
| 4 | ✅ | 관리자 회원 목록 마스킹 + 관리자 화면 30분 유휴 로그아웃 | 브라우저 확인 |
| 5 | ✅ | 테스트·빌드·문서·커밋 | 백엔드 41개, 웹·모바일 빌드 |

## 이전 묶음 — 아이디·비밀번호 찾기 (요청: "아이디, 비밀번호 찾기도 기획하고서 개발", 2026-10-21)

기획: `PLANNING_account-recovery.md`, 디자인: `DESIGN_PROMPT_account-recovery.md`.

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | ✅ | 기획서 + 디자인 프롬프트 | 이름+번호 아이디 찾기, 해시 토큰 메일 재설정 |
| 2 | ✅ | 백엔드 — 토큰 엔티티·서비스·메일·속도 제한·보안 설정 + 통합 테스트 | |
| 3 | ✅ | 웹 — 로그인 링크, `/find-account`, `/reset-password` | |
| 4 | ✅ | 모바일 — 로그인 링크 + `FindAccountScreen` | 실기기 API 호출 미확인 |
| 5 | ✅ | 검증·문서(마이그레이션 SQL)·커밋 | 운영 메일 설정은 사용자 작업(Railway MAIL_*·FRONTEND_URL) |

## 이전 묶음 — 회원가입 입력 검증 QA (요청: "정규식 체크가 이벤트 인/아웃·핸드폰에서 누락, QA 에이전트로 기획 후 개발", 2026-10-21)

기획: `QA_signup-validation.md`, 디자인: `DESIGN_PROMPT_signup-validation.md`.

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | ✅ | QA 점검(reviewer 에이전트) + 기획서·디자인 프롬프트 | 이벤트 표·휴대폰 문제·규칙 불일치 |
| 2 | ✅ | 백엔드 — 전화번호 선택 검증·정규화, 주소 오류 문구 정정 + 테스트 | |
| 3 | ✅ | 웹 SignUpPage — blur 검사·즉시 재검사·정규화·인스타그램·응답 경쟁·aria·키보드 속성 | |
| 4 | ✅ | 모바일 SignUpScreen — 입력란별 오류·blur 검사·중복 확인·키보드 속성·전화 포맷·서버 사유 | |
| 5 | ✅ | 검증(테스트·빌드·Playwright 390px·expo export)·문서·커밋 | 모바일 중복 확인·키보드는 실기기 미확인 |

## 이전 묶음 — 4개 메뉴 P1 후속 (요청: "리필됐으니 자동으로 이어서", 2026-10-21)

출처: `PLANNING_inside-menus-upgrade.md` 4절 미구현. 운영 API 배포가 막혀 있어(아래 ⏸) **새 백엔드 API가 필요 없는 항목**만 골랐다.

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | ✅ | 웹 탐색 사진 무한 스크롤 | 79장 시드 → 스크롤로 page 1·2 자동 로드, 끝에서 버튼 사라짐 |
| 2 | ✅ | 모바일 사진 상세 "비슷한 사진" | `components/SimilarPhotos.js`, expo web export 통과(실기기 미확인) |
| 3 | ✅ | 캐러셀 슬라이드를 갤러리에 바로 올리기 + 작업(초안)으로 묶기 | **발견·수정**: 웹 이미지 업로드 전부 실패하던 `uploadApi.js` |
| 4 | ✅ | 검증·문서·커밋 | 웹 빌드·테스트, Playwright |

## 보류 묶음 — 운영 배포 환경 점검 (요청: "서버 환경 작업해줘" → 운영 배포 환경, 2026-10-21)

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | ✅ | 실제 배포 경로 파악 | Actions 배포 job은 시크릿 없어 항상 건너뜀. 실제 배포는 Vercel·Railway GitHub 앱 연동 |
| 2 | ⏸ | Railway 백엔드 배포 복구 | b6dcdb9·e8fede9에 Railway 기록 없음(마지막 배포 256718e). Railway 대시보드 확인 필요 — 이 세션은 접근 불가 |

## 이전 묶음 — 탐색 사진 툴바 정리 (요청: 스크린샷 "여기도 다른 앱 대조해서 개선", 2026-10-20)

기획: `PLANNING_explore-toolbar.md`. 모바일에서 정렬 칩 6개가 3줄로 줄바꿈되고 장르·색감까지 4줄이 사진 위를 차지한다.

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | ✅ | 대조 기획 + 디자인 프롬프트 | `PLANNING_explore-toolbar.md`, `DESIGN_PROMPT_explore-toolbar.md` |
| 2 | ✅ | 툴바 한 줄화(정렬 드롭다운·색감 펼침·보기 방식) + 필터 요약 | 첫 사진까지 280 → 110px(390px) |
| 3 | ✅ | 검증·문서·커밋 | 웹 빌드·테스트, Playwright 390·1280 |

## 이전 묶음 — 4개 메뉴 내부 고도화 (요청: "Cosmos 대조해서 기능 찾고, 편집은 SCRL 대조", 2026-10-20)

분석: `ANALYSIS_cosmos-scrl-public-features.md`, 기획: `PLANNING_inside-menus-upgrade.md`.
외부 사이트가 네트워크 정책으로 막혀 있어서 REA 실화면 분석을 못 했다. 공개적으로 알려진 기능을 기준으로 대조했다.

| # | 상태 | 항목 | 메모 (마지막으로 한 일 / 다음 할 일) |
|---|---|---|---|
| 1 | ✅ | 분석서 + 기획서 + 디자인 프롬프트 | `ANALYSIS_cosmos-scrl-public-features.md`, `PLANNING_inside-menus-upgrade.md`, `DESIGN_PROMPT_inside-menus-upgrade.md` |
| 2 | ✅ | 탐색 P0 — "비슷한 사진"(사진 모달·상세) + 색 분위기 필터 칩 | 메타데이터 점수 유사도, 같은 작가 4장 제한 |
| 3 | ✅ | 내 작업 P0 — 무드보드 공개 링크(보기 전용) | `/b/:token`, 끄면 이전 링크 404 |
| 4 | ✅ | 편집 P0 — 캐러셀 분할 내보내기(SCRL) | 1080×1350 4장 다운로드 확인 |
| 5 | ✅ | 검증·문서·커밋 | 백엔드 34개 통과, 웹 빌드, Playwright 확인. 다음 묶음 후보 = 기획서 4절 "미구현" |

## 이전 묶음 — 메뉴 통합·고도화 (완료)

기획: `PLANNING_nav-consolidation.md`. 헤더 10개(탐색·갤러리·시리즈·목록·등록/편집·문의함·일정·약속·모임·프로필) →
**탐색 · 내 작업 · 업무 · 모임** + "＋ 올리기" 버튼 + 아바타 메뉴.

| # | 상태 | 항목 | 메모 (마지막으로 한 일 / 다음 할 일) |
|---|---|---|---|
| 1 | ✅ | 기획서 + 디자인 프롬프트 | `PLANNING_nav-consolidation.md`, `DESIGN_PROMPT_nav-consolidation.md` |
| 2 | ✅ | 탐색 통합 — 갤러리·목록·탐색(사진) → 탐색 사진 탭 하나 | 검색·보기 방식·모달(비로그인 포함)·리다이렉트 확인. 비로그인 모달 댓글 401→로그인 튕김 수정 |
| 3 | ✅ | 업무 허브 `/workspace` "한눈에" + 공통 탭(문의·예약·일정·약속·납품) | 카드 숫자 = 시드 데이터, 7일 목록 = 통합 달력. 활성 탭 글자색 버그 수정 |
| 4 | ✅ | 헤더·하단 내비 재구성 | 데스크탑·모바일·비로그인 확인 |
| 5 | ✅ | 검증·문서·커밋 | 백엔드 32개 통과, 웹 빌드 통과 |

## 현재 묶음 — Claude Code 플러그인 적용 + 스킬 기반 프로젝트 개선 (2026-11-12)

요청: "다 적용해주고, 끝나면 스킬을 사용해서 프로젝트 개선해줘" (플러그인 5개: claude-code-setup·hookify·commit-commands·Playwright·Ralph Loop).

| # | 상태 | 항목 | 메모 (마지막으로 한 일 / 다음 할 일) |
|---|---|---|---|
| 1 | ✅ | 플러그인 적용 — 공식 마켓플레이스 등록·활성화, hookify 규칙, 깨진 빌드 훅 수정 | 4개 project scope 활성화, 규칙 5개, 편집 훅을 파일 단위 ESLint로. Playwright는 `.mcp.json`에 이미 있어 플러그인 중복 등록 안 함 |
| 2 | ✅ | 백엔드 점검·수정 — `springboot-security`·`java-springboot` 스킬 | 9820fbe — 문의 알림 메일 HTML 이스케이프, `common/web/ClientIp`(12곳 통합, `APP_CLIENT_IP_HEADER`), 로그 이메일 마스킹. 테스트 57개 |
| 3 | ✅ | DB 점검·수정 — `supabase-postgres-best-practices` 스킬 | 9820fbe — `backend/db/supabase-lockdown.sql`(RLS 켜기 + anon/authenticated 권한 회수, 로컬 PG16 검증). **운영 실행은 사용자 몫** |
| 4 | ✅ | 웹 점검·수정 — `vercel-react-best-practices`·`accessibility` 스킬 | e99a6bc — 화면별 코드 분할(첫 번들 268→120kB gzip), 건너뛰기 링크, theme-color |
| 5 | ✅ | 모바일 점검·수정 — `vercel-react-native-skills` 스킬 (`expo-upgrade`는 SDK 업그레이드 계획만) | 피드: 더 불러오기 실패 시 목록 사라짐·중복 key 수정, 행 memo. SDK 업그레이드는 실기기 빌드가 필요해 미실행(사용자 몫 유지) |
| 6 | ✅ | Expo SDK 49 → 58 업그레이드 계획 — `expo-upgrade` 스킬 | `PLANNING_expo-sdk-upgrade.md`. 실행은 ⏸ — 1~3단계는 요청 시 클라우드에서 가능, 4단계부터 Expo 계정·실기기 필요 |
| 7 | ✅ | Expo SDK 58 업그레이드 1~3단계 실행 (`PLANNING_expo-sdk-upgrade.md` 4절) — 의존성·코드모드·`uploadImage`·`app.json` → 웹 export·웹 번들 화면 확인 | (이번 커밋) expo 58.0.26·RN 0.88.1·React 19.3, `expo install --fix`는 Expo API 차단이라 `EXPO_OFFLINE=1`(패키지 안 기준표). 내비게이션은 expo-router 대신 **React Navigation 7 그대로**(native-stack 대응 없음 — 파일 라우팅 전면 개편은 범위 밖, 피어 의존성 충족), 네비게이터 `id`, v7 `navigate`가 되돌아가지 않아 "로그인으로" 2곳 `popTo`. `expo-file-system/legacy`, image-picker `mediaTypes:['images']`, `absoluteFill`, react-native-share 12(새 아키텍처), view-shot 타입 경로, babel.config·babel-preset-expo·@babel/core 제거, app.json `sdkVersion`·`privacy`·Sdk 34 고정 삭제. **발견·수정**: 업로드 MIME에 `asset.type`("image")을 보내 서버 MIME 검사에 걸리던 것 → `asset.mimeType`. 확인: tsc 0, 웹·Android export 성공, `--dev` 웹 번들 + 로컬 API로 로그인·탭 5개·통합 일정·예약 관리·popTo 페이지 오류 0, 권한 introspect(차단 5개 유지, VIBRATE 추가). **4단계(EAS 빌드)부터 사용자** — master엔 실기기 확인 전까지 올리지 않음 |

## 이전 묶음 — Behance 분석 후속 (완료)

출처: `ANALYSIS_behance-public-features.md` 4절 우선순위 + `PLANNING_work-discovery.md` 6절 남은 것.

| # | 상태 | 항목 | 메모 (마지막으로 한 일 / 다음 할 일) |
|---|---|---|---|
| 1 | ✅ | `/explore` 비로그인 공개 | ProtectedRoute 제거. 사진 상세(`/photo/:id`)는 비로그인 좋아요가 화면만 바뀌는 문제가 있어 보호 유지 |
| 2 | ✅ | Editorial 히어로 버튼 줄 ↔ 통계 바 겹침 수정 | 본문 컨테이너 하단 패딩 104px, 데스크탑·모바일 확인 |
| 3 | ✅ | P1 작업 감상(Appreciate) + 작업 조회수 공개 | 감상 토글·공개 수치(웹·모바일 카드). 새로고침 후 내 감상 여부는 인증 경로로 조회 |
| 4 | ✅ | P1 탐색 정렬 — 작업: 최근/감상/조회, 사진: 조회순 추가 | 서브쿼리 정렬(페이지) + 메모리 정렬(검색 경로), 웹·모바일 UI |
| 5 | ✅ | P1 무드보드(이름 붙은 저장 보드) | 웹 완료(담기 선택창·저장함 보드 목록·보드 상세). 모바일 UI는 9번으로 |
| 6 | ✅ | P2 공동 작업자 크레딧 | `creditsJson` + 편집 모달 + 작업 페이지 "함께한 사람"(공개 회원 링크). 모바일 편집은 9번 |
| 7 | ✅ | P2 작업 초안 | `Series.draft` + 인증 전용 `/series/mine`(새로고침 후에도 본인 초안 보임), 웹·모바일 |
| 8 | ✅ | P2 운영자 큐레이션(Featured) | `/admin/curation` + 탐색 "✦ 에디터 추천" 띠. dev 확인 시 관리자 승격은 H2 콘솔 `query.do`로 |
| 9 | ✅ | 모바일 격차: 무드보드 담기·초안 | `BoardPickerSheet` + 작업 노트 시트 초안 스위치. 남은 격차(의도적 보류): 모바일 보드 관리 화면·크레딧 편집·작업 노트 화면(감상 버튼) — 웹 링크로 대체 |

각 항목은 기획·디자인 프롬프트 갱신 → 백엔드 → 웹 → (가능하면) 모바일 → 빌드/테스트/런타임 확인 → CLAUDE.md 반영 → 커밋·push 순.

## 완료 기록

- d318ee7 — 1·2: `/explore` 비로그인 공개, Editorial 히어로 겹침 수정
- 917d6e7 — 3: 작업 감상 + 조회수 공개
- f82e874 — 4: 작업 감상순·조회순, 사진 조회순
- 68974f6 — 5: 무드보드(웹)
- 617fa38 — 6: 함께한 사람(크레딧)
- 4bcbb63 — 7: 작업 초안 + `/series/mine`
- f722eea — 8: 에디터 추천 큐레이션
- (이 커밋) — 9: 모바일 보드 담기·초안 스위치

**묶음 완료(2026-10-20).** 다음 묶음이 생기면 위 표를 새로 쓴다.
