# 무료 호스팅 전환 계획 (2026-11-06, 2026-11-27 갱신)

목표: 상업적 사용이 허용되는 **무료** 플랜만으로 운영. 코드는 준비 완료, 계정 연결·값 입력만 사용자가 한다.

| 영역 | 지금 | 바꿀 곳 (무료) | 상업적 사용 | 저장소에 준비된 것 |
|---|---|---|---|---|
| 웹 | Vercel Hobby (상업적 사용 불가) | **Cloudflare Pages** | 가능 | `frontend/public/_redirects`·`_headers`, `deploy.yml` `deploy-frontend-cloudflare` |
| API | Railway Hobby $5/월 | **Render Free** | 가능 | `render.yaml`(Blueprint), `.github/workflows/keepalive.yml` |
| DB·파일 | Supabase Free | 그대로 | 가능 | — (7일 무사용 일시정지는 keepalive로 방지) |
| 캐시 | Upstash Free | 그대로 | 가능 | — (Redis 장애 시 앱은 통과) |
| 분석 | — | Firebase Analytics(무료) | 가능 | `utils/analytics.js` (11-04) |
| DNS·SSL | Cloudflare Free | 그대로 | 가능 | — |
| CI | GitHub Actions | 그대로 (공개 저장소 → 무제한 무료) | — | — |

## 하지 않은 것
- **Next.js 전환**: 비용과 무관(CRA 정적 빌드도 Cloudflare Pages에서 무료). 60여 화면 재작성·회귀 위험이 커서 별도 프로젝트로 둔다.
- **Spring Boot → Supabase 직접 접근**: 권한·IDOR 검사 전부를 RLS로 다시 짜야 함. 무료 전환에 필요 없음.

## Render 무료의 한계 (알고 쓰기)
- 512MB RAM(Dockerfile `-Xmx400m` 그대로 맞음), 월 750시간(서비스 1개 상시 가동 가능).
- 15분 무요청이면 잠듦 → keepalive가 10분마다 깨움. GitHub 예약 실행은 몇 분 늦을 수 있어 가끔 첫 요청이 30~60초 걸릴 수 있다.
- 잠든 동안 `@Scheduled` 배치(예약 만료·모임 상태 전환)도 멈춘다 — keepalive가 이를 거의 막아 준다.
- 싱가포르 리전(한국과 가장 가까운 무료 리전).

## 사용자가 할 일 (순서대로)
1. **Render**: render.com 가입(GitHub) › New › Blueprint › 이 저장소 → `sync:false` 값 입력(Railway Variables에 있는 값 그대로: `DATABASE_URL`, `SUPABASE_*`, `REDIS_URL`, `GEMINI_API_KEY`, `MAIL_*`). `JWT_SECRET`은 Render가 새로 만든다(기존 로그인 한 번 풀림). 배포 후 `https://happiness-api.onrender.com/actuator/health`가 UP인지 확인.
2. **keepalive**: GitHub › Settings › Variables › `KEEPALIVE_URL` = 위 health 주소.
3. **API 도메인 전환**: Render › Settings › Custom Domain에 `api.happiness.io.kr` 추가 → Cloudflare DNS의 `api` CNAME을 Render가 알려 주는 주소로. 확인되면 Railway 서비스 중지(요금 0).
4. **Cloudflare Pages**: Cloudflare › My Profile › API Tokens › "Cloudflare Pages: Edit" 권한 토큰 → GitHub Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. (선택) Variables에 `REACT_APP_FIREBASE_*` 5개. master에 push하거나 Actions › Run workflow → `https://happiness-app.pages.dev` 확인.
5. **웹 도메인 전환**: Pages 프로젝트 › Custom domains에 `happiness.io.kr`·`www` 추가(같은 Cloudflare 계정이면 DNS 자동) → Vercel 프로젝트의 도메인 제거 또는 프로젝트 삭제.

## 되돌리기
- DNS CNAME만 원래대로 돌리면 된다(Vercel·Railway 설정은 지우기 전까지 그대로 남아 있음).


---

## 2026-11-27 갱신 — 새로 배포 중인 구성과 무료 한도 점검

사용자 결정(11-27): 예전 배포(Railway·예전 Render·예전 Supabase)는 버리고 Spring `backend/`를 그대로 새로 배포한다.
지금 구성: **Supabase 새 프로젝트(서울, Session pooler)** · **Upstash Redis** · **Render `happiness-api`**(Docker, root `backend`, Free, 싱가포르,
`https://happiness-api-tkvi.onrender.com`, "Public Git Repository"로 만들어 **push 자동 배포 없음** — Manual Deploy) · **Vercel `frontend`**.
`render.yaml` Blueprint는 쓰지 않았다(서비스 3개가 같이 생기므로).

### 무료 한도표 (숫자는 각 서비스 가격 페이지 기준, 바뀔 수 있음 — "확인 필요"는 이번 세션에서 직접 확인 못 한 것)
| 서비스 | 무료 한도 | 우리 사용 | 위험 |
|---|---|---|---|
| Render Free | 512MB RAM, 워크스페이스 합계 월 750시간, 15분 무요청 시 잠듦, 대역폭 월 100GB(확인 필요) | API 1개 상시 ≈ 730시간 | 서비스를 2개 이상 상시로 깨우면 한도 초과 → **운영 API만 keepalive**. `render.yaml`의 `happiness-api-ts`·`happiness-admin-api`는 만들지 않거나 잠들게 둔다 |
| Supabase Free | DB 500MB, Storage 1GB, 대역폭 5GB(확인 필요), 7일 무사용 일시정지, 프로젝트 2개 | 사진 원본이 Storage에 쌓임 | Storage가 먼저 찬다 → 업로드 2048px 축소(아래) |
| Upstash Free | 명령 월 50만 회(예전 일 1만 회 — 확인 필요), 256MB | 요청마다 IP 차단 확인 + 로그인 요청마다 블랙리스트 확인 | 아래 "Redis 명령 줄이기" |
| Vercel Hobby | 무료, 대역폭 월 100GB | 웹 | **상업적 사용 불가**(약관). 수익이 생기면 Cloudflare Pages로(위 4·5번, job 준비됨) |
| Cloudflare Pages | 무료, 빌드 월 500회, 대역폭 무제한 | 미사용(대안) | — |
| GitHub Actions | 공개 저장소 무료 | CI·keepalive(10분마다) | 60일 커밋 없으면 예약 실행 정지 |

