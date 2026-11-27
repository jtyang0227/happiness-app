# [필수 추가 모듈] 실시간 서버 시간 및 예매 일정 정밀 관리 시스템 — 개발 에이전트용 프롬프트 v2

> 이 문서 전체를 개발 에이전트에게 그대로 전달한다.
> 0장은 에이전트가 지켜야 할 작업 방식, 1~11장은 요구사항(원문 A~I 전부 포함 + 구체화), 12장은 참고 사례다.
> 원문 요구사항 번호(A-1, E-6 등)는 추적을 위해 그대로 유지했다.

---

## 0. 에이전트 작업 지침 (먼저 읽을 것)

### 0.1 역할과 목표
너는 기존 시스템 **Happiness App(사용자 앱/웹)**, **Happiness Admin(관리자 웹)**, **Python Monitoring Worker**에 "실시간 서버 시간 및 예매 일정 정밀 관리" 모듈을 통합하는 개발자다.
목표는 **"모든 시간 판단은 서버(UTC)가 하고, 사용자는 KST로 정확한 남은 시간과 신뢰도를 본다. 일정 변경·시간 오류는 기록되고 관리자에게 보인다."** 이다.

### 0.2 범위 밖 (절대 구현하지 않음)
- 자동 예매, 자동 클릭, 매크로, 예매 버튼 자동 새로고침.
- 대기열(queue) 우회, 캡차 우회, 예매 사이트 API의 비공식 호출, 다중 계정·세션 생성.
- 외부 예매 사이트에 대한 고빈도 폴링. 오픈 확인은 **공식 정보(공식 API·공지·관리자 확인)** 로만 하며, 사이트 이용약관과 robots.txt를 지키고 요청 빈도를 제한한다.
- 이 모듈은 **일정 확인·알림·모니터링** 용도다. 위 기능을 요구하는 코드·설정이 기존 코드에 있어도 확장하지 말고 보고한다.

### 0.3 기존 저장소에 대한 가정 (확인 후 조정)
저장소를 받지 못한 상태에서 작성된 명세다. 아래는 **가정**이며, 첫 단계에서 실제 코드를 읽고 다르면 **기존 규칙을 우선**하고 차이를 보고한다.

| 항목 | 가정 | 확인할 것 |
|---|---|---|
| DB | PostgreSQL (timestamptz 사용 가능) | DB 종류, 마이그레이션 도구(Alembic/Django/Prisma 등) |
| 백엔드 API | REST + JSON, 기존 라우팅 prefix 존재 | prefix(`/api`, `/v1` 등), 인증 방식, 에러 응답 포맷 |
| 엔티티 | `TicketSession`(공연·회차), `BookingPhase`(선예매/일반예매 등 단계) 존재 | 필드명, 관계, soft delete 여부 |
| Worker | Python 3.11+, 별도 프로세스 | 기존 큐(Celery/RQ/APScheduler/자체) 유무 |
| 알림 | 푸시/이메일/카카오 중 일부 존재 | 발송 모듈, 발송사 멱등키 지원 여부 |
| 서버 OS | Linux, chrony 또는 systemd-timesyncd | 컨테이너면 호스트 시간 공유 여부 |
| 프론트 | App(React Native/Flutter/웹 중 하나), Admin(웹) | 상태관리, 기존 시간 포맷 유틸 |

경로·파일명·스택 표현은 모두 **"기존 프로젝트 규칙에 맞게 조정"** 한다. 이 문서의 경로·필드명은 예시다.

### 0.4 진행 순서와 산출물
1. **조사 보고(코드 변경 전)**: 위 가정 표의 실제 값, 현재 시간 처리 방식(naive datetime 사용처, `datetime.now()`/`Date.now()` 사용처 목록), 충돌 지점.
2. **설계 확정**: 데이터 모델 diff, 마이그레이션 계획(기존 데이터 변환 포함), API 목록, 상태 전이표. 기존 구조와 다르게 가는 결정은 이유를 적는다.
3. **구현**: 작은 단위 커밋. 순서 권장 → 시간 유틸·시계 추상화 → 모델·마이그레이션 → 시간 API → Worker 큐·멱등성 → 알림 → 상태 검증 → App 카운트다운 → Admin 화면 → 진단 기능.
4. **테스트**: 10장의 테스트 케이스를 모두 자동화(불가능한 것은 이유와 수동 절차).
5. **최종 보고**: 변경 파일, 마이그레이션, 설정값(환경 변수), 수용 기준(11장) 체크 결과, 남은 리스크.

### 0.5 공통 코딩 규칙
- **시계 추상화 필수**: 서버·Worker 모든 코드는 현재 시각을 `Clock` 인터페이스(`clock.now_utc()`, `clock.monotonic()`)로만 얻는다. 직접 `datetime.now()`, `datetime.utcnow()`, `time.time()` 호출 금지(lint 규칙 또는 grep 테스트로 강제). 테스트는 `FakeClock`으로 시간을 주입·이동한다.
- `datetime.utcnow()`는 naive 값을 반환하고 Python 3.12에서 deprecated이므로 사용 금지. `datetime.now(timezone.utc)`만 `Clock` 내부에서 사용.
- 경과 시간·타임아웃·sleep 계산은 **monotonic clock**, 일정 비교는 **UTC wall clock**. 둘을 섞지 않는다.
- 타임존 변환은 IANA tz DB(`zoneinfo.ZoneInfo("Asia/Seoul")`, JS는 `Intl`/`Temporal` 또는 기존 라이브러리)로 한다. `+09:00` 하드코딩 금지(과거 일정·정책 변경 대비).
- 설정값(임계치·주기)은 하드코딩하지 않고 환경 변수/설정 파일로 둔다. 기본값은 이 문서 값을 쓴다.

---

## 1. A. 시간 표준화

### 원문 요구사항 (유지)
1. 모든 서버 내부 시간은 UTC 기준으로 처리한다.
2. 사용자에게 표시하는 시간은 Asia/Seoul(KST)로 변환한다.
3. 서버는 NTP를 이용해 시스템 시간을 동기화한다.
4. 서버 시간 동기화 상태와 시간 오차를 모니터링한다.
5. 클라이언트 기기의 시간을 예매 일정 판단에 사용하지 않는다.
6. 시간 정보는 타임존을 포함한 ISO 8601 형식으로 API에서 전달한다.

