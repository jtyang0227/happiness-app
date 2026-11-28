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

- 빌드(`npm run build`)도 `DATABASE_URL`이 있어야 한다 — `prisma generate`는 접속하지 않지만 `prisma.config.ts`가 값을 요구한다(CI는 자리 표시 값).

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
| 사진 조회: `GET /api/photos`(필터·정렬·키워드 pg_trgm→LIKE·태그·조회순·page opt-in), `/suggestions`, `/{id}`, `/{id}/similar`, `/{id}/tags·likes·shares`, `/saves/{memberId}`, `/genres/stats` | `photo-read.test.ts` — `{status,data}` 래퍼, 키 `liked`·`saved` |
| 사진 쓰기: `POST /api/photos`, `PUT /{id}`, `PUT /reorder`, 태그 추가·삭제, 좋아요·저장(취소 포함)·공유 | `photo-write.test.ts` — 오류 본문 `{status:'error',message}`(`RawBodyError`) |
| `GET /api/feed` | `photo-write.test.ts` |
| `POST /api/photos/upload`(4단계 변형 1024/512/256/128 + 색 분석, sharp) | `photo-upload.test.ts` |
| `POST /api/upload/image`(multipart, Supabase Storage) | `upload.test.ts` — `scripts/fake-supabase.mjs`(dev-env.sh가 띄움)로 성공 경로까지 양쪽 비교. 저장소 요청 경로의 키는 Spring처럼 `%2F` 인코딩 |
| `DELETE /api/photos/{id}`(연관 기록 + 저장소 변형 4개), `POST /api/photos/{id}/auto-tags`(키워드 + Google Vision `GOOGLE_VISION_API_KEY`) | `photo-write.test.ts` — 사진 삭제 시 댓글·신고는 Spring처럼 남는다 |
| `/api/moodboards/**`(공유 보기 `GET /shared/{token}`만 공개) | `moodboard.test.ts` |
| `/api/series/**`(목록·탐색·상세 공개, 초안은 본인·관리자만), `PUT /api/admin/series/{id}/featured` | `series.test.ts` — 없는 작업·권한 거부 등은 Spring처럼 본문 없는 404/403/400(`EmptyResponseError`) |
| `GET /api/portfolio/{p}`·`/{p}/config`(공개), `PUT /{p}/template`(본인·WM/SA, 블록·스타일 검증기 `portfolio-layout.validator.ts`) | `portfolio.test.ts` — 정규화 결과의 설정 키 순서는 Spring(`Map.of`)이 실행마다 달라 JSON 비교만 의미 있음 |
| `POST /api/inquiry`(공개, 작가 알림 메일 + `INQUIRY_SENT` 분석), `GET inbox·inbox/unread-count`, `PUT {id}/read`, `DELETE {id}` | `inquiry.test.ts` |
| `/api/booking/**`(달력·예약 생성 공개, IP당 분당 10회 — 사설 IP는 소켓 주소로 묶음), 설정(JSON 키 `active`)·차단 날짜·확정/거절/취소·체크리스트·수금 | `booking.test.ts` — 차단 날짜 저장 실패는 Spring처럼 사유 무관 409 |
| `/api/delivery/**`(토큰 경로 공개 — 비밀번호 세트는 본문 password, 토큰당 5회 실패 시 15분 429) | `delivery.test.ts` — 같은 사진을 두 번 보내면 Spring(Hibernate merge)처럼 한 행·마지막 순서, 응답 photoCount는 보낸 개수. 만료 세트 정리 배치(매시)는 6단계에서 |
| `/api/meets/**`(전부 인증, 요청자·수신자 외 403) | `meet.test.ts` — `updated_at`은 Hibernate처럼 값이 바뀔 때만 갱신. 좌표는 Jackson이 `37.0`, 여기선 `37`로 직렬화(값은 같음) |
| `/api/analytics/**`(`track`만 공개 — 작업·사진은 실제 작가 소유일 때만 기록, visitorToken 분당 60회) | `analytics.test.ts` — 저장 실패 시 Spring은 예외를 잡지만 트랜잭션이 rollback-only라 500, 여기서도 500 |
| `/api/gatherings`(목록·상세 공개, CRUD·참여/대기자·취소 시 승격·모집 마감·참여자), `/api/gatherings/notifications/**`, `/api/gatherings/{id}/place-poll/**` | `gathering.test.ts` — 알림 응답의 읽음 키는 Lombok 규칙대로 `read` |
| `/api/gatherings/{id}/posts·album`(공개), 게시물 작성·삭제·좋아요·댓글, `instagram-candidates·instagram-share` | `gathering-post.test.ts` |
| `/api/spots/**`(목록·상세·근처 중복 공개, 생성 하루 20개), `GET·PUT /api/photos/{id}/spot` | `spot.test.ts` — 미리보기·사진 수는 공개 프로필 작가 사진만 |
| 배치 4개(`batch/batch.service.ts`, Spring과 같은 cron — 납품 만료 매시, 예약 02:00, 약속 03:00, 모임 5분) | `LEGACY_API_URL`이 있으면 기본 꺼짐(중복 알림 방지), `BATCH_ENABLED=true`로 켬. `node scripts/run-batch.mjs <이름|all>`로 즉시 실행 — 시드 데이터로 4개 모두 확인 |
| `/api/testimonials·press·pricing·brands/**`(공개 GET `/member/{id}`), `/api/newsletter/**`, `/api/assistant/chat·chat/workspace`(Gemini) | `showcase.test.ts` — 숫자 칸에 글자를 넣으면 Spring `Integer.parseInt` 예외 그대로 400 C002 `For input string: "…"`, 패키지·브랜드 수정 대상이 없으면 500(`RuntimeException`) |
| `DELETE /api/auth/member/{id}`(본인·관리자, Spring과 같은 범위로 연쇄 삭제 — 팔로우·예약·납품·약속·모임·추천사 등은 Spring도 남긴다), `GET /api/hello` | `member-delete.test.ts` |
| **Spring 경로 0개** — Spring 컨트롤러 194개 경로가 모두 여기 있다(정적 대조). `LEGACY_API_URL`을 죽은 주소로 둔 인스턴스에서 계약 테스트 92개 전부 통과(프록시 없이 동작 확인). 컷오버 전까지 프록시는 안전망으로 둔다 | `DELETE /api/auth/member/{id}`(탈퇴 — 전 모듈 연쇄 삭제라 7단계) | 프록시 |