### 이번에 바꾼 코드
- **업로드 축소**: 웹 `services/uploadApi.js`가 올리기 전에 canvas로 긴 변 2048px·품질 0.85(JPEG/PNG/WEBP, 더 커지면 원본), 서버 `common/util/UploadImageShrinker`가
  `/api/upload/image`에서 한 번 더(Thumbnailator, JPEG/PNG만 — 기본 ImageIO는 WebP를 못 읽어 원본). 새 의존성 없음. `/photos/upload`는 원래 1024 변형만 저장. 테스트 3개.
- **Redis 명령 줄이기**: `IpBlockFilter`가 모든 요청(OPTIONS 제외)마다 `hasKey("ipblock:"+ip)`를 불렀다. 그런데 **이 키를 쓰는 코드가 앱·어드민·apps/api 어디에도 없다**(grep 0건)
  → 항상 없는 키를 묻는 낭비. 차단 안 된 IP도 60초 기억하게 해 IP당 분당 최대 1회로. 근거 수치: 화면 하나에 API 5~10회 → 예전엔 화면당 Redis 5~10회 + 로그인이면 블랙리스트 5~10회,
  keepalive만으로 하루 144회. 바꾼 뒤 IP 차단 확인은 방문자당 분당 1회. 블랙리스트 확인(`JwtAuthenticationFilter`)은 로그아웃 토큰 차단이라 그대로 둔다.
- **keepalive**: 대상 = Variable `KEEPALIVE_URL` 하나(→ `https://happiness-api-tkvi.onrender.com/actuator/health`로 설정). health는 DB도 확인하므로 Supabase 일시정지도 막는다.
  예전엔 실패해도 경고만 남겨 **API가 죽어 있어도 Actions가 초록**이었다 → 30초 뒤 한 번 더 시도하고 그래도 아니면 실패(빨강, GitHub가 메일로 알림).

### 잠들면 배치는?
`@Scheduled`는 서버가 깨어 있을 때만 돈다. Render 서버 시간대는 UTC라 cron도 UTC 기준(02:00 UTC = 한국 11:00).
- 예약 만료 `BookingBatchService` 매일 02:00, 약속 완료 `MeetBatchService` 03:00, 납품 만료 정리 `DeliverySetService` 매시 — 놓치면 다음 회차에 지난 것까지 한꺼번에 처리(날짜 조건이라 따라잡음).
- 모임 상태 전환 `GatheringBatchService` 5분마다 — 잠든 동안 "모집 마감·시작·종료"가 늦어진다. keepalive가 대부분 막지만 GitHub 예약 실행은 수 분 늦을 수 있다.

### Storage 사용량 보는 곳
Supabase 대시보드 › 프로젝트 › **Settings › Usage**(또는 왼쪽 Usage 메뉴) — Database size·Storage size·Egress. Storage › 버킷 `images`에서 폴더별 파일도 볼 수 있다.

### 사용자 대시보드 순서 (각 단계: 확인 방법 / 되돌리기)
1. **Render 비밀값 4개**(`DATABASE_URL`·`REDIS_URL`·`SUPABASE_ANON_KEY`·`SUPABASE_SERVICE_ROLE_KEY`) 넣고 Save, rebuild, and deploy
   → 확인: `https://happiness-api-tkvi.onrender.com/actuator/health`가 `{"status":"UP"}` / 되돌리기: Environment에서 값 수정 후 재배포.
2. **Vercel 웹 배포**(본인 확인 코드는 사용자) → 확인: 배포 URL에서 둘러보기가 열림 / 되돌리기: 프로젝트 삭제.
3. **웹 ↔ API 연결**: Vercel 환경 변수 `REACT_APP_API_URL=https://happiness-api-tkvi.onrender.com/api` 후 Redeploy, Render `CORS_ALLOWED_ORIGINS`·`FRONTEND_URL` = Vercel 주소 후 재배포
   → 확인: 회원가입·로그인 / 되돌리기: 변수 삭제(코드 기본값 `api.happiness.io.kr`로 돌아감).
4. **keepalive**: GitHub › Settings › Variables › `KEEPALIVE_URL` = health 주소 → 확인: Actions › Keep-alive › Run workflow가 초록 / 되돌리기: 변수 삭제.
5. **스모크**: Actions › Smoke(수동, 웹·API 주소 입력) → 초록.
6. (선택) **도메인**: Render Custom Domain `api.happiness.io.kr`, Vercel에 `happiness.io.kr` → Cloudflare DNS CNAME 변경 / 되돌리기: CNAME 원복.
7. **마지막에** 예전 것 정리: Railway 서비스 중지·삭제, 예전 Render 서비스 삭제. 예전 Supabase 프로젝트는 지우지 않는다(사용자 결정 전). 지우기 전엔 언제든 되돌릴 수 있다.