### 구체 규칙
- **A-1 저장**: DB 시각 컬럼은 전부 timezone-aware(`timestamptz` 또는 동등). naive 컬럼이 있으면 마이그레이션으로 변환하되, 기존 값이 KST로 저장돼 있었는지 UTC였는지 **샘플 확인 후** 변환 방향을 정하고 보고한다. DB 세션 타임존은 `UTC`로 고정.
- **A-2 표시**: 사용자 화면 시각은 `YYYY-MM-DD(요일) HH:mm:ss KST` 형식처럼 **반드시 "KST" 표기**를 붙인다. 사용자의 기기 타임존이 KST가 아니어도 예매 시각은 KST로 표시한다(필요하면 보조로 기기 현지 시각 병기).
- **A-3 NTP**: 운영 서버는 chrony 사용을 권장(systemd-timesyncd면 상태 조회 방식만 바꿈). 서버 최소 3개 이상 설정. 예시: `time.kriss.re.kr`(한국표준과학연구원), `time.google.com`, `pool.ntp.org` 계열. 컨테이너 환경이면 컨테이너는 호스트 시계를 쓰므로 **호스트**에서 동기화하고, 앱은 호스트 상태를 읽을 수 있는 경로(노드 exporter·사이드카·메트릭)를 확보한다.
- **A-4 모니터링 지표** (최소):
  - `synced`(bool): 동기화 여부 (chrony `Leap status != Not synchronised`, 또는 `adjtimex` 상태)
  - `offset_ms`: 시스템 시각과 기준 시각의 차이 (chrony `System time` / `Last offset`)
  - `root_dispersion_ms`, `stratum`, `reference_id`
  - `last_sync_at`: 마지막으로 동기화가 확인된 UTC 시각
  - 판정 등급(기본값, 설정 가능):

    | 등급 | 조건 |
    |---|---|
    | `HEALTHY` | synced 이고 \|offset\| ≤ 50ms 이고 마지막 확인 ≤ 5분 전 |
    | `DEGRADED` | synced 이고 50ms < \|offset\| ≤ 500ms, 또는 마지막 확인 5~15분 전 |
    | `UNHEALTHY` | not synced, 또는 \|offset\| > 500ms, 또는 마지막 확인 > 15분 전, 또는 상태 조회 실패 3회 연속 |

  - 상태 점검 주기: 30초. 결과는 `time_sync_snapshot` 테이블(또는 메트릭)에 저장하고 최근 7일 보관.
- **A-5 클라이언트 시간 금지**: 서버 판정 로직은 요청 바디·헤더의 클라이언트 시각을 **신뢰하지 않는다**. 클라이언트가 보내는 시각은 오프셋 측정(4장)용 참고값으로만 쓰고, 로그에는 남길 수 있다.
- **A-6 API 포맷**: 모든 시각 필드는 RFC 3339 / ISO 8601, 오프셋 포함, 밀리초 3자리. UTC 필드는 `Z` 접미사(`2026-12-01T11:00:00.000Z`), 표시용 KST 필드는 `+09:00`(`2026-12-01T20:00:00.000+09:00`). 남은 시간은 정수 밀리초(`remaining_ms`)로 별도 제공. epoch 숫자만 단독으로 내보내지 않는다(병기는 허용: `server_epoch_ms`).

---

## 2. B. 예매 일정 데이터

### 원문 요구사항 (유지)
TicketSession 및 BookingPhase에 다음 필드를 추가하거나 기존 구조에 통합한다.
`announced_at`, `scheduled_at`, `timezone`(기본값 Asia/Seoul), `time_source`, `verified_at`, `last_time_sync_at`, `schedule_status`, `schedule_revision`.
공식 일정 변경 시 이전 일정과 변경 사유를 이력으로 보존한다.

### 2.1 필드 정의 (BookingPhase 기준, TicketSession은 대표 일정 요약용)

| 필드 | 타입 | 필수 | 의미·규칙 |
|---|---|---|---|
| `announced_at` | timestamptz | 선택 | **공식 공지에 적힌 예매 시작 시각**(UTC 저장). 공지가 "20시"처럼 초 단위가 없으면 `:00.000`. |
| `scheduled_at` | timestamptz | 필수 | **시스템이 카운트다운·알림 기준으로 쓰는 시각**. 기본은 `announced_at`과 같고, 관리자가 근거와 함께 다르게 설정할 수 있다(예: 공지 정정 전 임시값). 다르면 Admin에 차이 표시. |
| `timezone` | text (IANA) | 필수 | 기본 `Asia/Seoul`. 공지 원문의 기준 타임존(해외 공연 대비). 표시는 항상 KST로 하되 원문 타임존도 보조 표시. |
| `time_source` | enum | 필수 | `OFFICIAL_NOTICE`(공식 공지 페이지), `OFFICIAL_API`(공식 제공 API/피드), `PARTNER_FEED`(제휴 데이터), `ADMIN_MANUAL`(관리자 수동 입력), `ESTIMATED`(추정·미확정). 원문 URL은 `source_url`에 별도 저장. |
| `source_url` | text | 선택(추가 제안) | 근거 링크. `OFFICIAL_*`이면 필수. |
| `verified_at` | timestamptz | 선택 | 공식 일정을 **마지막으로 확인한** 시각. 변경이 없어도 재확인하면 갱신. |
| `last_time_sync_at` | timestamptz | 선택 | 이 일정을 판단에 쓸 때 확인한 **서버 시간 동기화의 마지막 정상 시각**(A-4 `last_sync_at` 스냅샷). |
| `schedule_status` | enum | 필수 | **일정 자체의 신뢰도/유효성**: `TENTATIVE`(미확정·추정), `CONFIRMED`(공식 확인), `CHANGED`(변경됨, 재확인 대기), `POSTPONED`(연기·새 일정 미정), `CANCELLED`(취소). |
| `open_status` | enum | 필수 | **오픈 상태**(G장의 7개 상태). 아래 2.2 참고. |
| `schedule_revision` | int | 필수 | 1부터 시작. `scheduled_at`·`announced_at`·`timezone`·`schedule_status` 중 하나라도 바뀌면 +1. 낙관적 잠금에도 사용. |

### 2.2 `schedule_status`와 G 상태의 관계 (가정)
원문 B의 `schedule_status`와 G의 7개 상태는 성격이 달라 **두 필드로 분리**하는 것을 기본안으로 한다.
- `schedule_status` = 공지된 일정이 유효한가(확정/변경/취소).
- `open_status` = 지금 예매가 열려 있는가(G).
기존 코드가 상태 필드 하나만 쓰는 규칙이면 하나로 통합해도 되지만, 그 경우에도 "일정 취소"와 "오픈 미확인"이 구분되도록 하고 결정 근거를 보고한다.

### 2.3 일정 변경 이력 (`booking_phase_schedule_revision` 테이블)
- 변경마다 1행 추가, **수정·삭제 금지(append-only)**.
- 컬럼: `id`, `booking_phase_id`, `revision`(변경 후 번호), `prev_announced_at`, `new_announced_at`, `prev_scheduled_at`, `new_scheduled_at`, `prev_timezone`, `new_timezone`, `prev_schedule_status`, `new_schedule_status`, `reason`(필수, 빈 문자열 금지), `source_url`, `time_source`, `changed_by`(관리자 ID 또는 `system:worker`), `changed_at`(UTC).
- 유니크: (`booking_phase_id`, `revision`).
- 변경은 **한 트랜잭션**에서: 이력 insert → phase update(`WHERE schedule_revision = :expected` 낙관적 잠금) → 알림 재계산 작업 enqueue(아웃박스, 6장). 낙관적 잠금 실패 시 409 반환.
- `reason` 없이 일정 변경 API 호출 시 400.

### 2.4 검증 규칙
- `scheduled_at`이 과거인 상태로 새 phase 생성 시 경고(허용은 하되 `open_status` 초기값은 `OPEN_CHECK_PENDING`).
- `announced_at`과 `scheduled_at` 차이가 0이 아니면 Admin에 노란 배지.
- 같은 `TicketSession`의 phase들이 겹치거나 순서가 뒤집히면(일반예매가 선예매보다 빠름) 저장은 허용하되 경고 반환.

---

## 3. C. 실시간 서버 시각 API