계약 테스트 준비용 DB 조작(`test/contract/db.ts` — 관리자 승격·전화번호·재설정 토큰 넣기)은 `DATABASE_URL`을 쓴다(두 서버가 같은 DB).

## Spring 동작을 그대로 옮긴 것 (놓치기 쉬움)
- **XSS 필터**: Spring `XssProtectionFilter`가 모든 쿼리·폼 파라미터와 헤더 값을 `escapeHtml4`로 바꿔 컨트롤러에 넘긴다. 여기서도 같은 표(`common/escape-html4.ts`, commons-text 1.12.0에서 자동 추출)로 `xssQueryMiddleware`(쿼리)·`header()`(헤더)·Apple 폼 값에 적용. 프록시로 넘길 때는 원래 URL로 되돌린다. 결과: `q=A&B` 검색은 `A&amp;B`로 비교, Apple 콜백의 이름 JSON은 깨져서 늘 "Apple 사용자".
- Apple `id_token`은 서명을 검증하지 않고 페이로드만 읽는다(Spring과 같음 — 보안상 위험, 별도 작업으로 고칠 것).

## Spring과 의도적으로 다른 점
- **WebP 사진 업로드**(`/api/photos/upload`): Spring은 허용 형식에 WebP를 넣었지만 ImageIO에 WebP 리더가 없어 항상 500 "이미지를 읽을 수 없습니다". 여기서는 sharp로 읽어 jpg로 저장한다.
- **스팟 목록·작업 탐색**(`GET /api/spots`, `GET /api/series/discover`): Spring은 PostgreSQL에서 비어 있는 문자열 조건(`region`·`q`·`location`·`shootType`)을 `bytea`로 묶어 500(`text ~~ bytea`, `lower(bytea)`)을 냈다 — 2026-11-24 Spring 쪽 JPQL에 `CAST(:x AS String)`을 넣어 고쳤다(운영 배포 b2c07c0 이후 커밋). 이제 양쪽 같은 결과, 계약 테스트도 분기 없음. (확인 함정: `./gradlew bootRun`만 하면 dev 프로필 H2라 재현되지 않는다 — `dev-env.sh`의 PG 환경 변수로 띄울 것.)
- 사진 업로드의 리사이즈 결과 바이트·대표색은 Thumbnailator와 sharp가 달라 한두 단계 차이 날 수 있다(단색 이미지는 같음). EXIF 회전은 양쪽 모두 적용하지 않는다.
- 정렬 동점 순서: Spring은 정렬 컬럼만 주고 DB에 맡겨 동점(예: displayOrder 모두 null) 순서가 일정하지 않다. 여기서는 같은 방향의 id를 2차 정렬로 붙여 고정.
- 깨진 JSON 본문·숫자가 아닌 경로 변수: Spring은 처리 못 한 예외로 500, 여기서는 400 C002.
- 로그아웃 때 Redis가 죽어 있으면 Spring은 500(`TokenBlacklistService`에 예외 처리 없음), 여기서는 다른 Redis 사용처처럼 통과.
- `@PreAuthorize`(WM/SA) 거부: Spring은 `AuthorizationDeniedException`을 전역 핸들러가 못 잡아 **500 C001**, 여기서는 403 B001. 계약 테스트는 "거부됨"만 공통으로 확인한다.
- `LocalDateTime` 응답은 Jackson처럼 소수 초 끝 0을 지운다(`.500` → `.5`). 단 Prisma `Date`가 밀리초까지라 Spring이 저장한 마이크로초는 잘린다.
- 포트폴리오 구성 JSON: Jackson `readTree`는 뒤에 붙은 쓰레기(`{"blocks":[]} xyz`)를 무시하고 받아들이지만 여기서는 형식 오류 400. `1.0` 같은 실수는 Jackson이 텍스트 설정에 "1.0"으로, 여기서는 "1"로 넣는다.
- 필수 쿼리 파라미터 누락(`members/search`의 `q`, `password-reset/verify`의 `token`)은 Spring처럼 500으로 둔다.

