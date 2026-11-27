# 보안 강화 점검 (2026-11-27)

> 요청: "보안쪽 강화하는 프롬프트 작성해서 바로 진행해줘" — 지시서 `PROMPT_security-hardening.md`, 진행 기록 `WORK_QUEUE.md` S1~S8.
> 범위: happiness-app 전체(Spring `backend/` — 지금 운영, Nest `apps/api` — 컷오버 대기, `frontend/`·`apps/web`·`apps/admin`·`mobile/`).
> 기반: 전체 기능 검증 수정 4건(095e0f0) 위. 이전 점검 `SECURITY_AUDIT_2026-10-22.md`(IDOR 8건)는 계약 테스트로 회귀만 확인.

## 1. 발견·수정 (바로 적용)

| # | 위치 | 문제 | 심각도 | 수정 |
|---|---|---|---|---|
| 1 | 업로드 `POST /api/upload/image` (Spring·Nest) | 클라이언트가 보낸 Content-Type만 보고, 저장 키 확장자는 **파일 이름에서** 가져왔다. 이미지가 아닌 파일(HTML 등)을 `image/png`로 속여 `…/images/photos/<uuid>.html`로 우리 버킷 공개 주소에 올릴 수 있었다(피싱·악성 파일 배포 경로) | 높음 | 매직 바이트로 실제 형식 판별(JPEG·PNG·GIF·WebP 외 거절), 확장자·저장 Content-Type도 실제 형식에서. Spring `common/util/ImageSignature`, Nest `detectImageType` |
| 2 | 클라이언트 IP 판별 (Spring `ClientIp`·Nest `clientIp`) | `X-Forwarded-For` 첫 값, `CF-Connecting-IP`는 Cloudflare를 거치지 않으면 **클라이언트가 마음대로 보낸다** → 로그인 잠금 외 모든 IP 기준 제한(전역 100회/분·계정 찾기·문의·예약·AI·IP 차단)을 헤더만 바꿔 우회. 로컬 재현: IP를 바꿔 가며 105회 → 전부 200 | 높음(설정에 따라) | `APP_TRUSTED_PROXY_HOPS=N` 옵션 추가 — `X-Forwarded-For` 오른쪽에서 N번째(우리 프록시가 붙인 값). **기본 동작은 그대로**라 운영 반영은 아래 제안 P2(환경 변수 설정) 필요. 설정 시 재현: 앞 값을 바꿔도 101회 후 429 |
| 3 | Nest `apps/api` 응답 헤더 | Spring에 있는 보안 헤더(CSP·X-Frame-Options·nosniff·Referrer-Policy·HSTS·no-store)가 **하나도 없었고** `X-Powered-By: Express` 노출 — 컷오버하면 그대로 회귀 | 중간 | `common/security-headers.ts`(helmet 없이 Spring과 같은 값), 앱·어드민 진입점 모두, `X-Powered-By` 끔. HSTS는 HTTPS(`X-Forwarded-Proto`)일 때만 |
| 4 | Nest 전역 속도 제한 | Spring `RateLimitFilter`(IP당 100회/60초)에 해당하는 것이 없었다 | 중간 | `common/rate-limit.middleware.ts` — 같은 설정 이름(`SECURITY_RATE_LIMIT_*`)·같은 429 `R001`, 맵 상한 |
| 5 | Nest CORS | `allowedHeaders: '*'` + credentials — Fetch 표준상 `*`는 Authorization을 덮지 못하고(브라우저에 따라 preflight 차단, 로컬 Chromium은 통과) 필요 없는 헤더까지 허용 | 낮음 | Spring과 같은 목록·exposed `X-Trace-Id`·maxAge 3600 |
| 6 | Spring `RateLimitFilter` | IP마다 버킷을 만들고 지우지 않음 — #2와 합치면 헤더를 바꿔 가며 메모리를 끝없이 키울 수 있다(무료 512MB 인스턴스) | 중간 | 5만 개 넘으면 비움(`IpBlockFilter` allowCache와 같은 방식). Nest도 같은 상한 |
| 7 | Nest 어드민 JWT | 운영(`NODE_ENV=production`)에서 `ADMIN_JWT_SECRET`이 **저장소에 공개된 개발 기본값**이어도 기동 → 누구나 관리자 토큰 위조 가능(설정 실수 시) | 중간(조건부) | 운영에서 기본값이면 기동 거부(앱 JWT는 이미 난수 키로 대체 중) |
| 8 | 의존성 | `sharp` 0.34.5 — 업로드 이미지를 처리하는 libvips·libheif·librsvg 취약점(high), `axios` 1.7.2(high), frontend 치명 3건(`shell-quote`·`proxy-addr`·`websocket-driver`, 개발 서버 계열), Spring Boot 3.4.5 | 높음(sharp) | sharp 0.35.5, axios 1.21.1(웹·새 웹·모바일), prisma CLI `effect` override 3.22.5, frontend `npm audit fix`(59→36, 치명 0), Spring Boot 3.4.13. `apps/api`·`apps/admin` `npm audit --omit=dev` 0건 |
| 9 | 웹 정적 호스팅 헤더 (`frontend`·`apps/web`의 `_headers`·`vercel.json`) | Referrer-Policy·Permissions-Policy 없음, `X-XSS-Protection: 1; mode=block`(폐기된 필터 — 오히려 정보 노출 경로) | 낮음 | `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(), usb=()`(스팟 "내 주변"만 위치 사용), `X-XSS-Protection: 0` |