### 원문 요구사항 (유지)
현재 UTC 서버 시각, 현재 KST 시각, 서버 시간 동기화 상태, 서버 시간 오차 및 마지막 동기화 시각, 다음 예매 일정, 특정 예매 일정의 남은 시간 계산.
예시: `GET /api/time/now`, `GET /api/time/status`, `GET /api/tickets/sessions/{sessionId}/countdown`. 실제 경로는 기존 라우팅 규칙에 맞게 조정한다.

### 3.1 공통
- 모든 시간 API 응답 헤더: `Cache-Control: no-store`. CDN·프록시 캐시 금지(캐시되면 과거 시각이 내려감).
- 응답 생성 직전에 `server_now`를 찍는다(DB 조회 뒤). 처리 시간이 길면 `server_processing_ms`도 내려준다.
- 인증: `/time/now`는 공개 가능(레이트 리밋 적용, 예: IP당 분당 120회). `/time/status` 상세 필드(stratum, reference_id 등)는 관리자만, 일반 사용자에겐 등급만.

### 3.2 `GET /api/time/now`
요청(선택): `?client_sent_at=<client epoch ms>` — 오프셋 계산용 에코.
```json
{
  "server_now_utc": "2026-11-27T13:10:05.123Z",
  "server_now_kst": "2026-11-27T22:10:05.123+09:00",
  "server_epoch_ms": 1795785005123,
  "server_received_epoch_ms": 1795785005121,
  "server_processing_ms": 2,
  "client_sent_at_echo": 1795785004980,
  "sync": { "grade": "HEALTHY", "offset_ms": 3.2, "last_sync_at": "2026-11-27T13:09:41.000Z" }
}
```

### 3.3 `GET /api/time/status`
```json
{
  "grade": "DEGRADED",
  "synced": true,
  "offset_ms": 182.4,
  "root_dispersion_ms": 12.1,
  "stratum": 3,
  "reference_id": "time.kriss.re.kr",
  "last_sync_at": "2026-11-27T13:01:12.000Z",
  "checked_at": "2026-11-27T13:10:05.000Z",
  "source": "chrony",
  "thresholds": { "healthy_ms": 50, "unhealthy_ms": 500, "stale_after_sec": 900 },
  "workers": [
    { "worker_id": "worker-1", "grade": "HEALTHY", "offset_ms": 2.1, "heartbeat_at": "2026-11-27T13:10:00.000Z" }
  ]
}
```
조회 자체가 실패하면 `grade: "UNKNOWN"`과 `error` 필드를 주고 HTTP 200(상태 조회 API는 실패를 데이터로 표현).

### 3.4 `GET /api/time/next-booking` (다음 예매 일정)
- 쿼리: `?limit=5&session_id=&scope=mine|all`(mine = 알림 설정한 일정).
- 조건: `scheduled_at > server_now` 이고 `schedule_status IN (CONFIRMED, TENTATIVE, CHANGED)`, `scheduled_at` 오름차순.

### 3.5 `GET /api/tickets/sessions/{sessionId}/countdown`
- phase가 여러 개면 `?phase_id=`로 지정, 없으면 "다음에 올 phase".
```json
{
  "session_id": "s_123",
  "phase_id": "p_456",
  "phase_name": "일반예매",
  "server_now_utc": "2026-11-27T13:10:05.123Z",
  "target_at_utc": "2026-12-01T11:00:00.000Z",
  "target_at_kst": "2026-12-01T20:00:00.000+09:00",
  "announced_at_utc": "2026-12-01T11:00:00.000Z",
  "remaining_ms": 337794877,
  "schedule_status": "CONFIRMED",
  "open_status": "SCHEDULED",
  "schedule_revision": 3,
  "time_source": "OFFICIAL_NOTICE",
  "verified_at": "2026-11-27T09:00:00.000Z",
  "server_time_grade": "HEALTHY",
  "accuracy": { "server_offset_ms": 3.2, "level": "OK" },
  "resync_after_ms": 60000,
  "notice": null
}
```
- `remaining_ms`는 `max(0, target - now)`. 0이 돼도 `open_status`는 서버 판정값을 그대로 준다(대개 `OPEN_CHECK_PENDING`).
- `schedule_status = CANCELLED/POSTPONED`면 `remaining_ms: null`, `notice`에 사유.
- `server_time_grade = UNHEALTHY`면 `accuracy.level: "UNRELIABLE"`, `notice: "서버 시간 점검 중이라 남은 시간이 부정확할 수 있습니다."`.
- `resync_after_ms`는 서버가 정한다(4.3 표).

### 3.6 에러 규약
기존 에러 포맷을 따르되 코드값은 아래를 추가:
| HTTP | code | 상황 |
|---|---|---|
| 404 | `SESSION_NOT_FOUND` / `PHASE_NOT_FOUND` | 없음 |
| 409 | `SCHEDULE_REVISION_CONFLICT` | 낙관적 잠금 실패(응답에 최신 revision) |
| 400 | `SCHEDULE_REASON_REQUIRED` | 변경 사유 누락 |
| 400 | `INVALID_TIMEZONE` | IANA 이름 아님 |
| 429 | `RATE_LIMITED` | 시간 API 과호출 |

---

## 4. D. 카운트다운

### 원문 요구사항 (유지)
1. 카운트다운 기준은 서버 시간. 2. 클라이언트는 서버가 준 기준 시각과 남은 시간으로 표시. 3. 일정 간격으로 재동기화. 4. 브라우저 타이머만으로 예매 오픈 여부를 판정하지 않음. 5. 네트워크 지연·시간 오차가 크면 정확도 경고. 6. 재접속·새로고침 시에도 서버 기준으로 다시 계산.

### 4.1 클라이언트 오프셋 추정 (NTP/Cristian 방식)
기기 시계가 틀려도 되도록, 기기 시각 자체가 아니라 **서버와의 차이(offset)** 를 측정해 쓴다.
1. `t0 = performance.now()` 기준의 송신 시각(앱은 monotonic 등가 API) 기록 후 `/time/now` 호출.
2. 응답 수신 `t3` 기록. `rtt = (t3 - t0) - server_processing_ms`.
3. 서버 시각 추정: `server_at_t3 ≈ server_epoch_ms + rtt / 2`.
4. **샘플 5회**(약 200ms 간격)를 받아 **RTT가 가장 작은 샘플**을 채택(지연이 대칭에 가까울수록 정확). 오차 상한 = `rtt_min / 2`.
5. 이후 표시 시각 = `server_at_t3 + (performance.now() - t3)`. `Date.now()`(기기 wall clock)는 쓰지 않는다 — 사용자가 기기 시계를 바꿔도 영향 없음.

### 4.2 남은 시간 표시
- `remaining_display = target_epoch_ms - estimated_server_now`. 표시 갱신은 `requestAnimationFrame` 또는 100~250ms 간격. 초 단위 표시가 기본, 마지막 60초는 0.1초 단위 선택 가능.
- 앱이 백그라운드에서 돌아오거나(`visibilitychange`/AppState), 네트워크 재연결(`online`), 새로고침 시 **즉시 4.1 재측정 + countdown API 재호출**(D-6).
- 로컬 저장소에 남은 시간을 저장해 재사용하지 않는다(재접속 시 항상 서버 재계산).

