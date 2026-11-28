# 예매 일정 모듈 v3 — 알림 배지 · 구독 캘린더 · 이메일 알림 (2026-11-28)

v2(`PLANNING_ticket-module-v2.md`)에서 "남은 것"으로 둔 세 가지를 마무리한다. 자동 예매·대기열 우회는 여전히 범위 밖.

## 1. 문제 (코드 대조)
| # | 지금 | 영향 |
|---|---|---|
| 1 | 읽지 않은 예매 알림 수 API(`/tickets/notifications/unread-count`)는 있지만 웹 어디에서도 부르지 않는다 | 알림이 와도 `/tickets/alerts`를 직접 열어야만 안다 |
| 2 | 캘린더는 단계 하나짜리 .ics 다운로드뿐 | 일정이 바뀌면 파일을 다시 받아야 하고, 켠 알림이 여러 개면 하나씩 받아야 한다 |
| 3 | 알림은 인앱만 | 앱을 열지 않으면 10분 전 알림을 놓친다 |

## 2. 유저 스토리 · 수용 기준
**US1 알림 배지** — 로그인 회원은 어느 화면에서든 새 예매 알림이 있는지 본다.
- AC1-1 PC 헤더에 🔔 버튼(로그인 시) → `/tickets/alerts`, 읽지 않은 수가 있으면 빨간 배지(99+).
- AC1-2 모바일은 하단 "프로필" 탭에 같은 배지, 프로필 화면 위쪽에 "읽지 않은 예매 알림 n건" 줄(있을 때만).
- AC1-3 60초마다 다시 센다(탭이 숨겨져 있으면 건너뜀). 실패는 조용히 0으로 두지 않고 마지막 값을 유지.

**US2 구독 캘린더** — 켠 알림 전부를 한 번 등록해 두면 기기 캘린더가 알아서 갱신한다.
- AC2-1 `POST /api/tickets/me/calendar-feed` → 새 비밀 링크 발급(이전 링크는 즉시 무효). 응답 `{url, webcalUrl, createdAt}` — **링크는 이때만 보인다**(DB엔 SHA-256 해시만).
- AC2-2 `GET /api/tickets/me/calendar-feed` → `{active, createdAt, lastAccessedAt}`, `DELETE` → 끄기(204).
- AC2-3 공개 `GET /api/tickets/calendar/{token}.ics` → 그 회원이 켠 알림의 단계 전부(지난 지 7일 넘은 것 제외, 최대 200개)를 VEVENT 여러 개로. 모르는 토큰·꺼진 링크 404. `last_accessed_at` 갱신(5분에 1번만 씀). 래퍼 없이 `text/calendar`.
- AC2-4 피드엔 공개 정보(공연명·단계·시각·장소·링크)만. 회원 이름·이메일 없음. `X-PUBLISHED-TTL:PT1H`·`REFRESH-INTERVAL`.

**US3 이메일 알림** — 원하면 같은 알림을 메일로도 받는다.
- AC3-1 알림 설정에 `email`(기본 꺼짐). `PUT …/notification {email:true}`, 응답·`GET`에 `email`, `mailAvailable`(서버에 `MAIL_HOST`가 있는지).
- AC3-2 처리기가 인앱 알림을 **새로 만든 경우에만**(dedupe 선점 성공) 메일 1통 — 같은 알림이 두 번 메일로 가지 않는다. 일정 변경·취소 고지도 같음.
- AC3-3 메일 실패·미설정은 작업을 실패시키지 않는다(인앱은 이미 저장됨). 본문은 HTML 이스케이프, 받는 사람은 회원 본인 이메일만, 로그엔 이메일을 남기지 않는다.

## 3. 데이터 (스키마 주인 = Spring 엔티티 → Hibernate → `prisma db pull`)
- `ticket_notification_preferences.email_enabled BOOLEAN`(nullable, null=false)
- 새 테이블 `ticket_calendar_feeds(id, member_id UNIQUE, token_hash VARCHAR(64) UNIQUE, created_at, last_accessed_at)`

## 4. 트레이드오프
- 토큰을 해시로만 저장 → 링크를 다시 볼 수 없다(잃어버리면 새로 발급). 비밀번호 재설정 토큰과 같은 기준, 캘린더 앱에 한 번 넣으면 끝이라 감수.
- 피드 TTL 1시간 — 구글 캘린더는 이 값을 무시하고 수 시간~하루 간격으로 가져간다. 화면에 "캘린더 앱에 따라 반영이 몇 시간 늦을 수 있어요"를 적고, 10분 전 알림은 인앱·메일이 맡는다.
- 메일은 작업 처리 안에서 보낸다(별도 큐 없음). SMTP가 느리면 작업 임대(60초) 안에서 끝나야 하므로 발송에 10초 제한.

## 5. 검증 계획
단위(다중 VEVENT ics) · 계약(피드 발급→조회→재발급 시 옛 링크 404→끄기, 이메일 설정 왕복, Spring은 건너뜀) · 백엔드 `./gradlew test`(엔티티) · 웹 typecheck/test/build · Playwright 390/1280(배지·구독 카드·메일 토글).
