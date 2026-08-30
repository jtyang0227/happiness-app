# PLAN — 배치 로직 (Scheduled Batch Jobs)
> Feature: Batch | 2026-08-30 | PM: Claude

---

## 개요

현재 앱에는 `DeliverySetService.cleanupExpiredSets()` (hourly, `@Scheduled(cron="0 0 * * * *")`)
단 하나의 배치 잡만 존재한다. `@EnableScheduling`은 `AsyncConfig`에 이미 활성화되어 있으므로
추가 부트스트랩 없이 `@Scheduled` 메서드를 새 Service 클래스에 선언하는 것만으로 모든 잡을 등록할 수 있다.

아래는 실제 소스 코드를 읽어 모듈별로 배치 잡 필요성을 판단한 결과다.

---

## 모듈별 필요성 진단

### booking/ — 갭 있음 (P0)

**읽은 파일:** `booking/entity/Booking.java`, `booking/service/BookingService.java`,
`booking/repository/BookingRepository.java`

`Booking.status` 는 `REQUESTED / CONFIRMED / REJECTED / CANCELLED` 4종이다.
`BookingService.createBooking()` 은 상태를 `REQUESTED`로 저장하지만 해당 예약이 응답 없이
방치될 경우 자동 전환 로직이 없다.

`getCalendarAvailability()` (line 81–83) 는 CONFIRMED과 REQUESTED 모두 슬롯을 점유한 것으로 처리한다:

```java
if ("CONFIRMED".equals(b.getStatus()) || "REQUESTED".equals(b.getStatus())) {
    bookedSlotMap.computeIfAbsent(b.getShootDate(), k -> new ArrayList<>()).add(...)
```

따라서 `shootDate`가 지난 `REQUESTED` 예약이 그대로 남아 있으면 해당 날짜/시간 슬롯을
영구적으로 점유한 것처럼 보이는 버그가 발생한다. 수동 정리 없이는 절대 해소되지 않는다.

`BookingBlockedDate` 도 과거 날짜 레코드가 계속 쌓인다 — 달력 조회 시
`findByMemberIdAndBlockedDateBetween()`으로 월 범위를 필터하므로 성능 영향은 없지만,
장기 누적 시 테이블이 무의미하게 커진다. 같은 잡에서 처리한다.

**결론: P0 배치 잡 1개 필요.**

---

### meet/ — 갭 있음 (P0 + P1)

**읽은 파일:** `meet/entity/Meet.java`, `meet/service/MeetService.java`,
`meet/repository/MeetRepository.java`

`Meet.status` 는 `PENDING / NEGOTIATING / CONFIRMED / COMPLETED / CANCELLED`이다.
`MeetService`에는 scheduled job이 없고 아래 두 가지 시나리오에서 상태가 영구히 고착된다.

**시나리오 A (P0): CONFIRMED + confirmedDate 경과 → 미완료**
`confirmDate()` 로 날짜가 확정된 약속이라도 당사자 중 누구도 `complete()` 를 호출하지 않으면
실제 약속일이 지나도 CONFIRMED 상태로 영원히 남는다. 이 미해결 CONFIRMED 약속은
`getPendingCount()` (헤더 배지) 에는 영향 없지만 목록 화면에서 "이미 지난 확정 약속"이
처리되지 않은 것처럼 보여 UX를 저해한다.

**시나리오 B (P1): PENDING + 장기 무응답 → 미취소**
요청받은 수신자가 `respond()` 를 영영 호출하지 않으면 `PENDING` 상태로 무기한 방치된다.
`countPendingForReceiver()` 배지가 계속 높게 유지되어 "wolf cry" 문제를 야기한다.
N일 컷오프는 **제품 결정(7/14/30일)** 이 필요하므로 P1 으로 분류한다.

**결론: P0 잡 1개(CONFIRMED→COMPLETED), P1 잡 1개(PENDING/NEGOTIATING 스탈 취소).**

---

### inquiry/ — 갭 없음

**읽은 파일:** `inquiry/entity/Inquiry.java`, `inquiry/repository/InquiryRepository.java`