## 어드민 진입점 (`dist/admin-main.js`, 9단계 — happiness-admin Spring 대체)

happiness-admin `backend/`(Spring Boot 3.5)의 경로 115개를 `src/admin/**`로 옮겼다. 앱과 경로(`/api/auth/login`, `/api/admin/reports`, `/api/admin/series/{id}/featured`)·오류 형식(`{error}`)·JWT가 달라 **별도 프로세스**로 띄운다(설계·충돌 표: `DESIGN_PROMPTS/planning/PLANNING_typescript-migration.md` 4-1).

```bash
npm run build                    # 앱·어드민 Prisma 클라이언트 둘 다 생성
ADMIN_JWT_SECRET=… PRIVACY_ENCRYPTION_KEY=… npm run start:admin   # 기본 8091
ADMIN_API_BASE_URL=http://localhost:8091 npm run test:contract-admin   # 8081(Spring 어드민)에도 같은 테스트
```

- **DB 스키마**: Spring 어드민은 `DB_SCHEMA`(기본 `admin`) 스키마에 자기 표 37개를 따로 만든다 — 앱의 `public` 표가 아니다. 여기서도 `ADMIN_DB_SCHEMA`(기본 `admin`)를 따르고 Prisma 스키마를 따로 둔다(`prisma/admin/schema.prisma`, `prisma.admin.config.ts`). 갱신: `ADMIN_DATABASE_URL="postgresql://…?schema=admin" npm run prisma:pull:admin`.
- 오류: IllegalArgument 400 `{error: 메시지}`, 타입 불일치·필수값 누락·깨진 JSON·메서드 불일치 400 `{error:"잘못된 요청입니다."}`, WM 전용 거부 403, 그 밖 500 `{error:"서버 오류가 발생했습니다."}`(없는 경로도 500). 인증이 없으면 경로와 상관없이 403 빈 본문.
- 인증: JWT(subject=이메일, `authority`, 8시간, `ADMIN_JWT_SECRET` — 앱 `JWT_SECRET`과 다름)를 검증한 뒤 **매 요청 DB에서** 상태 ACTIVE·권한 WM/SA를 다시 본다. 로그인 잠금 5회/15분(인메모리).
- 개인정보: 마스킹(`privacy/privacy-masker.ts`), 자유서술 필드 AES-256-GCM(`enc:v1:`, `PRIVACY_ENCRYPTION_KEY` — Spring과 같은 키여야 기존 암호문을 읽는다), 접속기록 해시 체인(`admin_privacy_access_logs` — 마이크로초까지 글자로 읽어 계산, 두 서버 기록이 섞여도 검증 유효). 클라이언트 IP는 `X-Forwarded-For` 첫 값(Spring `forward-headers-strategy=framework`).
- 정지 자동 해제 스케줄러(10분, 첫 실행 30초): Spring 어드민이 같은 스키마에서 돌고 있으면 `ADMIN_BATCH_ENABLED=false`.
- 신고 AI 분류(`POST /api/admin/reports/ai-triage/run`): 공식 SDK `@anthropic-ai/sdk`, Spring과 같은 요청(`claude-opus-5`, max_tokens 500, thinking disabled, effort low), 키 `ANTHROPIC_API_KEY`(없으면 건마다 실패로 센다).
- **Spring 어드민과 의도적으로 다른 점**: ① prod 프로필 `lazy-initialization=true`라 Spring은 `FieldEncryptor`가 만들어지지 않아 회원을 읽는 모든 요청(로그인 포함)이 500 — 로컬 계약 테스트는 Spring을 `SPRING_MAIN_LAZY_INITIALIZATION=false`로 띄운다. ② 예약 목록 `date` 필터: Spring은 PostgreSQL에서 500(`could not determine data type of parameter`), 여기서는 정상(`IS_SPRING`으로 구분). ③ 시스템 상태의 `dbType`은 항상 PostgreSQL(Spring은 프로필로 짐작). ④ 프로필 콘텐츠 `type` 오류 문구의 종류 순서(Spring은 `Map.of` 순서라 실행마다 다름).
- **그대로 옮긴 Spring 버그(기록)**: 배너·팝업·공지 요청 DTO의 Lombok `isActive`/`isPinned` → JSON 키 `active`/`pinned`라 어드민 화면이 보내는 `isActive`·`isPinned`는 무시되고(항상 비활성·고정 안 됨) 응답도 `active`/`pinned`라 화면 표시가 어긋난다. 피처드 등록자 id는 이메일을 Long으로 읽다 실패해 늘 null. 무드 별칭은 Spring `Map.ofEntries` 순서가 정해져 있지 않아 별칭이 둘 들어간 검색어만 결과가 갈릴 수 있다(여기서는 선언 순서).
- 로컬 Spring 어드민(계약 테스트용): happiness-admin `origin/claude/admin-planning-doc-120dha`를 `./gradlew bootJar` → `SPRING_PROFILES_ACTIVE=prod SERVER_PORT=8081 DB_URL=jdbc:postgresql://localhost:5432/happiness DB_USERNAME=happy DB_PASSWORD=happy DB_SCHEMA=admin JWT_SECRET=(ADMIN_JWT_SECRET과 같은 값) PRIVACY_ENCRYPTION_KEY=(같은 값) SPRING_MAIN_LAZY_INITIALIZATION=false java -jar app.jar`. prod 프로필엔 시드가 없어 테스트가 SQL로 관리자를 넣는다(`test/contract-admin/helpers.ts`).

