# TypeScript 전면 전환 계획 (2026-11-24)

요청: "스프링부트·리액트를 안 써도 되니 최근 제일 많이 쓰는 언어로 전체 변경". 사용자 선택: **TypeScript 통일 + 단계별 전환**.

## 1. 목표 스택
| 영역 | 지금 | 바꾼 뒤 |
|---|---|---|
| API | Spring Boot 3.4 (Java, 약 1.8만 줄, 컨트롤러 34·엔티티 47) | **NestJS 12** (`apps/api`) + **Prisma 7** (PostgreSQL 드라이버 어댑터) |
| 웹 | React 18 CRA (JS, 약 3.7만 줄) | TypeScript → **Next.js** (`apps/web`) |
| 어드민 | 별도 저장소 Spring Boot 3.5 + React (약 1.1만 줄) | 이 저장소 `apps/admin`(Next.js) + API의 admin 모듈 |
| 모바일 | Expo 49 (JS) | Expo + TypeScript (SDK 업그레이드 계획과 같이) |
| DB | Supabase PostgreSQL | **그대로** — 데이터 이전 없음 |

## 2. 원칙
1. **운영은 언제나 동작한다.** 새 API는 옮기지 않은 경로를 기존 Spring API로 넘긴다(`LEGACY_API_URL` 프록시, strangler 방식). 그래서 새 API로 주소를 바꿔도 아직 안 옮긴 기능이 그대로 돈다.
2. **같은 응답 = 같은 동작.** 응답 모양(`ApiResponse{success,code,message,data,timestamp}`·`{status,data}`·래퍼 없는 JSON 혼재)과 상태 코드·한국어 오류 문구를 그대로 맞춘다. 웹·모바일 코드는 API 전환 중 바꾸지 않는다.
3. **증명은 계약 테스트로.** `apps/api/test/contract/*`는 HTTP로만 말하는 테스트라 **Spring과 Nest 양쪽에 똑같이** 돌린다(`API_BASE_URL`). 묶음 하나를 옮길 때마다 "Spring 통과 → Nest 통과"를 확인한다. 기존 `CoreFlowIntegrationTest`(62개)의 시나리오를 묶음별로 옮겨 온다.
4. **토큰 호환.** JWT를 같은 비밀키·같은 클레임(`sub`, `email`, `type`, `role`, `iss=happiness-app`, `jti`, HS256)으로 만든다 → 어느 서버가 발급한 토큰이든 양쪽에서 통한다(전환 중 로그인이 풀리지 않는다).
5. **스키마 주인은 하나.** 전환이 끝날 때까지 테이블은 Hibernate(`ddl-auto: update`)가 만든다. Prisma는 `db pull`로 읽기만 하고 마이그레이션을 실행하지 않는다. Spring을 끄는 날 Prisma 마이그레이션 기준선(baseline)을 잡는다.
6. 기능을 늘리지 않는다 — 옮기는 동안 동작은 1:1. 고칠 버그를 발견하면 기록만 하고 양쪽을 같이 고치지 않는다(별도 작업).

## 3. 폴더
```
happiness-app/
├── apps/api/        # NestJS (신규) — src/<feature>/, prisma/schema.prisma, test/contract/
├── backend/         # Spring (전환 끝나면 삭제)
├── frontend/        # React CRA (8단계에서 apps/web으로)
├── mobile/          # Expo (10단계에서 TS)
```
지금은 `apps/api`만 자기 `package.json`(npm)을 가진다. 웹을 옮기는 단계에서 pnpm 워크스페이스로 묶는다(기존 Vercel·모바일 npm 설치를 지금 흔들지 않기 위해).