`Inquiry` 에 `isRead` 필드만 있고 `deletedAt` 이나 만료 컬럼이 없다. 문의는 본질적으로
작가의 영구 기록이며 자동 삭제는 오히려 UX를 해친다. 오래된 문의를 아카이빙할 기준(1년? 2년?)도
비즈니스에서 아직 정의되지 않았다. 이메일 리마인더는 `InquiryEmailService`가
`@Autowired(required=false)` 로 선언되어 있어 SMTP 없이도 동작하도록 설계되어 있지만,
문의에 대한 "알림을 보내야 할" 시점 기준(예: 72시간 미응답)이 정의되지 않았다.

**결론: 현재 배치 잡 불필요.**

---

### member/ — 갭 없음 (전제조건 누락)

**읽은 파일:** `member/entity/Member.java`, `member/entity/MemberStatus.java`,
`security/token/RefreshTokenStore.java`, `security/token/TokenBlacklistService.java`

`Member` 에 `INACTIVE` 상태가 정의되어 있으나 `lastLoginAt` 컬럼이 없다.
비활성 계정 배치는 이 컬럼 없이 구현 불가능하다.

`RefreshTokenStore` 는 Redis에 저장하며 `Duration.ofMillis(refreshTokenExpiryMs)` TTL로 자동 만료된다.
`TokenBlacklistService` 도 `Duration.ofMillis(remainingMs)` TTL로 자동 만료된다.
두 컴포넌트 모두 DB 테이블에 레코드를 쌓지 않는다 — Redis가 직접 증발시킨다.

`IpBlockFilter` 가 사용하는 Redis 키(`ipblock:*`)는 외부에서 TTL 포함하여 등록된다
(앱 코드에서 해당 키를 SET 하지 않는다). 앱 쪽에서 별도 cleanup이 필요하지 않다.

**결론: 현재 배치 잡 불필요. `lastLoginAt` 컬럼 추가 이후 P2로 재검토.**

---

### analytics/ — 갭 있음 (P1)

**읽은 파일:** `analytics/entity/AnalyticsEvent.java`,
`analytics/repository/AnalyticsEventRepository.java`,
`analytics/service/AnalyticsService.java`

`AnalyticsEvent` 는 포트폴리오 방문, 사진 조회, 좋아요 이벤트를 모두 기록한다.
삭제/보존 정책이 없어 테이블이 무한 성장한다.

라이브 KPI 쿼리는 이미 `since` 파라미터로 필터되고 `(member_id, event_type)` + `(created_at)` 복합
인덱스가 존재하므로 단기적으로 성능 문제는 없다. 그러나 1000 작가 × 일 100뷰 = 10만 이벤트/일,
1년이면 3600만 행이 된다. DELETE WHERE created_at < 90일 전 단순 purge 로 충분하다
(라이브 쿼리의 `since` 파라미터가 어차피 최근 90일 이내를 보므로, 90일 이상 된 원시 이벤트를
삭제해도 KPI 정확도에 영향이 없다).

`SecurityAuditLog` (`security_audit_log` 테이블) 도 보존 정책이 없다. 어드민 감사 로그는
저용량이지만 규정 준수 관점에서 90일 이상 보존이 필요한 경우가 있으므로 기간 설정을 넉넉하게
(180일) 잡는다. 같은 잡에서 처리한다.

**주의:** 대용량 DELETE를 단일 트랜잭션으로 실행하면 행 락과 Undo 로그가 폭발한다.
`analytics_events` 삭제는 1만 행 단위로 청크 DELETE 를 반복해야 한다.

**결론: P1 배치 잡 1개 필요 (analytics_events + security_audit_log 동시 정리).**

---

### photo/PhotoTag — 갭 없음

**읽은 파일:** `photo/entity/PhotoTag.java`, `photo/repository/PhotoTagRepository.java`,
`photo/controller/PhotoController.java` (import 목록 확인)