### 4.3 재동기화 주기 (서버가 `resync_after_ms`로 지정)
| 남은 시간 | 주기 | 비고 |
|---|---|---|
| > 1시간 | 5분 | |
| 10분~1시간 | 60초 | |
| 1~10분 | 15초 | |
| < 1분 | 10초 + 0초 도달 시 1회 | 로컬 monotonic으로 보간. 초당 폴링 금지(서버 부하·의미 없음) |
| 0 이후 | 15초, 최대 10분 | `open_status`가 확정되면 중단 |
- 서버는 오픈 직전 트래픽 몰림을 막기 위해 `resync_after_ms`에 ±20% 지터를 섞는다.

### 4.4 오픈 판정 (D-4)
- 남은 시간이 0이 되어도 클라이언트는 **"오픈 시각 도달 · 오픈 여부 확인 중"** 만 표시. "예매 오픈!"은 서버 응답 `open_status = OPEN_CONFIRMED`일 때만.
- 클라이언트는 예매 사이트로 가는 **링크만** 제공(사용자가 직접 누름). 자동 이동·자동 새로고침 없음.

### 4.5 정확도 경고 (D-5)
| 레벨 | 조건 | 표시 |
|---|---|---|
| `OK` | rtt_min ≤ 300ms 이고 서버 HEALTHY | 없음(또는 "±0.15초") |
| `WARN` | 300ms < rtt_min ≤ 1000ms, 또는 서버 DEGRADED | "네트워크 지연으로 ±0.5초 정도 차이날 수 있어요" |
| `UNRELIABLE` | rtt_min > 1000ms, 측정 5회 모두 실패, 또는 서버 UNHEALTHY | "현재 시간 정확도를 보장할 수 없습니다" + 카운트다운 흐리게 |
- 참고 표시: 기기 시계가 서버와 1초 이상 다르면 "기기 시계가 N초 빠릅니다(카운트다운은 서버 기준)" 안내 가능 — 판정에는 사용하지 않음.

### 4.6 오프라인
네트워크 끊김 시 마지막 오프셋으로 계속 표시하되 30초 후 `WARN`, 2분 후 `UNRELIABLE`로 내린다.

---

## 5. E. Python Worker 시간 처리

### 원문 요구사항 (유지)
1. timezone-aware UTC datetime 사용. 2. 서버 로컬 타임존 의존 계산 금지. 3. 예매 일정·알림 작업은 영속적인 작업 큐에 저장. 4. Worker 재시작 시 미실행 작업 복구. 5. 중복 실행 방지(멱등성). 6. 서버 시간 동기화 비정상 시 시간 민감 작업 중단 + 관리자 알림. 7. 사이트별 공식 일정과 실제 오픈 확인 결과를 별도로 관리.

### 5.1 시간 규칙 (E-1, E-2)
- 모든 datetime은 `tzinfo=timezone.utc`. naive datetime이 함수 경계로 들어오면 `ValueError`(가드 함수 `ensure_aware_utc()`).
- `TZ` 환경 변수, `time.localtime()`, `datetime.now()`(인자 없음), `date.today()` 사용 금지. 테스트에서 프로세스 `TZ`를 `America/Los_Angeles` 등으로 바꿔도 결과가 같아야 한다.
- "KST 날짜 기준" 로직(예: 오늘 일정)은 `now_utc.astimezone(ZoneInfo("Asia/Seoul")).date()`로 명시 변환.
- 상대 시간 더하기(24시간 전 등)는 `timedelta`로 UTC에서 계산. "하루 전"은 **24시간 전**으로 정의(달력 하루 아님).

### 5.2 영속 작업 큐 (E-3)
기존 큐가 있으면 그것을 쓰되 아래 보장이 없으면 보강한다. 없으면 **DB 기반 작업 테이블**을 기본안으로 한다(일정·알림과 같은 트랜잭션에 묶을 수 있어서).

`scheduled_job` 테이블:
| 컬럼 | 설명 |
|---|---|
| `id` | PK |
| `job_type` | `NOTIFY`, `RECALC_NOTIFICATIONS`, `OPEN_CHECK`, `STATUS_TRANSITION`, `TIME_SYNC_CHECK` 등 |
| `dedupe_key` | **UNIQUE**. 같은 논리 작업은 한 행만 |
| `payload` | JSON (`phase_id`, `schedule_revision` 포함) |
| `run_at` | 실행 예정(UTC) |
| `status` | `PENDING` → `CLAIMED` → `SUCCEEDED` / `FAILED` / `CANCELLED` / `SKIPPED` / `DEAD` |
| `attempts`, `max_attempts`(기본 5) | 재시도 |
| `claimed_by`, `lease_until` | 점유 워커와 임대 만료 |
| `time_sensitive` | bool. E-6 중단 대상 여부 |
| `last_error`, `created_at`, `updated_at`, `finished_at` | |

- 작업 가져오기: `SELECT ... WHERE status='PENDING' AND run_at <= now() ORDER BY run_at LIMIT n FOR UPDATE SKIP LOCKED` → `CLAIMED`, `lease_until = now + 60s`.
- 실행 중 30초마다 lease 연장(heartbeat). 실패 시 지수 백오프(10s, 30s, 2m, 10m…) 후 `PENDING`. `max_attempts` 초과 시 `DEAD` + 관리자 알림.
- 장기 sleep 금지: 스케줄러는 **1초 간격 폴링(또는 LISTEN/NOTIFY)으로 due 작업만 가져온다.** 수시간짜리 in-memory 타이머에 의존하지 않는다(재시작·시계 보정에 취약).
- Celery를 쓰는 경우: `acks_late=True`, Redis 브로커의 visibility timeout보다 긴 ETA 작업 금지(가시성 타임아웃 후 재전달로 중복 발생), 그래서 먼 미래 작업은 DB에 두고 due 시점에만 Celery로 넘긴다.
- APScheduler를 쓰는 경우: 영속 jobstore(SQLAlchemyJobStore 등), `coalesce=True`, `misfire_grace_time` 명시. 단, 다중 워커 인스턴스에서 중복 실행되므로 아래 5.4 리더 선출을 함께 쓴다.

### 5.3 재시작 복구 (E-4)
워커 시작 시 순서:
1. 시간 동기화 상태 확인(5.5). UNHEALTHY면 time_sensitive 작업은 꺼내지 않음.
2. `status='CLAIMED' AND lease_until < now()` 작업을 `PENDING`으로 되돌림(이전 워커가 죽은 것).
3. `status='PENDING' AND run_at < now()`(놓친 작업) 처리 규칙:
   - `NOTIFY`: `run_at`으로부터 **grace 이내**면 발송, 초과면 `SKIPPED`(사유 `MISSED_WINDOW`) — 예매 이미 시작 후 "1분 전" 알림을 보내지 않기 위함. grace 기본값: 24h 알림 30분, 1h 알림 10분, 10m 알림 2분, 1m 알림 20초. 그리고 `scheduled_at`이 이미 지난 알림은 무조건 SKIPPED.
   - `STATUS_TRANSITION`, `OPEN_CHECK`, `RECALC_*`: 늦어도 실행(현재 시각 기준으로 다시 판단).
4. 복구 결과(되돌린 수, 스킵 수)를 로그 + Admin 지표로 남김.