## 2. 확인했고 문제없던 것

- **비밀값**: 추적 중인 파일과 **git 이력 전체**에 키 모양 문자열(`eyJ…`, `sb_secret_`, `sk-`, `AKIA`, `ghp_`, `AIza`, 개인키) 0건. 커밋된 `.env.development/.production`은 자리표시자만. 웹·모바일 번들 변수에 서버 전용 키 없음. 프로젝트 공유 폴더도 0건.
- **원시 SQL**: Nest `$queryRawUnsafe` 1곳(작업 탐색) — 정렬은 고정 문자열 중 선택, 값은 모두 바인딩. Spring native 쿼리도 바인딩.
- **SSRF**: 서버가 사용자 URL을 여는 곳 없음(외부 호출은 OAuth·Gemini·Vision 고정 주소).
- **로그**: 비밀번호·토큰·Authorization 헤더를 남기는 곳 없음. 이메일은 마스킹(`maskEmail`). 재설정 링크는 dev에서만(Spring dev 프로필, Nest `NODE_ENV≠production` — render.yaml은 production). 웹·모바일·어드민 웹 `console.log`에 토큰·개인정보 0건.
- **CORS 허용 도메인**: Spring·Nest 모두 명시 목록(와일드카드 없음). 어드민 웹 `vercel.json`은 이미 CSP·HSTS·Permissions-Policy까지 있음.
- 이전 점검의 IDOR 8건: 계약 테스트(팔로우·피드·태그·공유·AI 태그·납품 비밀번호) 양쪽 통과로 회귀 없음.

## 3. 검증

| 대상 | 명령 | 결과 |
|---|---|---|
| Spring | `./gradlew clean build -x test` + `./gradlew test` | BUILD SUCCESSFUL, 테스트 **70/70** (`ImageSignatureTest`·`ClientIpTest` hops 추가) |
| Nest 앱 | `npm run build` + `API_BASE_URL=http://localhost:8090 npm run test:contract` | 빌드 성공, 계약 **92/92** (업로드 테스트에 확장자·HTML 위장 거절 추가) |
| Spring 계약 | `API_BASE_URL=http://localhost:8080 npm run test:contract` | **92/92**(1 skip은 서버 간 비교용). 처음엔 5개 실패 — 095e0f0이 Spring의 필수 파라미터 누락을 500→400으로 고쳤는데 계약 테스트·Nest는 500이었다 → Nest 예외 필터도 400 C002로 맞추고 테스트 5곳 기대값 수정, Nest도 92/92 |
| Nest 어드민 | 로컬 기동 후 헤더 확인 | CSP·X-Frame-Options·nosniff·Referrer-Policy 응답, 공개 기본 JWT로는 운영 기동 거부·난수 키는 기동 |
| 헤더·CORS | curl 8080/8090 비교 | 같은 헤더 값, preflight `Allow-Headers` Spring과 같은 목록 |
| 속도 제한 | 같은 IP 105회 → 101 200 + 4 429(`R001`), IP 위조 105회 → 전부 200(재현), `APP_TRUSTED_PROXY_HOPS=1`이면 위조해도 4 429 | 기대대로 |
| sharp 0.35.5 | 4000×3000 PNG → 2048×1536 JPEG, WebP 읽기 | 정상 |
| 웹 | `frontend` `CI=true npm run build` / `apps/web` typecheck·test 13·build | Compiled successfully / 통과 |
| 모바일 | `npx expo export --platform web`·`android` | Finished saving JS Bundles (둘 다) |