`PhotoTag` 는 사진에 사람을 태깅하는 용도(memberId + positionX/Y)다. 사진 삭제 시
`photoTagRepository.deleteByPhotoId(photoId)` 가 cascade step 1에서 명시적으로 호출된다
(CLAUDE.md 기록). 사진이 삭제되면 관련 `PhotoTag` 는 동기적으로 제거된다.

회원 탈퇴 시 그 회원이 태깅된 `PhotoTag` (`memberId = 탈퇴 회원 ID`) 는
`AuthService` 의 회원 삭제 플로우에서 정리되지 않을 가능성이 있다. 그러나 이는 배치 잡보다
삭제 cascade 플로우 수정으로 해결하는 것이 적합하다 — 배치로 처리하면 삭제 후 ~ 다음 배치
실행 사이에 고아 레코드가 존재하는 기간이 생긴다.

**결론: 배치 불필요, 회원 삭제 cascade 보완으로 처리 권고.**

---

### newsletter/ — 갭 있음, 하지만 P2

**읽은 파일:** `newsletter/NewsletterController.java`, `newsletter/NewsletterSubscriber.java`

`NewsletterSubscriber` 테이블에 활성 구독자가 쌓이지만 실제 발송 메커니즘이 전혀 없다.
`InquiryEmailService` 는 SMTP 설정이 있을 때만 동작하도록 `@Autowired(required=false)` 로
선언되어 있어 재사용 가능하지만, 뉴스레터 발송용 HTML 템플릿, 배치당 발송 수 제한,
발송 실패 재시도 큐, 수신거부 이력 관리가 모두 미구현이다.

`unsubscribedAt` 이 설정된 오래된 구독자(예: 6개월 이상 구독 취소) 정리는 필요하지만
이 역시 낮은 빈도·저용량이어서 긴급하지 않다.

**결론: 이메일 다이제스트 배치 — P0/P1 거부.** SMTP 인프라 + 발송 템플릿 + 재시도 큐 없이
배치만 먼저 구현하는 것은 의미 없다. P2로 보류.

---

### storage/ 고아 파일 — P2

CLAUDE.md의 cascade 순서: (1) 연관 레코드 삭제 → (2) `ImageProcessingUtil.deleteImage`
(Supabase Storage 파일 삭제) → (3) Photo 엔티티 삭제.

단계 2에서 Supabase Storage 호출이 실패하고 예외가 전파되지 않으면(혹은 swallow되면)
Storage에 고아 파일이 남을 수 있다. 또한 단계 2 성공 후 단계 3에서 예외 발생 시
트랜잭션 롤백으로 Photo 엔티티는 복구되지만 이미 삭제된 Storage 파일은 복구 불가하다
(역방향 고아). 이 두 케이스 모두 드물지만 실제로 발생한다.

조정(reconciliation) 배치는 Supabase Storage의 file list API를 페이지네이션하며 호출해야 하며,
이는 단순한 DB 쿼리와 달리 외부 API 의존성과 쓰로틀링 문제가 수반된다.

**결론: P2, 별도 epic으로 다룬다. 현재 Storage 1GB 무료 한도에서 실제 비용 영향 미미.**

---

### Redis 인메모리 rate limiter — 갭 없음

`AnalyticsService.trackRateMap`, `BookingService.bookingRateMap`,
`DeliverySetService.passwordAttempts`, `NewsletterController.rateLimitMap` 은
모두 `ConcurrentHashMap<String, long[]>` 인메모리 구조다. 서버 재시작 시 자연 초기화되며
윈도우 기반(시간 경과 시 자동 갱신)으로 동작한다. 배치 정리 불필요.

---

## 권장 배치 잡 요약

