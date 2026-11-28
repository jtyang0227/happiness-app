# 서버 시간 표준화·동기화 상태 (2026-11-27)

> 원본 요구사항(전체 명세 A~I): `PROMPT_server-time-booking-module.md` — "실시간 서버 시간 및 예매 일정 정밀 관리" 모듈 프롬프트.
> 이 저장소에는 티켓 예매 도메인(`TicketSession`·`BookingPhase`)과 Python Worker가 없어, 사용자 지시("작업 진행해줘")에 따라
> **공통 시간 기능만 먼저** 넣었다. → 같은 날 "이어서 작업 다 해줘"로 B·D·E·F·G·H·I를 Nest(`apps/api/src/ticket`)·`apps/web`에 새로 만들었다(아래 "이어서 한 것").

## 범위 — 이번에 한 것
| 명세 | 구현 |
|---|---|
| A-1 서버 UTC | Nest는 이미 `TZ=UTC` 고정(`main.ts`). 새 코드는 `Date`(UTC epoch)만 쓰고, 표시 변환은 tz DB(`Intl`, `Asia/Seoul`)로 — `+09:00` 하드코딩 없음 |
| A-2 KST 표시 | API에 `serverNowKst`, 어드민 화면은 "… KST"/"… UTC" 표기 |
| A-3·A-4 NTP·오차 모니터링 | PaaS(Render·Railway)는 chrony를 못 보므로 **프로세스가 직접 SNTP로 기준 서버에 질의해 오프셋을 잰다**(`apps/api/src/time/time-sync.ts`, 관측만·시계는 안 고침). 등급 HEALTHY(≤50ms)/DEGRADED/UNHEALTHY(>500ms 또는 15분 넘게 성공 없음)/UNKNOWN |
| A-5 클라이언트 시계 불신 | 어드민 패널은 `Date.now()`가 아니라 응답의 `serverEpochMs` + RTT/2 + `performance.now()` 경과로 시계를 그린다(`apps/admin/src/utils/serverTime.ts`) |
| A-6 ISO 8601 | `serverNowUtc`(`…Z`)·`serverNowKst`(`…+09:00`), 밀리초 3자리, `serverEpochMs` 병기 |
| C 서버 시각 API | `GET /api/time/now`(공개, `?client_sent_at=` 에코, `serverProcessingMs`), `GET /api/time/status`(공개 요약) — `ApiResponse` 래퍼, `Cache-Control: no-store` |
| H 어드민 모니터링(시간 부분) | `GET /api/admin/time/status`, `POST /api/admin/time/diagnostics`(즉시 재측정) + 어드민 웹 "시스템 설정"의 **서버 시간 동기화** 카드(UTC·KST 시계, 등급, 오차, 마지막 동기화, 기준 서버, 왕복 지연, 실패 서버, 정확도 경고, 다시 측정) |
| I 테스트(시간 부분) | `apps/api` `npm run test:unit` 22개(오프셋 계산, 등급, 자정·윤년·월말·연말·과거 서머타임, 서버 실패 대체, 연속 실패→UNHEALTHY, 동시 측정 1회, 가짜 NTP 서버로 오차·kiss-o-death·타임아웃), `apps/admin` `serverTime.test.ts` 12개 |

## 설정 (환경 변수, 모두 선택)
`TIME_NTP_SERVERS`(기본 `time.google.com,time.cloudflare.com,pool.ntp.org`, `host:port` 허용) · `TIME_SYNC_REFRESH_SEC`(60) ·
`TIME_SYNC_HEALTHY_MS`(50) · `TIME_SYNC_UNHEALTHY_MS`(500) · `TIME_SYNC_STALE_AFTER_SEC`(900) · `TIME_SYNC_ENABLED`(`false`면 측정 안 함 → UNKNOWN).

## 주의
- **Nest(`apps/api`)에만 넣었다** — 운영 트래픽이 아직 Spring이면 컷오버 전까지 운영에는 없다(Spring에 없는 경로라 계약 테스트에도 넣지 않음).
- 측정은 UDP 123 아웃바운드가 필요하다. 클라우드 개발 세션은 막혀 있어 UNKNOWN으로 보이며(가짜 로컬 NTP로 확인), Render·Railway에서 실제로 되는지는 배포 후 어드민 카드로 확인해야 한다.
- `GET /api/time/now`는 측정을 기다리지 않는다(마지막 값만 붙이고 오래됐으면 뒤에서 갱신). `GET /api/time/status`는 오래됐으면 측정을 기다린다(서버당 최대 2초).

## 이어서 한 것 (2026-11-27)
B 일정·이력(테이블 10개, 이력은 추가만) · D `/tickets/:id` 카운트다운 · E DB 작업 큐(SKIP LOCKED·임대·복구·dedupe·백오프·DEAD)·리더 잠금·시간 가드 · F 인앱 알림 24h/1h/10m/1m·변경/취소 안내·재계산 · G 오픈 상태 전이표(확인 기록 없이는 OPEN_CONFIRMED 금지) · H `/admin/tickets` · I 단위 18·계약 2·웹 14. 자세한 내용은 CLAUDE.md TS 전환 절 "예매 일정·알림·오픈 상태 모듈".

## 아직 안 한 것
- 외부 채널 알림(이메일·푸시·카카오) — 지금은 인앱만. 붙일 때 `ticket_notifications.status=UNKNOWN_DELIVERY` 경로를 쓴다.
- 예매처 페이지 자동 확인(SITE_CHECK) — 확인 기록 API는 받지만 자동 수집기는 없음(약관·차단 문제로 관리자 확인이 기본).
- 모바일 화면, 기존 `frontend/`(CRA) 화면 — 컷오버 뒤엔 `apps/web`만 쓰므로 만들지 않음.
