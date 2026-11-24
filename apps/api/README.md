# happiness-api (NestJS + Prisma)

Spring Boot `backend/`를 기능 묶음 단위로 대체하는 TypeScript API. 계획·단계: `DESIGN_PROMPTS/planning/PLANNING_typescript-migration.md`.

- **옮긴 경로**는 여기서 처리하고, **안 옮긴 경로**는 `LEGACY_API_URL`(Spring)로 그대로 넘긴다 → 언제든 이 서버를 앞에 세워도 기능이 빠지지 않는다.
- JWT(같은 `JWT_SECRET`, HS256/384/512는 jjwt처럼 키 길이로 선택)·BCrypt·Redis 키(`rt:*`, `bl:*`)가 Spring과 같아 로그인·토큰이 두 서버 사이에서 그대로 통한다.
- DB 스키마의 주인은 아직 Hibernate. `prisma/schema.prisma`는 `prisma db pull`로 읽은 것이고 여기서 마이그레이션을 하지 않는다.

## 실행
```bash
cp .env.example .env    # 값 채우기
npm install
npm run build           # prisma generate + tsc
npm start               # :8090
```

## 계약 테스트 (Spring·Nest 양쪽에 같은 테스트)
```bash
# 1) 로컬 PostgreSQL + Redis, Spring을 같은 DB로 (스키마 생성 겸)
cd ../../backend && SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/happiness \
  SPRING_DATASOURCE_USERNAME=happy SPRING_DATASOURCE_PASSWORD=happy \
  SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver SPRING_JPA_HIBERNATE_DDL_AUTO=update \
  SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect ./gradlew bootRun
# 2) 이 서버 (LEGACY_API_URL=http://localhost:8080)
# 3) 같은 테스트를 두 서버에
API_BASE_URL=http://localhost:8080 npm run test:contract
API_BASE_URL=http://localhost:8090 npm run test:contract
API_BASE_URL=http://localhost:8090 OTHER_API_BASE_URL=http://localhost:8080 npm run test:contract   # 서버 간 호환
```

## 옮긴 경로 (2026-11-24)
| 경로 | 비고 |
|---|---|
| `GET /actuator/health` | 배포 헬스체크 주소 유지 |
| `POST /api/auth/signup·login·refresh·logout`, `GET /api/auth/check-email·check-profile-name·member/{id}` | `auth.test.ts` |
| `PUT /api/auth/member/{id}/profile·password`, `GET member/{id}/stats`, `GET members`(WM/SA, 마스킹), `GET members/search`(래퍼 없는 배열), `PUT member/{id}/role`(WM/SA) | `member.test.ts` |
| `POST /api/auth/find-email`, `POST password-reset/request·confirm`, `GET password-reset/verify` | `member.test.ts` — 메일은 `MAIL_*`(nodemailer), 없으면 개발에서만 링크 로그 |
| `POST /api/auth/oauth/kakao·google·naver`, `POST oauth/apple/callback`(폼 → 302) | `oauth.test.ts` — Apple만 오프라인 확인, 나머지 3개는 외부 공급자 호출이라 실패 응답 모양만 |
| `GET·POST /api/photos/{id}/comments`(읽기 공개), `DELETE /api/comments/{id}`, `/api/follows/**`, `/api/blocks/**` | `social.test.ts` |
| `POST /api/photos/{id}/report`·`/api/comments/{id}/report`(201), `/api/photos/reports/mine/**`, `/api/admin/reports/**`(WM/SA, Spring `PageImpl` 모양 그대로) | `report.test.ts` — 관리자 경로는 `AdminAuditInterceptor`가 `security_audit_log`(ADMIN_API)에 기록 |
| 아직 Spring: `DELETE /api/auth/member/{id}`(탈퇴 — 전 모듈 연쇄 삭제라 7단계) | 프록시 |

계약 테스트 준비용 DB 조작(`test/contract/db.ts` — 관리자 승격·전화번호·재설정 토큰 넣기)은 `DATABASE_URL`을 쓴다(두 서버가 같은 DB).

## Spring 동작을 그대로 옮긴 것 (놓치기 쉬움)
- **XSS 필터**: Spring `XssProtectionFilter`가 모든 쿼리·폼 파라미터와 헤더 값을 `escapeHtml4`로 바꿔 컨트롤러에 넘긴다. 여기서도 같은 표(`common/escape-html4.ts`, commons-text 1.12.0에서 자동 추출)로 `xssQueryMiddleware`(쿼리)·`header()`(헤더)·Apple 폼 값에 적용. 프록시로 넘길 때는 원래 URL로 되돌린다. 결과: `q=A&B` 검색은 `A&amp;B`로 비교, Apple 콜백의 이름 JSON은 깨져서 늘 "Apple 사용자".
- Apple `id_token`은 서명을 검증하지 않고 페이로드만 읽는다(Spring과 같음 — 보안상 위험, 별도 작업으로 고칠 것).

## Spring과 의도적으로 다른 점
- 깨진 JSON 본문·숫자가 아닌 경로 변수: Spring은 처리 못 한 예외로 500, 여기서는 400 C002.
- 로그아웃 때 Redis가 죽어 있으면 Spring은 500(`TokenBlacklistService`에 예외 처리 없음), 여기서는 다른 Redis 사용처처럼 통과.
- `@PreAuthorize`(WM/SA) 거부: Spring은 `AuthorizationDeniedException`을 전역 핸들러가 못 잡아 **500 C001**, 여기서는 403 B001. 계약 테스트는 "거부됨"만 공통으로 확인한다.
- 필수 쿼리 파라미터 누락(`members/search`의 `q`, `password-reset/verify`의 `token`)은 Spring처럼 500으로 둔다.
