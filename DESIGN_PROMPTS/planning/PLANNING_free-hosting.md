# 무료 호스팅 전환 계획 (2026-11-06)

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
