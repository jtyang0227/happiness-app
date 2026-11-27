# 예매 일정 모듈 v2 — 고도화 기획 (2026-11-27)

> v1(`PLANNING_server-time.md`, PR #10)은 서버 쪽 규칙(일정 이력·작업 큐·시간 가드·오픈 상태·알림 작업)을 갖췄다.
> v2는 **"만든 기능에 사람이 닿지 못하는 곳"**을 메운다. 자동 예매·대기열 우회는 v2에서도 만들지 않는다.

## 1. 분석 — 지금 코드에서 막힌 곳 (코드 대조)

| # | 빈틈 | 근거 | 영향 |
|---|---|---|---|
| G1 | **알림함 화면이 없다** | 서버 `GET /api/tickets/notifications`·`PUT …/read`는 있는데 웹에 호출하는 곳이 0 | 알림이 와도 사용자가 볼 방법이 없다 — 알림 기능 전체가 죽은 상태 |
| G2 | **공개 일정 목록 화면이 없다** | `GET /api/tickets/sessions`는 있으나 웹은 `/tickets/:id`만 | 주소를 모르면 카운트다운에 들어갈 수 없다 |
| G3 | **내가 켠 알림 목록이 없다** | 설정은 단계별 `GET/PUT …/phases/:id/notification`뿐 | 무엇을 켜 놨는지 확인·한 번에 끄기 불가 |
| G4 | **안 읽은 수·모두 읽음 API가 없다** | `notifications` 응답 안에만 unreadCount, 일괄 읽음 없음 | 배지·"모두 읽음" 구현 불가 |
| G5 | **DEAD 작업을 다시 돌릴 수 없다** | 모니터는 `dead` 개수만 보여 주고 목록·재시도 API 없음 | 일시 장애로 죽은 재계산 작업을 DB를 직접 고쳐야 살림 |
| G6 | **어드민에서 기존 공연에 단계를 추가할 수 없다** | 서버 `POST /sessions/:id/phases`는 있으나 화면은 "새 공연+단계"만 | 1차·2차 예매 같은 다단계 공연을 화면으로 못 만듦 |
| G7 | **캘린더로 가져갈 수 없다** | 인앱 알림만, 이메일·푸시 없음(v1 범위) | 앱 밖에서 일정을 잊기 쉬움 — 표준 iCalendar(.ics)로 기기 캘린더 알림을 쓰게 한다 |

v2에서 제외(근거): 이메일·푸시 발송(메일 설정 미개통·푸시 인프라 없음 — v3), 예매처 자동 확인(SITE_CHECK, 사이트 약관·차단 위험), 모바일 앱 화면, `frontend/`(컷오버 후 폐기 예정).

## 2. 범위와 수용 기준(AC)

### 서버 (Nest `apps/api/src/ticket`, 새 테이블 없음)
- **AC1** `GET /api/tickets/notifications/unread-count` → `{count}` (로그인).
- **AC2** `POST /api/tickets/notifications/read-all` → `{updated}` — 내 알림만.
- **AC3** `GET /api/tickets/me/alerts` → 켠 알림 목록 `[{phaseId, sessionId, sessionTitle, phaseName, scheduledAt, scheduleStatus, openStatus, offsets}]`, 예정 시각 오름차순, 지난 지 24시간 넘은 단계는 제외.
- **AC4** `GET /api/tickets/phases/:id/calendar.ics` (공개) → `text/calendar`. UID는 단계 id로 고정, `SEQUENCE` = schedule_revision(일정이 바뀌면 다시 받은 파일이 기존 일정을 덮어씀), DTSTART UTC, 10분 전 VALARM, 취소면 `STATUS:CANCELLED`. 줄 75바이트 접기·CRLF·텍스트 이스케이프(RFC 5545).
- **AC5** `GET /api/admin/tickets/jobs?status=DEAD|PENDING|CLAIMED&limit=` → 작업 목록(마지막 오류 포함).
- **AC6** `POST /api/admin/tickets/jobs/:id/retry` → DEAD만 PENDING으로(attempts 0, run_at 지금, last_error 유지). DEAD가 아니면 409 `JOB_NOT_DEAD`. 알림 작업은 처리기가 보낼 때 유예 시간을 다시 검사하므로 늦은 알림은 자동으로 SKIPPED — 재시도해도 늦은 알림이 나가지 않는다.

### 웹 (`apps/web`)
- **AC7** `/tickets` 공개 목록: 공연 카드(제목·장소·다음 단계·상태 배지·서버 기준 남은 시간), 스켈레톤·빈 상태.
- **AC8** `/tickets/alerts`(로그인): 탭 "알림함 | 켠 알림". 알림함 = 안 읽음 강조·누르면 읽음·"모두 읽음"·더 보기. 켠 알림 = 단계별 시점 칩 + 끄기(확인).
- **AC9** 카운트다운 화면: "📅 캘린더에 추가"(.ics 다운로드), "전체 일정" "내 알림" 링크.
- **AC10** 어드민: 공연별 "＋ 단계 추가"(기존 공연에), "실패한 작업" 패널(DEAD 목록·다시 시도 이중 확인).

### 검증
- 단위: ICS 생성(접기·이스케이프·SEQUENCE·취소). 계약: AC1·2·3·4·6(Spring은 건너뜀). 웹 typecheck·test·build, Playwright 390/1280 가로 넘침 0·페이지 오류 0.

## 3. 트레이드오프
- 이메일·푸시 대신 .ics: 인프라 없이 기기 캘린더의 검증된 알림을 쓴다. 대신 일정이 바뀌면 사용자가 파일을 다시 받아야 반영(구독형 webcal은 v3 — 회원별 비밀 토큰 필요).
- 재시도는 DEAD 한정: PENDING/CLAIMED를 손대면 임대·중복 처리 규칙이 깨진다.