## 운영 연동 — 노션 동기화 (`src/ops/`)

예약 생성·상태 변경, 앱 문의 접수를 운영자 노션 「해피니스 운영 센터」 DB로 보낸다(단방향). 환경변수가 없으면 꺼져 있고, 노션 오류는 경고 로그만 남기며 요청을 막지 않는다.

| 변수 | 설명 |
|---|---|
| `NOTION_TOKEN` | 노션 내부 통합 토큰(배포 환경변수에만, 커밋 금지) |
| `NOTION_BOOKING_DB_ID` | 「예약」 DB ID |
| `NOTION_INQUIRY_DB_ID` | 「문의」 DB ID |
| `OPS_NOTION_INCLUDE_CONTACT` | `true`일 때만 고객 전화·이메일을 보낸다(기본: 이름 마스킹, 연락처 제외) |

테스트: `npx vitest run --config vitest.ops.config.ts`. 노션 속성 표와 정기 실행 프롬프트는 `DESIGN_PROMPTS/planning/PROMPT_ops-notion-google.md`.

## 컷오버 스모크 (`scripts/smoke.mjs`, `.github/workflows/smoke.yml`)

운영에 돌려도 안전한 읽기 위주 점검(쓰기는 없는 계정의 로그인 실패 1번). 주소를 준 대상만 본다.
```bash
node scripts/smoke.mjs --api https://api.happiness.io.kr --admin-api <어드민 API> --web https://happiness.io.kr --admin-web <어드민 웹>
```
GitHub Actions › Smoke(수동 실행)에서도 같은 점검을 한다 — 클라우드 개발 세션은 운영 도메인에 접속할 수 없어서. 로컬 확인(2026-11-24): Nest 8090·8091 + `apps/web`·`apps/admin` 빌드 모두 통과, Spring 8080은 당시 작업 탐색 1건 실패(이후 Spring 수정으로 해소), Spring 어드민 8081 통과.