## 4. 단계 (WORK_QUEUE에 같은 번호)
| # | 단계 | 끝났다는 기준 |
|---|---|---|
| 1 | 기반 — Nest 뼈대, Prisma 스키마(`db pull`), 응답·오류 형식, JWT 호환, 인증 가드, 레거시 프록시, 계약 테스트 하네스 | 빌드·린트 통과, 프록시로 옮기지 않은 경로가 Spring 응답과 같음 |
| 2 | 인증·회원·계정 찾기 (`/api/auth/**`) | 계약 테스트 Spring·Nest 둘 다 통과 |
| 3 | 사진·댓글·팔로우·피드·업로드·신고·차단 | 〃 |
| 4 | 시리즈·포트폴리오·무드보드·탐색·비슷한 사진 | 〃 |
| 5 | 업무 — 문의·예약·납품·약속·분석 | 〃 |
| 6 | 모임·스팟·알림·배치(@nestjs/schedule) | 〃 |
| 7 | 추천사·언론·패키지·브랜드·뉴스레터·AI 어시스턴트 | 〃 + Spring 경로 0개 |
| 8 | 웹 → TypeScript → Next.js | 빌드·화면 390/1280 회귀 0 |
| 9 | 어드민 이관 (happiness-admin → `apps/admin` + API admin 모듈) | 어드민 계약 테스트 |
| 10 | 모바일 TypeScript | expo export web·android |
| 11 | 컷오버 — 배포를 Nest로, Spring 끄기, Prisma baseline, `backend/` 삭제 | 운영 health·스모크 |

## 5. 배포 전환 (사용자 확인 필요한 단계)
- 2단계가 끝나면 `apps/api`를 Render/Railway 새 서비스로 띄우고 `LEGACY_API_URL=기존 API 주소`. `api.happiness.io.kr`을 새 서비스로 돌리면 옮긴 기능만 Nest, 나머지는 Spring으로 간다. 되돌리기는 DNS만 다시 돌리면 된다.
- 운영 DB 스키마는 이 계획 동안 바꾸지 않는다.

## 5-1. 컷오버 체크리스트 (11단계 — 사용자 확인 후)
**API (`apps/api`)**
- 새 서비스(Render/Railway): 루트 `apps/api`, 빌드 `npm ci && npm run build`(빌드 때도 `DATABASE_URL` 필요 — `prisma.config.ts`), 시작 `node dist/main.js`, 헬스 `/actuator/health`.
- 환경 변수: Spring과 같은 값 — `DATABASE_URL`(풀러면 `?pgbouncer=true` 불필요, pg 어댑터), `JWT_SECRET`(같은 값이어야 로그인 유지), `REDIS_URL`, `SUPABASE_*`, `MAIL_*`, `FRONTEND_URL`, `GEMINI_API_KEY`, `CORS_ALLOWED_ORIGINS`, OAuth 키들.
- 전환 순서: ① 새 서비스를 `LEGACY_API_URL=기존 Spring`, `BATCH_ENABLED=false`로 띄움 → 스모크 ② `api.happiness.io.kr`을 새 서비스로 → 하루 관찰 ③ Spring 중지와 **동시에** `BATCH_ENABLED=true` ④ 프록시 제거(`LEGACY_API_URL` 비움) ⑤ Prisma baseline(`prisma migrate diff`로 현재 스키마 기준선) ⑥ `backend/` 삭제.
- 되돌리기: DNS를 Spring으로, 새 서비스 `BATCH_ENABLED=false`.

**웹 (`apps/web`)**
- Cloudflare Pages job(`deploy-frontend-cloudflare`): `working-directory: frontend` → `apps/web`, 출력 `build` → `out`, Node 22. `REACT_APP_*` 변수 이름은 그대로.
- Vercel: 프로젝트 Root Directory `frontend` → `apps/web`, Framework Next.js(정적 내보내기라 `out/`), 환경 변수 그대로.
- `frontend-ci`·`deploy-frontend*`가 `apps/web`을 보게 바꾼 뒤 `frontend/` 삭제. `web-ci`는 이미 있음(2026-11-24).
- 되돌리기: 루트 디렉터리만 `frontend`로.

## 6. 위험·주의
- Java의 `LocalDateTime` JSON(`"2026-11-24T10:00:00.123456"`, 시간대 없음)과 JS `Date`(`...Z`)가 다르다 → 응답 직렬화에서 Spring 형식으로 맞춘다(`toLocalDateTimeString`).
- Spring의 Jackson은 `null` 필드를 내보내고(`ApiResponse`만 `NON_NULL`) Lombok `isXxx` → `xxx` 규칙이 있다 → 계약 테스트가 키 이름까지 비교한다.
- BCrypt 해시는 `$2a$`(Spring) — `bcryptjs`로 그대로 검증 가능.
- 인메모리 rate limit·로그인 잠금은 서버가 둘이면 따로 센다(전환 기간 한정, 기존에도 알려진 갭).
- 규모: 약 7.6만 줄. 세션 여러 번에 걸친 작업이며, 각 단계는 작업 큐에 남긴다.