| 우선순위 | 잡 이름 | 대상 모듈 | 권장 Cron | 비고 |
|---------|--------|---------|-----------|------|
| **P0** | 예약 자동 만료 (Booking auto-expire) | booking/ | `0 0 2 * * *` (일 02:00) | 슬롯 점유 버그 해소 |
| **P0** | 약속 자동 완료 (Meet auto-complete) | meet/ | `0 0 3 * * *` (일 03:00) | CONFIRMED + 날짜 경과 |
| **P1** | 약속 스탈 취소 (Meet stale cancel) | meet/ | P0 잡과 통합 | N일 컷오프 결정 필요 |
| **P1** | 분석 이벤트 보존 (Analytics purge) | analytics/ | `0 0 4 * * *` (일 04:00) | 청크 삭제, 보안로그 병행 |
| **P2** | 비활성 계정 감지 | member/ | 미정 | `lastLoginAt` 컬럼 선행 필요 |
| **P2** | Storage 고아 파일 조정 | storage/ | 주 1회 | 외부 API 페이지네이션 필요 |
| **P2** | 뉴스레터 구독 정리 / 다이제스트 발송 | newsletter/ | 미정 | SMTP 인프라 선행 필요 |

거부 항목: 문의 아카이빙 (비즈니스 정책 미정), Redis/토큰 정리 (Redis TTL 자체 처리),
PhotoTag 고아 정리 (배치보다 cascade 수정이 적합).

---

## P0 — 예약 자동 만료 (Booking Auto-Expire)

### 사용자 문제

- **현재 상황:** `shootDate`가 지난 REQUESTED 예약이 삭제되거나 전환되지 않고 잔류한다
- **Pain Point 1:** `getCalendarAvailability()`가 REQUESTED 상태를 슬롯 점유로 계산하므로
  과거 미처리 예약이 없는 슬롯을 "이미 예약됨"처럼 표시한다
- **Pain Point 2:** 작가의 BookingDashboard "전체" 탭에 수개월 전 미처리 예약이 섞여 노이즈 발생
- **해결 후 기대 효과:** 달력 슬롯 정확도 100% 유지, 대시보드 미처리 잡음 제거

### 사용자 페르소나

| 페르소나 | 목표 | 현재 불편함 |
|---------|------|------------|
| 사진작가 | 예약 캘린더가 정확하기를 바람 | 지난 달 미확인 예약이 슬롯을 계속 점유 |
| 촬영 의뢰 고객 | 원하는 날짜/시간 예약 | 실제로는 빈 슬롯이 "불가"로 표시됨 |

### 유저 스토리

- As a **사진작가**, I want REQUESTED 예약이 촬영일이 지나면 자동 취소 처리되기를 원한다,
  so that 달력에 과거 미처리 예약이 슬롯을 차지하지 않는다.
- As a **사진작가**, I want 지난 달의 차단 날짜(`BookingBlockedDate`)가 자동으로 정리되기를 원한다,
  so that 차단 날짜 설정 화면이 관련 없는 과거 레코드로 가득 차지 않는다.
- As a **촬영 의뢰 고객**, I want 이미 지난 날짜의 예약 가능 여부가 정확히 표시되기를 원한다,
  so that 예약 폼에서 잘못된 슬롯 불가 메시지를 보지 않는다.

### 수용 기준 (AC)

- [ ] AC1: 매일 02:00에 `shootDate < CURRENT_DATE` 이고 `status = 'REQUESTED'` 인
  예약을 `status = 'CANCELLED'` 로 일괄 변경한다
- [ ] AC2: 매일 02:00에 `blocked_date < CURRENT_DATE - 30` 인 `booking_blocked_dates`
  레코드를 삭제한다 (30일 버퍼: 직전 달 마감 직후 삭제되는 것 방지)
- [ ] AC3: 잡 실행 시 `log.info("Booking batch: {} REQUESTED 예약 만료, {} 차단 날짜 정리")` 로
  처리 건수를 INFO 레벨로 기록한다
- [ ] AC4: DB 예외 발생 시 잡 전체가 실패하는 것이 아니라 예외를 catch 하고
  `log.error(...)` 로 기록한 후 다음 실행 시 재시도한다 (delivery cleanup 패턴 동일 적용)
- [ ] AC5: 레이스 컨디션 방지 — 쿼리는 `@Modifying @Query("UPDATE Booking ...")` 형식으로
  DB 레벨에서 atomic 하게 상태 변경 (SELECT 후 setStatus 패턴 금지)

### 기능 범위

