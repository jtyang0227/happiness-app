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
| 아직 Spring: 스팟, 배치, 7단계(추천사 등), `DELETE /api/auth/member/{id}`(탈퇴 — 전 모듈 연쇄 삭제라 7단계) | 프록시 |

계약 테스트 준비용 DB 조작(`test/contract/db.ts` — 관리자 승격·전화번호·재설정 토큰 넣기)은 `DATABASE_URL`을 쓴다(두 서버가 같은 DB).

## Spring 동작을 그대로 옮긴 것 (놓치기 쉬움)
- **XSS 필터**: Spring `XssProtectionFilter`가 모든 쿼리·폼 파라미터와 헤더 값을 `escapeHtml4`로 바꿔 컨트롤러에 넘긴다. 여기서도 같은 표(`common/escape-html4.ts`, commons-text 1.12.0에서 자동 추출)로 `xssQueryMiddleware`(쿼리)·`header()`(헤더)·Apple 폼 값에 적용. 프록시로 넘길 때는 원래 URL로 되돌린다. 결과: `q=A&B` 검색은 `A&amp;B`로 비교, Apple 콜백의 이름 JSON은 깨져서 늘 "Apple 사용자".
- Apple `id_token`은 서명을 검증하지 않고 페이로드만 읽는다(Spring과 같음 — 보안상 위험, 별도 작업으로 고칠 것).

## Spring과 의도적으로 다른 점
- **WebP 사진 업로드**(`/api/photos/upload`): Spring은 허용 형식에 WebP를 넣었지만 ImageIO에 WebP 리더가 없어 항상 500 "이미지를 읽을 수 없습니다". 여기서는 sharp로 읽어 jpg로 저장한다.
- 사진 업로드의 리사이즈 결과 바이트·대표색은 Thumbnailator와 sharp가 달라 한두 단계 차이 날 수 있다(단색 이미지는 같음). EXIF 회전은 양쪽 모두 적용하지 않는다.
- 정렬 동점 순서: Spring은 정렬 컬럼만 주고 DB에 맡겨 동점(예: displayOrder 모두 null) 순서가 일정하지 않다. 여기서는 같은 방향의 id를 2차 정렬로 붙여 고정.
- 깨진 JSON 본문·숫자가 아닌 경로 변수: Spring은 처리 못 한 예외로 500, 여기서는 400 C002.
- 로그아웃 때 Redis가 죽어 있으면 Spring은 500(`TokenBlacklistService`에 예외 처리 없음), 여기서는 다른 Redis 사용처처럼 통과.
- `@PreAuthorize`(WM/SA) 거부: Spring은 `AuthorizationDeniedException`을 전역 핸들러가 못 잡아 **500 C001**, 여기서는 403 B001. 계약 테스트는 "거부됨"만 공통으로 확인한다.
- `LocalDateTime` 응답은 Jackson처럼 소수 초 끝 0을 지운다(`.500` → `.5`). 단 Prisma `Date`가 밀리초까지라 Spring이 저장한 마이크로초는 잘린다.
- 포트폴리오 구성 JSON: Jackson `readTree`는 뒤에 붙은 쓰레기(`{"blocks":[]} xyz`)를 무시하고 받아들이지만 여기서는 형식 오류 400. `1.0` 같은 실수는 Jackson이 텍스트 설정에 "1.0"으로, 여기서는 "1"로 넣는다.
- 필수 쿼리 파라미터 누락(`members/search`의 `q`, `password-reset/verify`의 `token`)은 Spring처럼 500으로 둔다.