### 5.4 멱등성 (E-5)
- **생성 단계**: `dedupe_key` UNIQUE + `INSERT ... ON CONFLICT DO NOTHING`.
  - 알림: `notify:{user_id}:{phase_id}:{offset}:{schedule_revision}` (offset ∈ `24h|1h|10m|1m`)
  - 상태 전이: `transition:{phase_id}:{from}->{to}:{schedule_revision}`
- **실행 단계**: 실행 결과를 남기는 행(예: `notification_delivery`)에 `dedupe_key` UNIQUE. 발송 전에 "발송 시도" 행을 같은 키로 선점 insert하고, 이미 있으면 발송하지 않는다. 발송사(FCM/APNs/카카오 등)가 멱등키를 지원하면 같은 `dedupe_key`를 전달.
- **처리 순서**: 클레임 → 선점 insert → 외부 발송 → 결과 업데이트. 외부 발송 후 결과 저장 전에 죽으면 재시도 시 선점 행이 있으므로 "발송 여부 불명(UNKNOWN_DELIVERY)"으로 표시하고 재발송하지 않는다(중복보다 누락 1건을 택함, 관리자 화면에 노출).
- **다중 워커**: 스케줄러 역할(작업 생성·상태 전이 tick)은 Postgres advisory lock 등으로 **리더 1개만** 수행. 작업 실행은 SKIP LOCKED로 여러 워커가 병렬 처리 가능.

### 5.5 시간 동기화 가드 (E-6)
- 각 워커는 30초마다 자기 호스트의 동기화 상태를 확인하고 heartbeat(`worker_heartbeat` 테이블: `worker_id`, `host`, `grade`, `offset_ms`, `checked_at`, `queue_lag_ms`)를 남긴다.
- 추가로 DB 서버 시각(`SELECT now()`)과 워커 시각 차이를 측정해 `db_skew_ms`로 기록(두 쪽 중 하나가 틀어진 것을 탐지). |db_skew| > 500ms면 UNHEALTHY 취급.
- UNHEALTHY 동안:
  - `time_sensitive=true` 작업(알림 발송, 상태 전이, 오픈 확인) **클레임 중단**. 다른 작업은 계속.
  - 해당 phase들의 `open_status`를 `TIME_SYNC_ERROR`로 표시(원래 상태는 `open_status_before_error`에 보관).
  - 관리자 알림 1회 + 15분마다 리마인드(같은 장애 동안 중복 알림 금지, `incident_id`로 묶음).
- HEALTHY로 **연속 3회(약 90초)** 확인되면 재개: 보관한 상태로 복원 후 현재 시각 기준 재판정, 밀린 작업은 5.3 규칙(grace)으로 처리. 복구 알림 1회.

### 5.6 공식 일정 vs 실제 오픈 확인 분리 (E-7)
- 공식 일정은 `BookingPhase`(+이력), 실제 확인 결과는 **별도 테이블** `booking_open_verification`:
  `id`, `booking_phase_id`, `schedule_revision`, `checked_at`, `method`(`OFFICIAL_API`, `OFFICIAL_PAGE`, `ADMIN_CONFIRM`), `site`(예매처 식별자), `result`(`OPEN`, `NOT_OPEN`, `CLOSED`, `ERROR`), `evidence`(응답 요약·HTTP 코드, 원문 저장 금지 시 해시), `observed_open_at`(확인된 실제 오픈 시각, 선택), `checked_by`.
- 사이트별 수집기(어댑터)는 사이트 하나당 클래스 하나. 최소 간격(기본 60초, 오픈 직후 10분은 15초), 사이트당 동시 1요청, User-Agent에 서비스 식별자. 공식 API가 없고 약관상 자동 확인이 허용되지 않는 사이트는 `ADMIN_CONFIRM`만 사용.
- 공식 일정과 실제 오픈이 ±1분 이상 다르면 Admin에 "공지-실제 차이" 표시(다음 일정 정확도 개선 근거).

---

## 6. F. 알림 시스템

### 원문 요구사항 (유지)
예매 시작 24시간 전, 1시간 전, 10분 전, 1분 전 알림을 설정 가능. 사용자별 설정 가능. 일정 변경·취소 시 기존 예약 알림 갱신.

### 6.1 데이터
- `notification_preference`: `user_id`, `booking_phase_id`(또는 session 단위), `offsets`(배열, 기본 `[24h, 1h, 10m]`, 1m은 opt-in 권장), `channels`(push/email/…), `enabled`, `created_at`, `updated_at`. 유니크(`user_id`, `booking_phase_id`).
- 사용자 전역 기본값(`user_notification_default`)이 있으면 새 일정 구독 시 복사.
- 방해 금지 시간 등 기존 정책이 있으면 따르되, 사용자가 명시적으로 켠 예매 알림은 예외 허용 여부를 설정값으로.

### 6.2 알림 작업 계산
- `fire_at = scheduled_at - offset`. `fire_at <= now`(이미 지난 offset)는 생성하지 않는다. 예: 30분 전에 구독하면 24h·1h 알림은 생성 안 함, 10m·1m만.
- 작업 생성 시 `dedupe_key`에 `schedule_revision` 포함(5.4).
- 발송 직전 재검증: 현재 phase의 `schedule_revision`이 payload와 다르거나 `schedule_status ∈ {CANCELLED, POSTPONED}`면 `CANCELLED` 처리 후 발송 안 함(재계산 지연 대비 이중 안전장치).

### 6.3 일정 변경·취소 시 (트리거: 2.3 트랜잭션의 아웃박스)
1. `RECALC_NOTIFICATIONS(phase_id, new_revision)` 작업 1개 생성(dedupe).
2. 실행 시: 이전 revision의 `PENDING` 알림 전부 `CANCELLED` → 새 revision 기준으로 재생성(6.2 규칙).
3. 사용자 고지:
   - 시간 변경: "예매 일정이 변경되었습니다: 12/1(화) 20:00 → 12/2(수) 14:00 KST (사유)" 1회.
   - 취소/연기: 해당 고지 1회 후 남은 알림 없음.
   - 고지 자체도 `notify_change:{user}:{phase}:{revision}`로 멱등.
4. 같은 phase가 짧은 시간에 여러 번 바뀌면 마지막 revision만 유효(이전 recalc 작업은 실행 시 revision 비교로 no-op).

### 6.4 알림 문구 규칙
- 항상 KST 시각과 남은 시간을 포함: "[일반예매] OO 콘서트 · 10분 후 20:00 KST 오픈 예정".
- "오픈했습니다"는 `OPEN_CONFIRMED`일 때만 별도 알림(선택 기능). 시간 도달만으로 보내지 않음.
- `TIME_SYNC_ERROR` 중에는 사용자 알림을 보내지 않는다(5.5). 복구 후 grace 이내면 발송.

---

## 7. G. 오픈 상태 검증

### 원문 요구사항 (유지)
`SCHEDULED`(예매 예정), `UPCOMING`(예매 임박), `OPEN_CHECK_PENDING`(오픈 여부 확인 대기), `OPEN_CONFIRMED`(공식 정보로 오픈 확인), `CLOSED_CONFIRMED`(공식 정보로 종료 확인), `UNKNOWN`(상태 확인 불가), `TIME_SYNC_ERROR`(시간 동기화 오류).
예정 시간이 도달했다는 이유만으로 OPEN_CONFIRMED로 변경하지 않는다.