**In Scope:**
- `BookingBatchService` 신규 Service 클래스에 `@Scheduled` 메서드 구현
- `BookingRepository` 에 `@Modifying @Query` 2개 추가 (REQUESTED 만료, BlockedDate 정리)
- INFO 로그 (처리 건수)

**Out of Scope:**
- 작가에게 만료 알림 이메일 발송 (SMTP 미구성)
- 어드민 대시보드에 "배치 마지막 실행 시각" 표시 (P2)
- "EXPIRED" 신규 상태 추가 — 기존 "CANCELLED"로 처리 (프론트엔드 변경 최소화)

### 기술 트레이드오프

| 옵션 | 장점 | 단점 | 결정 |
|-----|------|------|------|
| `@Modifying @Query` (bulk UPDATE) | atomic, N+1 없음, 단일 DB왕복 | JPQL UPDATE이므로 @Transactional 필수 | ✅ |
| findAll → setStatus → save (iterate) | 간단 | N+1, 경쟁 조건 위험 (두 트랜잭션이 동시에 같은 행을 조작 가능) | ❌ |
| 신규 "EXPIRED" 상태 도입 | 의미론적으로 명확 | 프론트 탭 필터, 색상 배지 모두 수정 필요 | ❌ |

**레이스 컨디션 분석:** `confirmBooking()` 은 `findByIdAndMemberId()` + `setStatus("CONFIRMED")` 패턴이다.
배치가 `status='REQUESTED' AND shoot_date < CURRENT_DATE` 를 대상으로 실행되므로,
작가가 미래 날짜의 예약을 확정하는 도중 배치가 그 행에 접근할 수 없다 (shoot_date 조건이 보호막).
배치가 실행되는 시점(02:00)은 촬영일이 이미 지난 예약만 대상으로 하므로 작가가 그 시각에
이미 지난 예약을 확정할 시나리오는 존재하지 않는다. **안전.**

**Cron 02:00 vs hourly 배달 cleanup 비교:** 배달 세트는 토큰 링크가 클라이언트에 활성으로
보이는 기간이 중요해 hourly 가 의미 있다. 예약 만료는 하루 단위 이벤트이므로 daily면 충분.
Railway 503번 재시작 우연히 겹칠 때 잡 스킵 위험이 있으나, 다음 날 02:00에 동일 예약이
다시 조건을 충족하므로 재실행이 멱등하다.

### API 엔드포인트 (예상)

배치 잡은 HTTP 엔드포인트 없음. 운영 수동 트리거가 필요한 경우:
- `POST /api/admin/batch/booking-expire` (ADMIN 전용, Out of Scope)

### 필요한 DB 변경

없음. 기존 컬럼(`status`, `shoot_date`, `blocked_date`)으로 충분.

---

## P0 — 약속 자동 완료 (Meet Auto-Complete)

### 사용자 문제

- **현재 상황:** `confirmedDate`가 지난 CONFIRMED 약속이 COMPLETED 로 전환되지 않고 방치된다
- **Pain Point:** 약속 목록 "확정" 탭에 수개월 전 만난 약속이 완료 처리 없이 상주, 목록 오염
- **해결 후 기대 효과:** 완료된 약속은 자동으로 COMPLETED 처리 → 히스토리 정확, 미래 약속만
  액션 필요 항목으로 표시됨

### 유저 스토리

- As a **사진작가/모델**, I want 약속 날짜가 지난 CONFIRMED 약속이 자동으로 완료 처리되기를 원한다,
  so that 이미 만난 약속이 "현재 진행 중"처럼 목록에 남지 않는다.
- As a **사진작가/모델**, I want 오래된 CANCELLED 약속 메시지가 주기적으로 정리되기를 원한다,
  so that 채팅 스토리지가 불필요하게 무한 증가하지 않는다.
- As a **사진작가/모델**, I want 약속 목록이 최신·관련 항목만 보여주기를 원한다,
  so that 처리해야 할 액션을 빠르게 파악할 수 있다.

### 수용 기준 (AC)

