# 서버 시간 표준화·동기화 상태 (2026-11-27)

> 원본 요구사항(전체 명세 A~I): `PROMPT_server-time-booking-module.md` — "실시간 서버 시간 및 예매 일정 정밀 관리" 모듈 프롬프트.
> 이 저장소에는 티켓 예매 도메인(`TicketSession`·`BookingPhase`)과 Python Worker가 없어, 사용자 지시("작업 진행해줘")에 따라
> **공통 시간 기능만 먼저** 넣었다. 티켓 일정·알림·오픈 상태 검증·Worker(B·E·F·G)는 코드 위치를 받으면 이어서 한다.

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

## 남은 것 (위치 확인 후)
B 일정 필드·변경 이력 · D 사용자 카운트다운 · E 영속 작업 큐·멱등성·시간 가드 · F 알림 24h/1h/10m/1m · G 오픈 상태 전이 · H 나머지(다음 일정·변경 이력·Worker 상태).