어드민 계약 테스트(Spring 어드민 8081 필요)는 돌리지 않았다 — 어드민 진입점 변경은 응답 헤더 추가와 기동 시 비밀값 검사뿐이라 본문·상태 코드에는 영향 없음.

## 4. 사용자 할 일 (코드로 못 하는 것)

1. **Supabase `service_role` 키 재발급** — 채팅에 노출된 적이 있다. Supabase › Project Settings › API Keys에서 새 secret/service_role 키 발급 → Render `happiness-api` 환경 변수 `SUPABASE_SERVICE_ROLE_KEY` 교체 → 재배포 → 예전 키 폐기. 재발급 전까지 그 키로 RLS를 무시하고 DB·Storage 전체를 읽고 쓸 수 있다.
2. `backend/db/supabase-lockdown.sql`을 새 Supabase SQL Editor에서 실행(anon 키로 테이블 직접 접근 차단) — 새 DB로 옮겼으니 다시 필요.

## 5. 제안 (확인 후 적용 — 인증·배포 설정이라 바로 하지 않음)

| # | 제안 | 이유 | 영향 |
|---|---|---|---|
| P2 | Render `happiness-api`에 `APP_TRUSTED_PROXY_HOPS=1`, Cloudflare 프록시를 앞에 두기 전까지 `APP_CLIENT_IP_HEADER`(CF-Connecting-IP) **제거** | 1-#2 우회를 실제로 막음 | 배포 설정. Render 프록시가 `X-Forwarded-For` 끝에 실제 주소를 붙인다는 전제 — 적용 후 로그의 IP로 확인 |
| P3 | Spring `server.forward-headers-strategy: framework` | Render가 TLS를 끝내 Spring은 http로 보고 **HSTS를 보내지 않는다**(Nest는 보냄) | 요청 scheme·host 판단이 바뀜(리다이렉트 URL 등) — 스테이징 확인 필요 |
| P4 | 웹 CSP를 `Content-Security-Policy-Report-Only`로 먼저 | 웹엔 CSP가 없음. 카카오맵·Firebase·Supabase 이미지·폰트 출처를 모아 본 뒤 강제 | 배포 설정 |
| P5 | 포트폴리오 임베드: 웹이 `X-Frame-Options: DENY`라 `EmbedCodeModal`이 주는 iframe 코드가 **다른 사이트에서 열리지 않는다**(기능 버그) | 임베드를 살릴지(슬라이드쇼 경로만 `frame-ancestors *`) 정책 결정 | 클릭재킹 범위 |
| P6 | Apple 로그인 `id_token` 서명 검증(기존 기록), Spring 로그아웃 Redis 장애 시 500(기존 기록) | 인증 동작 | 인증 변경 |
| P7 | Spring JSON 본문 크기 상한(Nest는 기본 100KB, Spring은 사실상 없음) | 큰 본문으로 메모리 압박 | 큰 정상 요청(블록 JSON 20KB 등)보다 넉넉히 |
| P8 | 남은 npm 경고: frontend `react-scripts`(CRA 빌드 도구, 컷오버 C에서 `frontend/` 삭제로 해소), firebase `@grpc/grpc-js`(firestore 미사용·브라우저 번들 아님), mobile 59건(Expo SDK 58 업그레이드에서 해소) | 메이저 업그레이드 필요 | |