- [ ] AC1: 매일 03:00에 `status = 'CONFIRMED'` 이고 `confirmed_date < CURRENT_DATE` 인
  약속을 `status = 'COMPLETED'` 로 일괄 변경한다
- [ ] AC2: 잡 실행 시 `log.info("Meet batch: {} 약속 자동 완료 처리")` 로 INFO 로그를 남긴다
- [ ] AC3: DB 예외 발생 시 swallow-and-log (다음 실행에서 재시도) — booking batch와 동일 패턴
- [ ] AC4: `@Modifying @Query` bulk UPDATE 사용 (atomic, N+1 없음)
- [ ] AC5: 이미 COMPLETED 상태인 meet 에 대해 `complete()` API 가 호출되면
  "확정된 약속만 완료 처리할 수 있습니다" 오류 반환 — 기존 검증 로직이 이를 자연스럽게 처리.
  사용자가 수동 완료 버튼을 클릭했을 때 이미 배치가 COMPLETED 로 전환한 경우도 동일.

### 기능 범위

**In Scope:**
- `MeetBatchService` 신규 Service 클래스
- `MeetRepository` 에 `@Modifying @Query` 추가
- INFO 로그

**Out of Scope:**
- PENDING/NEGOTIATING 스탈 취소 (P1, N일 결정 필요)
- 완료 시 상대방에게 알림 발송

### 기술 트레이드오프

| 옵션 | 장점 | 단점 | 결정 |
|-----|------|------|------|
| bulk UPDATE (`@Modifying @Query`) | atomic, fast | JPQL 업데이트는 영속성 컨텍스트를 bypass하므로 `@Modifying(clearAutomatically = true)` 필요 | ✅ |
| iterate + save | 코드 이해 쉬움 | N+1, 락 경합 가능 | ❌ |

**레이스 컨디션 분석:**
`complete()` API 는 `"CONFIRMED".equals(meet.getStatus())` 를 확인한다. 배치가 이미
COMPLETED 로 전환한 행에 사용자가 `complete()` 를 호출하면 "확정된 약속만..." 오류를 받는다
— 이는 정상 동작이므로 추가 방어 코드 불필요.

**Cron 02:00(booking) vs 03:00(meet):** 두 배치가 서로 다른 테이블을 건드리므로 동시 실행해도
무관하지만, 새벽 트래픽 분산과 Railway 로그 가독성을 위해 1시간 간격으로 배치한다.

### 필요한 DB 변경

없음. 기존 컬럼(`status`, `confirmed_date`)으로 충분.

---

## P1 — 약속 스탈 취소 (Meet Stale Cancel)

### 개요

| 상태 | 조건 | 권장 컷오프 |
|-----|------|------------|
| PENDING | `created_at < NOW() - N일` 이고 receiver 가 미응답 | 14일 (제품 결정 필요) |
| NEGOTIATING | `updated_at < NOW() - N일` 이고 양측 모두 날짜 미확정 | 30일 (제품 결정 필요) |

컷오프 N은 비즈니스 결정(사용자 기대 SLA)이 필요하다. 너무 짧으면 진행 중인 대화가 강제
취소될 수 있고, 너무 길면 배지 수가 높게 유지된다. 14일 PENDING / 30일 NEGOTIATING을 제안하되
A/B 테스트나 사용자 피드백 후 조정을 권고한다.

**구현 시 추가 사항:**
- 취소 전 인앱 알림 혹은 이메일 경고 N-1일 전 발송 (SMTP 필요)
- `MeetRepository` 에 수신자 필터 + 기간 필터 복합 쿼리 추가

---

## P1 — 분석 이벤트 보존 정책 (Analytics & Audit Purge)

### 개요

**대상 테이블:**
- `analytics_events`: `created_at < NOW() - 90일` 인 레코드 삭제
- `security_audit_log`: `created_at < NOW() - 180일` 인 레코드 삭제

**청크 삭제 필수:** `analytics_events` 는 대용량 가능. 단일 DELETE WHERE 로 수백만 행을
삭제하면 PostgreSQL 의 WAL 과 Undo 로그가 급증하고 테이블 락 경합 위험.