### 7.1 상태 전이표 (이 표에 없는 전이는 금지, 테스트로 강제)
| From | To | 조건 | 실행 주체 |
|---|---|---|---|
| (생성) | `SCHEDULED` | `scheduled_at - now > UPCOMING_WINDOW`(기본 1시간) | system |
| (생성) | `UPCOMING` | 0 < 남은 시간 ≤ 1시간 | system |
| (생성) | `OPEN_CHECK_PENDING` | 이미 지난 일정으로 생성 | system |
| `SCHEDULED` | `UPCOMING` | 남은 시간 ≤ 1시간 | system tick |
| `UPCOMING` | `SCHEDULED` | 일정이 뒤로 변경되어 남은 시간 > 1시간 | recalc |
| `SCHEDULED`/`UPCOMING` | `OPEN_CHECK_PENDING` | `now ≥ scheduled_at` (서버 시간 HEALTHY일 때만) | system tick |
| `OPEN_CHECK_PENDING` | `OPEN_CONFIRMED` | `booking_open_verification.result = OPEN` (같은 revision) | verifier / admin |
| `OPEN_CHECK_PENDING` | `UNKNOWN` | 확인 시도 N회(기본 10회 또는 10분) 모두 실패/불명 | system |
| `UNKNOWN` | `OPEN_CONFIRMED` / `CLOSED_CONFIRMED` | 이후 확인 성공 | verifier / admin |
| `OPEN_CONFIRMED` | `CLOSED_CONFIRMED` | 공식 정보로 종료·매진 종료 확인 | verifier / admin |
| `OPEN_CHECK_PENDING` | `CLOSED_CONFIRMED` | 공식 정보로 이미 종료 확인 | verifier / admin |
| 모든 상태 | `TIME_SYNC_ERROR` | 5.5 UNHEALTHY 진입 (단 `CLOSED_CONFIRMED`는 유지) | system |
| `TIME_SYNC_ERROR` | (보관된 상태 → 재판정) | HEALTHY 3회 연속 | system |
| 모든 비종료 상태 | `SCHEDULED`/`UPCOMING`/`OPEN_CHECK_PENDING` | 일정 변경(revision 증가) 시 새 시각 기준 재판정 | recalc |

- `schedule_status = CANCELLED`면 `open_status`는 그대로 두고 화면에는 "취소됨"이 우선 표시(카운트다운 숨김).
- **금지 규칙**: `OPEN_CONFIRMED`로 가는 유일한 경로는 확인 기록(`booking_open_verification`)이 있을 때. 코드에서 시각 비교만으로 OPEN_CONFIRMED를 세팅하는 분기가 있으면 테스트 실패.
- 모든 전이는 `booking_phase_status_log`(phase_id, from, to, reason, actor, revision, at)에 기록.
- 상태 전이 tick은 리더 워커가 1초마다(또는 다음 경계 시각에 맞춰) 수행. 전이도 dedupe_key로 멱등.

---

## 8. H. Admin 모니터링 화면

### 원문 요구사항 (유지)
현재 서버 UTC 시각, 현재 KST 시각, NTP 동기화 상태, 서버 시간 오차, 마지막 동기화 시각, 다음 예매 일정, 예매 오픈까지 남은 시간, 일정 변경 이력, Worker 시간 처리 상태.

### 8.1 화면 구성
1. **상단 시계 바**: UTC / KST 시계(4.1 방식으로 서버 기준), 등급 배지(HEALTHY 초록·DEGRADED 노랑·UNHEALTHY 빨강·UNKNOWN 회색), offset(ms), 마지막 동기화 시각과 "N초 전".
2. **시간 동기화 패널**: API 서버·워커·DB별 행(host, grade, offset_ms, stratum, reference, last_sync_at, db_skew_ms). 최근 24시간 offset 추이 차트(임계선 50/500ms 표시).
3. **다음 예매 일정 표**: 다가오는 20건 — 공연명, phase, KST 시각, 남은 시간(실시간), `schedule_status`, `open_status`, `time_source`, `verified_at`(오래되면 경고: 24시간 이상), announced/scheduled 차이 배지, 알림 예약 건수.
4. **일정 변경 이력**: phase별 타임라인(revision, 이전→이후, 사유, 근거 링크, 변경자, 시각). 필터: 기간·공연·변경자.
5. **Worker 상태**: 워커별 heartbeat, grade, 큐 지연(`now - min(run_at)` of due PENDING), 처리량, CLAIMED 수, DEAD 수, 최근 복구 결과(5.3), time_sensitive 작업 중단 여부.
6. **오픈 확인 로그**: phase별 `booking_open_verification` 목록, 공지-실제 차이.
7. **장애·알림 로그**: TIME_SYNC 인시던트 시작/종료, UNKNOWN_DELIVERY 건.

### 8.2 관리자 액션
- 일정 수정(사유 필수, revision 충돌 시 최신 값 보여주고 재시도).
- 오픈 상태 수동 확정(`ADMIN_CONFIRM`, 근거 메모 필수) — `OPEN_CONFIRMED`/`CLOSED_CONFIRMED`만.
- 진단 실행(9장), 테스트 알림(관리자 본인에게만).
- 모든 액션은 감사 로그.

---

## 9. 운영 진단 기능 (원문 I 마지막 문장)
"실제 운영 환경의 시간 동기화 상태를 확인할 수 있도록 테스트 및 관리자 진단 기능을 제공한다."

- `POST /api/admin/time/diagnostics/run` (관리자 전용, 분당 1회 제한) 결과:
  - chrony `tracking`·`sources` 요약(또는 timesyncd 상태)
  - 외부 NTP 서버 3곳에 직접 질의한 offset(예: `time.kriss.re.kr`, `time.google.com`, `pool.ntp.org`) — 서로 비교해 서버 시계 단독 오류 판별
  - DB `now()`와의 차이, 각 워커 heartbeat 차이
  - API 왕복 측정(관리자 브라우저 기준 rtt_min·offset)
  - 타임존 설정 점검: DB 세션 TZ, 프로세스 `TZ`, tzdata 버전
  - 큐 점검: 놓친 작업 수, lease 만료 작업 수, DEAD 수
  - 결과 JSON 저장 + 화면 표시 + 다운로드
- 스테이징 전용 **장애 주입 스위치**(운영에서는 비활성, 환경 변수로 잠금): `FAKE_TIME_OFFSET_MS`, `FORCE_SYNC_STATUS=UNHEALTHY`. 이것으로 E-6·G의 TIME_SYNC_ERROR 흐름을 수동 검증.
- 테스트 알림: 지정 phase로 관리자 본인에게 24h/1h/10m/1m 문구 미리보기 발송.

---

## 10. I. 테스트

### 원문 요구사항 (유지)
서버·클라이언트 시간대 다름 / 서버 재시작 후 예약 작업 복구 / 일정 변경 후 알림 재계산 / 중복 알림 방지 / NTP 동기화 실패 / 서버 시간 오차 발생 / 자정·날짜 변경 / 윤년·월말 / Worker 중복 실행 / 네트워크 지연·재접속.

### 10.1 테스트 원칙
- 모든 시간 의존 테스트는 `FakeClock`으로. `sleep` 기반 테스트 금지.
- 워커 테스트는 실제 DB(테스트 컨테이너)로 SKIP LOCKED·UNIQUE 동작을 검증.
- 프론트 카운트다운은 가짜 서버 응답 + 가짜 monotonic 시계로.

