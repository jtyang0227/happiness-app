# 실행 프롬프트 — TypeScript 전환 11단계: 컷오버 (2026-11-24)

> 앞 단계(1~10, 12)는 끝났다. 남은 것은 운영을 Spring·CRA에서 `apps/api`·`apps/web`·`apps/admin`으로 옮기는 일이다.
> 운영 대시보드·비밀값·DNS는 클라우드 세션에서 접근할 수 없으므로 세 부분으로 나눈다.
> **A는 Claude가 바로**, **B는 사용자가 대시보드에서**, **C는 B가 끝났다는 확인을 받은 뒤 Claude가** 한다.
> 기준 문서: `PLANNING_typescript-migration.md` 4-1(어드민 설계)·5·5-1(컷오버 체크리스트).

## 붙여 넣을 프롬프트

```
DESIGN_PROMPTS/planning/PROMPT_ts-cutover.md 대로 TS 전환 11단계를 진행해줘.
A(저장소 준비)는 바로 하고, B는 내가 할 일을 값까지 적어 줘. C는 내가 "B 끝났어"라고 하면 진행해.
운영 DNS·서비스 중지·master 병합·다른 저장소 보관은 내가 확인하기 전에는 하지 마.
```

## A. 저장소 준비 (Claude — 지금, 작업 브랜치에만)
1. **배포 설정**: `render.yaml`에 새 서비스 2개를 추가한다 — `happiness-api-ts`(앱 API, `node dist/main.js`)와 `happiness-admin-api`(어드민 API, `node dist/admin-main.js`). 둘 다 rootDir `apps/api`, 빌드 `npm ci && npm run build`, 헬스 `/actuator/health`. 비밀값은 `sync: false`(대시보드 입력), Spring과 같아야 하는 값(`JWT_SECRET`, `ADMIN_JWT_SECRET`, `PRIVACY_ENCRYPTION_KEY`)은 **자동 생성하지 않는다**(같은 값이어야 로그인·암호문이 이어진다). 기존 `happiness-api`(Spring)는 그대로 둔다.
2. **웹 전환 스위치**: `deploy-frontend-cloudflare`·`deploy-frontend`(Vercel 액션) job이 저장소 Variable `WEB_APP_DIR`(기본 `frontend`)을 보게 한다. `apps/web`이면 Node 22·`npm run build`·출력 `out`. 값을 바꾸기 전에는 지금과 똑같이 동작해야 한다.
3. **스모크 점검**: 운영에서도 안전한 읽기 위주 점검 스크립트 `apps/api/scripts/smoke.mjs`(앱 API·어드민 API·웹 셸)와 수동 실행 워크플로 `.github/workflows/smoke.yml`(입력: 주소들). 로컬 Spring·Nest 양쪽에 돌려 통과를 확인한다.
4. **문서**: 작업 큐 11을 11a(A)·11b(B)·11c(C)로 나누고, 이 문서 B에 실제 값과 순서를 채운다. CLAUDE.md·PROJECT_MEMORY 갱신.
5. 검증: `apps/api` 빌드, `apps/web`·`apps/admin` 빌드, 워크플로 YAML 파싱, 스모크 로컬 4대(8080·8090·8081·8091) 통과. 커밋·push(작업 브랜치).

## B. 사용자 작업 (대시보드 — Claude는 할 수 없음)
아래 "B 상세" 참고. 순서대로 하고, 각 단계 뒤에 Actions › Smoke를 돌려 확인한다. 되돌리기는 각 단계에 적었다.

## C. 정리 (Claude — B 완료 확인 뒤)
1. `LEGACY_API_URL`이 비어 있는 운영에서 스모크 통과를 사용자에게 확인받는다.
2. Prisma 기준선: 운영 DB에서 `npx prisma migrate diff --from-empty --to-config-datasource --script > prisma/migrations/0_baseline/migration.sql`(앱·어드민 각각) → 사용자가 `npx prisma migrate resolve --applied 0_baseline` 실행. 이후 스키마 변경은 마이그레이션으로.
3. `backend/`·`frontend/` 삭제, CI의 `backend-ci`·`frontend-ci`·`docker-build`·`deploy-backend`(Spring)·`WEB_APP_DIR` 스위치 정리, `render.yaml`의 Spring 서비스 제거, 문서의 Spring·CRA 설명을 TS 기준으로.
4. (선택) 레거시 프록시 코드(`common/legacy-proxy.ts`) 제거.
5. happiness-admin 저장소: 사용자가 결정하면 README를 "이 저장소로 이전됨"으로 바꾸고 보관(보관은 사용자가 GitHub에서).

---

## B 상세 (사용자 할 일 — 값 포함)

> **진행 상황(2026-11-24)**: 7번(master 병합)만 끝났다. 1~6번은 아직 — GitHub 기록상 운영 웹 Production 배포는 11-13 이후 없었고(병합 배포 제외), Smoke 실행 기록도 없다. 각 단계 뒤 Actions › Smoke를 돌리면 Claude가 실행 결과를 GitHub에서 확인할 수 있다.

> 지금 운영이 Railway(Spring API)·Vercel(웹)·별도 Vercel(어드민)인지, 무료 전환(`PLANNING_free-hosting.md`)을 이미 했는지에 따라 1·2의 플랫폼만 바뀐다. 값과 순서는 같다.