```
while (deletedCount > 0) {
    deletedCount = deleteChunk(10_000, cutoff);
    Thread.sleep(200); // 운영 DB 부하 완화
}
```

**KPI 정확도 영향 없음:** `AnalyticsService.getSummary()` 는 `since = now - period(7/30/90)일`
파라미터로 필터한다. 90일 초과 이벤트를 삭제해도 period=7/30일 분석에는 영향 없음.
단, `period=90` 쿼리를 정확하게 유지하려면 purge cutoff ≥ 90일이어야 한다. ✅

**필요한 신규 Repository 메서드:**
```java
// AnalyticsEventRepository
@Modifying
@Query("DELETE FROM AnalyticsEvent e WHERE e.createdAt < :cutoff")
int deleteByCreatedAtBefore(@Param("cutoff") LocalDateTime cutoff);
```

### 필요한 DB 변경

없음. 기존 인덱스 `idx_analytics_created_at ON analytics_events(created_at)` 이
DELETE WHERE created_at < ? 를 커버한다.

---

## 거부/연기 배치 잡 목록

| 잡 아이디어 | 거부 이유 |
|-----------|---------|
| 문의 아카이빙 | 비즈니스 보존 기준 미정; 작가가 오래된 문의를 의도적으로 보관할 수 있음 |
| 뉴스레터 다이제스트 발송 | SMTP 인프라 미구성, 발송 템플릿/재시도 큐/발송 수 제한 모두 미구현 |
| Redis 토큰 정리 | Redis TTL 이 자동 만료 처리, DB 레코드 없음 |
| PhotoTag 고아 정리 | 배치보다 회원 삭제 cascade 보완이 적합; 배치는 삭제-실행 사이 윈도우에 고아 허용 |
| Storage 고아 파일 조정 | Supabase Storage list API 페이지네이션 + 외부 의존성 복잡, 빈도 낮음 |
| 비활성 계정 감지 | `Member.lastLoginAt` 컬럼 없음 — 전제조건 미충족 |
| `BookingBlockedDate` 미래 날짜 보존 | 달력 조회가 이미 날짜 범위 필터하므로 과거 레코드 영향 없음, P0 잡에 30일 지연 정리 통합 |

---

## 관련 파일

**새로 생성할 파일:**
- `backend/src/main/java/com/happiness/app/booking/service/BookingBatchService.java`
- `backend/src/main/java/com/happiness/app/meet/service/MeetBatchService.java`

**수정할 파일:**
- `backend/src/main/java/com/happiness/app/booking/repository/BookingRepository.java`
  (`@Modifying @Query` 2개 추가)
- `backend/src/main/java/com/happiness/app/meet/repository/MeetRepository.java`
  (`@Modifying @Query` 1개 추가)

**P1 추가 수정:**
- `backend/src/main/java/com/happiness/app/analytics/repository/AnalyticsEventRepository.java`
- `backend/src/main/java/com/happiness/app/audit/repository/SecurityAuditLogRepository.java`

---

## 성공 지표 (KPI)

| 지표 | 측정 방법 | 목표 |
|-----|---------|------|
| 달력 슬롯 정확도 | `getCalendarAvailability()` 응답에서 과거 REQUESTED 점유 슬롯 = 0 | 0건 |
| 약속 목록 미해결 CONFIRMED 항목 | CONFIRMED + confirmedDate < today 인 건수 | 0건 (매일 03:00 이후) |
| `analytics_events` 테이블 행 수 | 90일 이후 매월 측정 | 성장률 둔화 (purge 이후) |

---

## DB 마이그레이션 SQL (신규 컬럼/인덱스 없음)

P0/P1 배치 잡 모두 기존 컬럼만 사용하므로 운영 DB 마이그레이션 불필요.
단, P1 analytics purge 가 실제로 구현될 시점에 `idx_analytics_created_at` 인덱스가
Supabase에 이미 생성되어 있는지 확인 필요 (CLAUDE.md migration 섹션에 이미 기록됨):

```sql
-- 이미 CLAUDE.md에 있음 — 확인만 필요
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events (created_at);
```