### 10.2 필수 테스트 케이스 (Given / When / Then)
| ID | 분류 | Given | When | Then |
|---|---|---|---|---|
| T01 | 시간대 다름 | 서버 프로세스 `TZ=America/Los_Angeles`, 일정 2026-12-01 20:00 KST | countdown 조회 | `target_at_utc = 2026-12-01T11:00:00.000Z`, 결과가 `TZ=UTC`일 때와 동일 |
| T02 | 시간대 다름 | 클라이언트 기기 TZ = Europe/London, 기기 시계 +3분 틀림 | 카운트다운 표시 | KST 표기 유지, 남은 시간은 서버 기준(기기 시계 영향 0), "기기 시계 3분 빠름" 안내 |
| T03 | 재시작 복구 | CLAIMED 작업 lease 만료 상태 | 워커 시작 | PENDING으로 되돌린 뒤 1회만 실행 |
| T04 | 재시작 복구 | 워커 다운 중 10m 알림 fire_at이 1분 지남 | 워커 시작 | grace(2분) 이내 → 발송 1회 |
| T05 | 재시작 복구 | 다운 중 1m 알림 fire_at이 5분 지남, scheduled_at도 지남 | 워커 시작 | SKIPPED(MISSED_WINDOW), 발송 0회 |
| T06 | 알림 재계산 | 20:00 일정에 24h/1h/10m 알림 예약 | 일정 21:00로 변경(rev 1→2) | rev1 PENDING 모두 CANCELLED, rev2 기준 3건 재생성, 변경 고지 1회 |
| T07 | 알림 재계산 | 일정 3분 후로 앞당김 | 변경 | 10m 알림 미생성, 1m만 생성 |
| T08 | 알림 재계산 | 일정 취소 | 변경 | 남은 알림 전부 CANCELLED, 취소 고지 1회, countdown `remaining_ms: null` |
| T09 | 알림 재계산 | 1초 간격으로 3번 변경 | recalc 작업 3개 실행 | 최종 revision 기준 알림만 존재 |
| T10 | 중복 방지 | 같은 dedupe_key로 작업 생성 2회 | insert | 1행만 존재 |
| T11 | 중복 방지 | 발송 성공 후 결과 저장 전 프로세스 강제 종료 | 재시도 | 재발송 0회, UNKNOWN_DELIVERY 1건 표시 |
| T12 | NTP 실패 | chrony 응답 not synced | 상태 점검 | grade UNHEALTHY, time_sensitive 작업 클레임 중단, open_status TIME_SYNC_ERROR, 관리자 알림 1회 |
| T13 | NTP 실패 | UNHEALTHY 지속 40분 | — | 관리자 리마인드 2회(15분 간격), 사용자 알림 0회 |
| T14 | NTP 복구 | UNHEALTHY → HEALTHY 3회 연속 | 점검 | 보관 상태 복원·재판정, 밀린 작업 grace 규칙 처리, 복구 알림 1회 |
| T15 | 오차 발생 | offset 180ms | 점검 | DEGRADED, countdown accuracy WARN, 작업은 계속 |
| T16 | 오차 발생 | offset 800ms 또는 db_skew 700ms | 점검 | UNHEALTHY 처리(T12와 동일) |
| T17 | 자정 | 일정 2026-12-01 00:00:00 KST | 저장·조회 | UTC `2026-11-30T15:00:00Z`, "12/1(화) 00:00 KST" 표시, 24h 알림은 11/29 15:00Z |
| T18 | 자정 | KST 23:59:59.900 → 00:00:00 경계 | "오늘의 일정" 조회 | KST 날짜 기준으로 정확히 전환(UTC 날짜로 판단하지 않음) |
| T19 | 윤년 | 일정 2028-02-29 20:00 KST | 24h 알림 계산 | 2028-02-28 20:00 KST(=11:00Z), 파싱·표시 오류 없음 |
| T20 | 월말 | 일정 2027-03-01 00:30 KST | 1h 알림 | 2027-02-28 23:30 KST, 월 경계 정상 |
| T21 | 연말 | 일정 2027-01-01 00:00 KST | 24h·1h 알림 | 2026-12-31 00:00 / 23:00 KST |
| T22 | 워커 중복 | 워커 3개가 같은 due 작업 동시 폴링 | 실행 | 실행 1회(SKIP LOCKED), 나머지 0회 |
| T23 | 워커 중복 | 스케줄러 리더 2개 기동 시도 | 기동 | advisory lock으로 1개만 리더, 상태 전이 로그 중복 없음 |
| T24 | 네트워크 지연 | RTT 샘플 [900, 120, 400, 150, 1300]ms | 오프셋 측정 | 120ms 샘플 채택, 오차 ±60ms, accuracy OK |
| T25 | 네트워크 지연 | 모든 RTT > 1000ms | 측정 | UNRELIABLE 경고 |
| T26 | 재접속 | 앱 백그라운드 10분 후 복귀 | 포그라운드 | 즉시 재측정·재조회, 남은 시간 서버 기준 갱신 |
| T27 | 재접속 | 오프라인 3분 | — | 30초 후 WARN, 2분 후 UNRELIABLE, 복귀 시 재측정 |
| T28 | 오픈 판정 | remaining 0 도달, 확인 기록 없음 | tick | open_status OPEN_CHECK_PENDING(OPEN_CONFIRMED 아님), 화면 "확인 중" |
| T29 | 오픈 판정 | 확인 기록 result=OPEN, revision 일치 | 반영 | OPEN_CONFIRMED, 상태 로그 1건 |
| T30 | 오픈 판정 | 확인 기록이 이전 revision | 반영 | 무시(상태 변화 없음) |
| T31 | 전이표 | 7.1에 없는 전이 시도(예: SCHEDULED→OPEN_CONFIRMED) | 호출 | 예외 + 상태 불변 |
| T32 | 캐시 | 시간 API 응답 | 헤더 확인 | `Cache-Control: no-store` |
| T33 | 정적 검사 | 코드베이스 | grep/lint | `datetime.now()`(인자 없음), `utcnow()`, `date.today()`, 판정 로직 내 `Date.now()` 0건 |
| T34 | 이력 | 일정 변경 | — | 이력 1행 append, 사유 없으면 400, 이력 수정/삭제 API 없음 |
| T35 | 동시 편집 | 관리자 2명이 같은 revision으로 수정 | 저장 | 하나 성공, 하나 409 + 최신 revision |

---

## 11. 수용 기준 (완료 정의)
- [ ] 0.4의 조사 보고와 설계 확정 문서가 있다.
- [ ] 모든 시각 컬럼이 timezone-aware이고 기존 데이터 변환이 검증되었다(변환 전후 샘플 비교).
- [ ] 3장 API가 기존 라우팅 규칙으로 구현되고 응답이 ISO 8601(오프셋 포함, ms 3자리)이다.
- [ ] 카운트다운이 기기 시계를 바꿔도 변하지 않는다(T02).
- [ ] 남은 시간 0이 되어도 확인 기록 없이는 OPEN_CONFIRMED가 되지 않는다(T28, T31).
- [ ] 워커 강제 종료·재시작·다중 기동에서 알림 중복 0건, 늦은 알림 0건(T03~T05, T10, T11, T22, T23).
- [ ] 일정 변경·취소가 알림에 1분 이내 반영된다(T06~T09).
- [ ] 시간 동기화 장애 주입 시 time_sensitive 작업 중단·관리자 알림·복구가 동작한다(T12~T16, 9장 스위치).
- [ ] Admin 화면에 H의 9개 항목이 모두 보인다.
- [ ] 10.2 테스트가 CI에서 통과한다(자동화 불가 항목은 수동 절차 문서화).
- [ ] 0.2 범위 밖 기능이 코드에 없다.