**0. 결정 두 가지 (먼저)**
- 어드민 DB: 운영 Spring 어드민의 변수 `DB_SCHEMA`(없으면 `admin`)를 확인한다. 새 어드민 API의 `ADMIN_DB_SCHEMA`에 **같은 값**을 넣는다. 어드민이 앱 회원·사진(`public`)을 보게 합치고 싶다면 별도 작업(스키마 변경 SQL — 승인 필요)으로 따로 요청한다.
- happiness-admin 저장소를 보관할지(C-5).

**1. 새 API 서비스 띄우기 (트래픽은 아직 Spring)**
- Render: Blueprint 동기화(또는 새 Web Service, Root `apps/api`, Build `npm ci && npm run build`, Start `node dist/main.js`).
- 변수: `DATABASE_URL`·`REDIS_URL`·`SUPABASE_*`·`GEMINI_API_KEY`·`MAIL_*`·OAuth 키 = Spring과 같은 값, **`JWT_SECRET` = Spring과 같은 값**, `LEGACY_API_URL` = 지금 Spring API 주소(예: `https://api.happiness.io.kr`), `BATCH_ENABLED=false`, `NODE_ENV=production`, `CORS_ALLOWED_ORIGINS` = Spring과 같은 값.
- 확인: Actions › Smoke(`api_url` = 새 서비스 주소). 되돌리기: 서비스 삭제.

**2. 새 어드민 API 띄우기**
- Start `node dist/admin-main.js`. 변수: `DATABASE_URL`(어드민 DB와 같은 인스턴스), `ADMIN_DB_SCHEMA`(0번 값), **`ADMIN_JWT_SECRET` = Spring 어드민 `JWT_SECRET`과 같은 값**, **`PRIVACY_ENCRYPTION_KEY` = Spring 어드민과 같은 값**, `ADMIN_CORS_ALLOWED_ORIGINS` = 어드민 웹 주소, `ADMIN_BATCH_ENABLED=false`, `NODE_ENV=production`, `ADMIN_PORT` = 플랫폼 포트(Render 10000).
- 확인: Smoke(`admin_api_url`). 기존 관리자 계정으로 로그인 → 회원 목록 → 개인정보 접속기록 "무결성 검증" 유효.

**3. 앱 API 도메인 전환**
- `api.happiness.io.kr`(Cloudflare DNS 또는 플랫폼 커스텀 도메인)을 새 앱 API 서비스로. 하루 관찰(오류 로그·Smoke).
- 되돌리기: DNS를 Spring으로.

**4. Spring API 끄기 + 배치 넘기기 (동시에)**
- Spring 서비스 중지와 **같은 때** 새 앱 API의 `BATCH_ENABLED=true`, `LEGACY_API_URL`은 비운다.
- 되돌리기: Spring 다시 켜고 `BATCH_ENABLED=false`, `LEGACY_API_URL` 복구.

**5. 웹 전환**
- Cloudflare Pages(Actions 배포)를 쓰면: 저장소 Variable `WEB_APP_DIR=apps/web`. Vercel(GitHub 앱 연동)을 쓰면: 프로젝트 Settings › Root Directory `apps/web`, Framework Next.js, Output `out`. 환경 변수 이름(`REACT_APP_*`)은 그대로.
- 되돌리기: `WEB_APP_DIR` 삭제 / Root Directory `frontend`.

**6. 어드민 전환**
- 어드민 웹 Vercel 프로젝트를 이 저장소로 연결, Root `apps/admin`, Build `npm run build`, Output `out`, `REACT_APP_API_URL` = 새 어드민 API 주소 + `/api`. 어드민 API 도메인을 새 서비스로.
- Spring 어드민 중지와 같은 때 `ADMIN_BATCH_ENABLED=true`.
- 되돌리기: 이전 Vercel 연결·도메인.

**7. master 병합 — ✅ 2026-11-24 완료(사용자 승인, b2c07c0로 fast-forward)**
- 원래 마지막에 적었지만 실제로는 **1~6보다 먼저** 필요했다(Render Blueprint·Actions·Smoke 워크플로가 master 기준). 병합 전 확인: 백엔드 테스트 62/62, CRA 운영 빌드 성공.
- 이 병합으로 11-23 출사 스팟 기능(웹·Spring)도 함께 운영에 나갔다(Railway 재배포 시 `spots` 등 표가 ddl-auto로 생성).
- 다음은 1~6단계.

**무료 플랜 주의(Render)**: 무료 인스턴스 시간은 작업 공간 합계 월 750시간이다. Spring + 새 앱 API + 새 어드민 API를 동시에 깨워 두면 한 달을 못 버틴다 — 전환 기간을 짧게 하고, keepalive(`KEEPALIVE_URL`)는 앱 API 하나에만 둔다(어드민은 잠들어도 된다).

## 이전 안내 문구 (happiness-admin README — C-5에서 사용)
```
# happiness-admin (보관됨)
이 저장소의 서버·화면은 happiness-app 저장소로 이전되었습니다(2026-11-24).
- 어드민 API: apps/api/src/admin (node dist/admin-main.js)
- 어드민 웹: apps/admin (Next.js)
새 작업은 happiness-app에서 합니다.
```
