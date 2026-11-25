# 실행 프롬프트 — TS 전환 보안 누락 점검·보완 (2026-11-25)

## 붙여 넣을 프롬프트
```
DESIGN_PROMPTS/planning/PROMPT_ts-security-parity.md 대로 Spring에 있던 보안 처리 중 새 API(apps/api)에서 빠진 것을 보완하고,
Spring·새 API 양쪽 계약 테스트로 같은 동작을 확인해줘. 응답 형식은 Spring과 같게.
```

## 점검 결과 (Spring 앱·어드민 ↔ 새 API 앱·어드민 진입점)

| Spring 보안 처리 | 새 API | 근거 |
|---|---|---|
| 인증: JWT 필터 — 블랙리스트(jti)·ACCESS 토큰만·매 요청 회원 재조회 | ✅ 있음 | `auth/auth.guard.ts` |
| JWT 운영 기본 키·짧은 키면 실행마다 난수 키 | ✅ 있음 | `auth/jwt.service.ts` |
| 서명 알고리즘 고정(HS*) | ✅ 있음 | `jwt.verify(... algorithms)` |
| 기본 거부(`anyRequest().authenticated()`) + 공개 경로 목록 | ✅ 있음(전역 가드 + `@Public`) | 계약 테스트 무토큰 401 |
| `/api/admin/**` WM/SA | ✅ 있음(`@Roles`) — 관리자 감사 로그도 | `series`·`report` 컨트롤러, `admin-audit.interceptor.ts` |
| 로그인 5회 실패 15분 잠금·더미 해시 비교 | ✅ 있음 | `auth/login-attempt-limiter.ts` |
| 기능별 속도 제한(계정 찾기·예약·분석·뉴스레터·신고·챗봇·납품 비밀번호·스팟) | ✅ 있음 | 각 서비스 429 |
| XSS 필터(쿼리·헤더 HTML 이스케이프) | ✅ 있음 | `xss-query.middleware.ts` |
| 업로드: 형식 4종·20MB·folder 경로 순회 차단 | ✅ 있음 | `storage/*` |
| 클라이언트 IP(`APP_CLIENT_IP_HEADER` → XFF 첫 값) | ✅ 있음 | `common/client-ip.ts` |
| 처리 못 한 예외는 일반 문구 500(스택 비공개) | ✅ 있음 | `common/exception.filter.ts` |
| 개인정보(연락처 제거·마스킹), IDOR 검사 | ✅ 있음 | 계약 테스트 |
| **전역 속도 제한** `RateLimitFilter` — IP당 100회/60초(토큰 버킷), 429 `ApiResponse(R001)` | ❌ **없음** | 코드에 없음 |
| **IP 차단** `IpBlockFilter` — Redis `ipblock:{ip}` 있으면 403, 10초 로컬 캐시, Redis 장애 시 통과 | ❌ **없음** | 코드에 없음 |
| **스캐너 차단** `ApiAccessInterceptor` — User-Agent에 sqlmap·nikto·nmap·masscan·zgrab이면 `/api/**` 403 | ❌ **없음** | 실측: `curl -A sqlmap` Spring 403 / 새 API 200 |
| **보안 응답 헤더** — nosniff, X-XSS-Protection 0, `Cache-Control: no-cache, no-store…`·Pragma·Expires, X-Frame-Options SAMEORIGIN, CSP, Referrer-Policy, HSTS(HTTPS일 때) | ❌ **없음**(+ `X-Powered-By: Express` 노출) | 실측: 같은 요청의 응답 헤더 비교 |
| CORS 허용 헤더 목록(Authorization·Content-Type·X-Trace-Id·X-Requested-With·Accept·X-Device-Id), 노출 X-Trace-Id, maxAge 3600 | ⚠️ 느슨함(`allowedHeaders: '*'`) | `main.ts` |
| 어드민 Spring — Spring Security 기본 헤더(nosniff·no-store 캐시·SAMEORIGIN·HSTS) | ❌ **없음** | `admin-main.ts` |

양쪽 다 같은 한계(이번 범위 밖, 기록만): 업로드 형식을 클라이언트가 보낸 MIME으로만 판단(파일 내용 서명 미검사), 속도 제한·잠금이 인메모리(인스턴스가 여럿이면 따로 셈).

## 작업
1. `common/security-headers.ts` — Spring과 같은 헤더(앱: CSP·Referrer-Policy 포함, 어드민: Spring Security 기본값만), HSTS는 HTTPS(`req.secure` 또는 `X-Forwarded-Proto: https`)일 때만 `max-age=31536000; includeSubDomains`, `x-powered-by` 끔. `main.ts`·`admin-main.ts`에 적용.
2. `common/rate-limit.ts` — IP 토큰 버킷(용량·보충 `RATE_LIMIT_CAPACITY`·`RATE_LIMIT_REFILL_TOKENS`·`RATE_LIMIT_REFILL_SECONDS`, 기본 100·100·60), OPTIONS 제외, 429 `ApiResponse(R001 "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.")`(Spring ErrorCode와 같은 값), 오래된 버킷 정리. 버킷 계산은 순수 함수로 단위 테스트.
3. `common/ip-block.ts` — Redis `ipblock:{ip}`(기존 TokenStore의 Redis 연결 재사용), 10초 로컬 캐시, Redis 장애 시 통과, 403 `ApiResponse(B001)`.
4. `common/scanner-block.ts` — `/api/**`에서 User-Agent 차단 목록이면 403.
5. CORS를 Spring과 같은 목록으로.
6. 계약 테스트(Spring·새 API 양쪽): 보안 헤더, `X-Powered-By` 없음, 스캐너 403, IP 차단 403(Redis에 키 넣고), 단위: 토큰 버킷.
7. 문서: `apps/api/README.md`, CLAUDE.md, PROJECT_MEMORY, 작업 큐.