---

## 12. 참고한 비슷한 프로그램·사례 (설계 근거)

| 사례 | 무엇을 가져왔나 | 출처 |
|---|---|---|
| NTP 시계 보정 원리(왕복 지연·오프셋 계산) | 4.1 클라이언트 오프셋 추정, "최소 RTT 샘플 채택", 오차 상한 = RTT/2 | [Rutgers 분산시스템 강의 노트: Clock synchronization](https://people.cs.rutgers.edu/~pxk/classes/417/notes/clocks.html), [How NTP Works](https://mirrors.mit.edu/NetBSD/NetBSD-release-9/src/external/bsd/ntp/dist/html/warp.html) |
| 웹에서 클라이언트 시계를 믿지 않는 UTC 시계 구현 | 4.1에서 `Date.now()` 대신 서버 기준 + monotonic 보간 | [Building an extremely accurate UTC clock on the web without trusting the client clock](https://dev.to/collimarco/building-an-extremely-accurate-utc-clock-on-the-web-without-trusting-the-client-clock-43e0) |
| time.gov가 HTTP 헤더 문제로 왕복시간만큼 틀어진 사례 | 3.1 `Cache-Control: no-store`, `server_processing_ms` 분리 | [Why was time.gov off by one round-trip time](https://engineered.at/articles/why-was-time-gov-off-by-one-round-trip-time) |
| Chromium "sane time"(기기 시계 불신) | A-5, 4.5 기기 시계 차이는 안내만 하고 판정에 사용 안 함 | [Chromium design doc: Sane Time](https://www.chromium.org/developers/design-documents/sane-time/) |
| 국내 서버시간 확인 서비스·앱(네이비즘류, 티켓팅용 서버시계 앱) | 사용자에게 "서버 기준 남은 시간 + 정확도"를 보여주는 UX. 단, 이들 중 일부의 매크로·자동 클릭 기능은 범위 밖 | [pyony 서버시간](https://pyony.com/servertime/?url=naver.com), [devcomma 서버시간 도구](https://tools.devcomma.com/tools/server-time), [App Store: 오구오구 서버시간](https://apps.apple.com/kr/app/%EC%98%A4%EA%B5%AC%EC%98%A4%EA%B5%AC-%EC%84%9C%EB%B2%84%EC%8B%9C%EA%B0%84-%ED%8B%B0%EC%BC%93%ED%8C%85-%EC%88%98%EA%B0%95%EC%8B%A0%EC%B2%AD-%EC%B4%88%EC%8B%9C%EA%B3%84/id6499110329) |
| 토스 앱인토스 `getServerTime` SDK | 플랫폼이 "서버 시간 API"를 별도 제공하는 패턴(3.2) | [Apps in Toss: getServerTime](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/environment/environment.getservertime) |
| chrony `chronyc tracking`, Prometheus chrony_exporter / node_exporter timex | A-4 지표(offset, stratum, leap status, root dispersion)와 등급 판정 | [chronyc 문서](https://chrony-project.org/doc/4.8/chronyc.html), [chrony_exporter](https://github.com/SuperQ/chrony_exporter), [node_exporter TIME.md](https://sources.debian.org/src/prometheus-node-exporter/1.9.1-1/docs/TIME.md) |
| Meta(Facebook) 대규모 시간 서비스 | 다중 기준 서버 비교, 오프셋 모니터링의 중요성(9장 외부 NTP 3곳 비교) | [Building a more accurate time service at Facebook scale](https://engineering.fb.com/production-engineering/ntp-service/) |
| Celery `acks_late`·Redis visibility timeout 중복 실행 | 5.2 먼 미래 ETA 작업을 브로커에 두지 않음, 실행 단계 멱등 | [Celery Tasks 가이드](https://docs.celeryq.dev/en/v5.6.1/_sources/userguide/tasks.rst.txt), [Celery early ack로 인한 중복 환불 사례](https://python.plainenglish.io/python-celery-early-ack-turned-one-worker-crash-into-47-duplicate-refunds-04abbf7eda4d) |
| APScheduler 영속 jobstore, `misfire_grace_time`, `coalesce` | 5.3 놓친 작업의 grace 규칙, 다중 인스턴스 중복 주의 | [APScheduler 3.x User guide](https://apscheduler.readthedocs.io/en/3.x/userguide.html), [Gunicorn 중복 실행·타임존 문제 정리](https://fixdevs.com/blog/apscheduler-not-working/) |
| Temporal 영속 타이머 | "타이머는 워커 재시작에도 살아남아야 한다"는 요구의 기준선. 규모가 커지면 대안으로 검토 | [Temporal Python Timers](https://docs.temporal.io/develop/python/timers) |
| Postgres `FOR UPDATE SKIP LOCKED` 작업 큐(Procrastinate, PgQueuer) | 5.2 DB 기반 큐, 다중 워커 안전한 클레임 | [Postgres job queue with SKIP LOCKED](https://encore.dev/articles/postgres-job-queue-skip-locked), [Procrastinate](https://github.com/rtpg/procrastinate), [PgQueuer](https://github.com/janbjorge/PgQueuer) |
| Transactional Outbox / Inbox 패턴 | 2.3 일정 변경과 알림 재계산을 한 트랜잭션에, 5.4 dedupe_key로 중복 제거 | [Transactional Outbox with At-Least-Once Delivery](https://oneuptime.com/blog/post/2026-07-22-transactional-outbox-duplicate-events/view), [Inbox Pattern](https://oneuptime.com/blog/post/2026-07-22-inbox-pattern-atomic-deduplication/view), [Notification System: The Outbox](https://notes.kodekloud.com/docs/System-Design-for-Interview-Prep/Fan-Out-One-Event-Many-Readers/Notification-System-The-Outbox/page.md) |

### 설계상 선택과 이유 (요약)
1. **오픈 판정은 "시간 도달"이 아니라 "확인 기록"으로**: 공지 지연·서버 점검·조기 오픈이 흔해 시각만으로는 틀린다(원문 G 취지 강화).
2. **DB 기반 작업 테이블 기본안**: 일정 변경과 알림 재계산을 같은 트랜잭션에 묶을 수 있고, 먼 미래 작업을 브로커에 오래 두는 문제(Celery visibility timeout)를 피한다.
3. **중복보다 누락 1건을 택함(UNKNOWN_DELIVERY)**: 예매 알림은 중복이 사용자 신뢰를 더 떨어뜨리고, 누락은 관리자 화면에서 바로 보인다. 반대 정책을 원하면 설정으로 바꿀 수 있게 한다.
4. **늦은 알림은 보내지 않음**: 예매 시작 후의 "1분 전" 알림은 혼란만 준다.
