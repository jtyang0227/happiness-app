# PLAN — 모임 일정 알림 & 사전 리마인더
> Feature 40 | 2026-11-27 | PM: Claude (시니어 PM 에이전트)

## 개요
사진 모임에 참여하는 사람이 "모집이 마감되기 전", "모임 전날·직전", "정원이 다 찼을 때"
적절한 알림을 받아 중요한 순간을 놓치지 않게 하고, 처음 듣는 사람에게는 "이번 달 출사 모집"
소식을 한 번에 전달한다.

---

## 1. 현황 진단

### 잘 되어 있는 것
| 기능 | 위치 |
|---|---|
| 모집 마감·시작·종료 자동 상태 전환 (5분 배치) | `apps/api/src/batch/batch.service.ts` |
| 취소 시 대기자 1순위 자동 승격 + PARTICIPATION_CONFIRMED 알림 | `gathering.service.ts` |
| 수동 모집 마감 + RECRUITMENT_CLOSED 알림 | `gathering.service.ts` |
| 일정·장소 변경 시 SCHEDULE_CHANGED 알림(참여자+대기자) | `gathering.service.ts` |
| 월간 출사 날짜 투표 + 마감 24시간 전 알림(POLL_CLOSING) | `outing-poll.service.ts` |
| 인앱 알림 테이블 `gathering_notifications` + 폴링 배지 | `gathering-notification.service.ts` |
| 장소 투표, 사진 모임 피드, 앨범, Instagram 공유 | 각 컨트롤러 |

### 부족한 것 (이번 기획의 출발점)
| # | 부족한 점 | 사용자 영향 |
|---|---|---|
| 1 | 모집 마감 24h 전 리마인더 없음 | 만든 사람이 인원이 적은 걸 늦게 알아 대응 불가 |
| 2 | 모임 전날·2시간 전 알림 없음 | 참여자가 일정을 잊어 불참 |
| 3 | 정원 초과 시 만든 사람에게 알림 없음 | 인기 모임인지 모름 |
| 4 | 최소 인원 개념 없음 | 마감해도 너무 적으면 취소해야 하는데 기준이 없음 |
| 5 | 새 모임 개설 소식 없음 | 팔로워가 모집 중인 모임을 놓침 |
| 6 | "이번 달 출사 모집" 묶음 소식 없음 | 월간 출사 흥미가 있는 사람에게 도달 불가 |
| 7 | 진짜 푸시(FCM/APNs) 없음 | 앱을 열지 않으면 알림을 못 봄 |
| 8 | 알림 받기 설정(끄기) 없음 | 원치 않아도 계속 받음 |
| 9 | 대기 순번 표시 없음 | 대기자가 언제쯤 들어갈지 모름 |
| 10 | 모바일 모임 생성·관리 화면 없음 | 모바일에서 모임을 만들 수 없음 |

---

## 2. 사용자 페르소나
| 페르소나 | 목표 | 현재 불편함 |
|---|---|---|
| 모임 주최자(사진작가) | 충분한 인원이 모인 모임 진행 | 마감 전 인원 현황을 직접 확인해야 함, 조기 마감 타이밍 모름 |
| 참여 확정자 | 모임 당일 빠짐없이 참석 | 며칠 전 신청 후 잊어버리는 경우 발생 |
| 잠재 참여자(팔로워) | 관심 있는 모임이 열리면 빨리 알고 싶음 | 직접 탐색하지 않으면 모름 |
| 월간 출사 참여자 | 그 달 모집 중인 출사 모임을 한눈에 보고 싶음 | 투표 기능만 있고 일반 모임 소식 채널이 없음 |

---

## 3. 유저 스토리
- As a **모임 주최자**, I want to **정원이 다 찼을 때 즉시 알림을 받고**, so that **기뻐하고 추가 모임 개설을 고려할 수 있다**.
- As a **모임 주최자**, I want to **모집 마감 24시간 전에 현재 인원을 알림으로 받고**, so that **인원이 적으면 모집 연장 또는 취소를 결정할 수 있다**.
- As a **참여 확정자**, I want to **모임 전날과 2시간 전에 리마인더를 받고**, so that **날짜·시간·장소를 다시 확인하고 준비물을 챙길 수 있다**.
- As a **팔로워**, I want to **내가 팔로하는 작가가 모임을 열었을 때 알림을 받고**, so that **관심 있는 모임을 놓치지 않는다**.
- As a **출사 애호가**, I want to **매월 초에 그 달의 모집 중인 출사 모임 목록을 받고**, so that **한 번에 훑어보고 신청 여부를 결정할 수 있다**.

---

## 4. 기능 범위

### In Scope (P0 — 이번 구현)

#### A. 사전 리마인더 배치 (3종)
5분 배치(`batch.service.ts`)에 함께 편승. 같은 모임에 같은 종류 알림이 `gathering_notifications`에 이미 있으면 다시 보내지 않음(중복 방지 — 구현은 `GatheringReminderService.alreadySent()`가 모임·종류별 받은 회원 목록을 한 번에 조회).

| 알림 종류 | 대상 | 시점 | 문구 예시 |
|---|---|---|---|
| `RECRUITMENT_CLOSING` | 만든 사람 1명 | 모집 마감까지 24시간 미만이고 아직 RECRUITING | "📣 '{제목}' 모집 마감 24시간 전이에요. 현재 n/m명 참여 중이에요." (최소 인원 미달이면 "최소 인원 k명 중 n명이에요.") |
| `GATHERING_REMINDER_DAY` | 참여 확정자(PARTICIPATING) 전원 | 시작 2~24시간 전 | "📅 내일 '{제목}' 모임이 있어요. {날짜} {시간}, {장소}. 준비물: {preparation_note 앞 50자}" |
| `GATHERING_REMINDER_SOON` | 참여 확정자(PARTICIPATING) 전원 | 시작 2시간 미만이고 SCHEDULED/RECRUITING 중 | "⏰ 2시간 후 '{제목}' 모임이 시작돼요! {장소}" |

#### B. GATHERING_FULL — 정원 도달 즉시 알림
참여 응답(`joinGathering`)에서 참여자 수가 최대 정원(`maxParticipants`)과 같아지는 순간 만든 사람에게 1회. 기존 참여 플로우 끝에 조건 1줄 추가.

#### C. 최소 인원(`min_participants`)
- **스키마 변경**: `gatherings.min_participants INTEGER NULL`. 운영 반영 전 사용자 확인 필요(아래 7절).
  ```sql
  ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS min_participants INTEGER;
  ```
- 검증: `1 ≤ min_participants ≤ max_participants`(없으면 무시).
- 모집 마감(자동·수동) 시 `participant_count < min_participants`면 만든 사람에게 `MIN_NOT_MET` 알림: "⚠️ '{제목}' 모집이 마감됐지만 최소 인원(k명)에 미달이에요. 현재 n명."

#### D. `NEW_GATHERING` — 팔로워 알림
모임 생성(`createGathering`) 직후, 만든 사람의 팔로워 목록을 `FollowRepository.findFollowerIds(creatorId)`로 조회해 각자에게 알림. 팔로워 많은 작가는 수백 건 — **동기 발송 금지**, 비동기(`@Async` 또는 Promise 체인 fire-and-forget) + `catch` 격리, 본 트랜잭션과 무관.

#### E. `MONTHLY_DIGEST` — "이번 달 출사 모집"
- 배치 주기: 매월 1일 10:00 KST(= UTC 01:00) `cron: '0 1 1 * *'`.
- 대상: 최근 6개월 모임 참여자 ∪ 출사 투표 응답자(outing-poll과 같은 audience — `outingPollService.getNotificationAudience()`).
- 조건: 그 달 1일~말일 사이에 `start_date_time`이 있고 상태 RECRUITING인 모임이 1개 이상.
- 중복 방지: `gathering_notifications`에서 `type=MONTHLY_DIGEST` + 같은 연·월이면 건너뜀.
- 문구: "🗓 {n}월 출사 모임 {k}개가 모집 중이에요! 참여하고 싶은 모임을 찾아보세요." → 누르면 `/gatherings`.

#### F. 웹 UI 변경 (최소)
1. **모임 만들기/수정 폼** (`GatheringFormPage.tsx`): "최소 인원" 숫자 입력(선택, placeholder "미설정") + "자동 알림: 마감 24h 전·전날·시작 2시간 전에 알림이 발송됩니다." 안내 문구(정보성, 비활성화 불가 — P1에서 설정으로 분리).
2. **모임 상세 화면** (`GatheringDetailPage.tsx`): 인원 진행 막대(현재/정원, 최소 인원 있으면 최소 선 표시) — RECRUITING 상태에서만.
3. **알림 화면** (`GatheringNotificationsPage.tsx`): 새 알림 종류별 이모지 아이콘 추가(이미 `type` 기반 아이콘 분기가 있어 케이스만 추가), `MONTHLY_DIGEST` 누르면 `/gatherings`.

### Out of Scope (P1 — 이번 안 함)
| 항목 | 이유 |
|---|---|
| 진짜 푸시(FCM/APNs) | Firebase 프로젝트·서버 키 등록, 모바일 앱 SDK 연동, 사용자 기기 토큰 저장 스키마 필요 — 사용자 확인 후 별도 Feature |
| 알림 받기 설정(끄기) | `member_notification_settings` 스키마 추가 필요, UX 설계 별도 |
| 대기 순번 표시 | 취소 경합 시 순번 불안정 — 별도 설계 필요 |
| 모바일 모임 생성·관리 화면 | 모바일 범위 의도적으로 축소(기존 결정 유지) |
| 이메일 알림 | SMTP 설정 필요, 중복 채널 → 나중에 |

---

## 5. 알림 종류 전체 표

| 종류 | 대상 | 시점/트리거 | 중복 방지 | 누르면 |
|---|---|---|---|---|
| `RECRUITMENT_CLOSING` | 만든 사람 | 마감까지 <24h, 배치 | gatheringId+type 존재 시 skip | `/gatherings/:id` |
| `GATHERING_FULL` | 만든 사람 | 참여 확정으로 정원 도달 | gatheringId+type 존재 시 skip | `/gatherings/:id` |
| `MIN_NOT_MET` | 만든 사람 | 모집 마감(자동/수동) + 인원 < 최소 | gatheringId+type 존재 시 skip | `/gatherings/:id` |
| `GATHERING_REMINDER_DAY` | 참여 확정자 | 시작 2~24h 전, 배치 | gatheringId+memberId+type 존재 시 skip | `/gatherings/:id` |
| `GATHERING_REMINDER_SOON` | 참여 확정자 | 시작 <2h, 배치 | gatheringId+memberId+type 존재 시 skip | `/gatherings/:id` |
| `NEW_GATHERING` | 만든 사람 팔로워 | 모임 생성 직후, 비동기 | gatheringId+memberId+type 존재 시 skip | `/gatherings/:id` |
| `MONTHLY_DIGEST` | 출사 audience | 매월 1일 10:00 KST, 배치 | 같은 연·월 + type 존재 시 skip | `/gatherings` |

기존 알림(`PARTICIPATION_CONFIRMED`, `RECRUITMENT_CLOSED`, `GATHERING_STARTED`, `GATHERING_ENDED`, `SCHEDULE_CHANGED`, `NEW_POST`, `NEW_COMMENT`, `NEW_LIKE`, `PLACE_DECIDED`, `POLL_*`)은 그대로 유지.

---

## 6. 수용 기준 (AC)

### A. 사전 리마인더
- [ ] AC-A1: 모집 마감까지 24시간 미만이고 RECRUITING 상태인 모임의 만든 사람에게 `RECRUITMENT_CLOSING` 알림이 1회 생성된다.
- [ ] AC-A2: 같은 모임에 `RECRUITMENT_CLOSING`이 이미 있으면 배치가 돌아도 중복 생성되지 않는다.
- [ ] AC-A3: 모임 시작 2시간 초과 24시간 미만인 참여 확정자에게 `GATHERING_REMINDER_DAY` 알림이 1회 생성된다.
- [ ] AC-A4: 모임 시작 2시간 미만인 참여 확정자에게 `GATHERING_REMINDER_SOON` 알림이 1회 생성된다.
- [ ] AC-A5: 최소 인원이 설정된 경우 `RECRUITMENT_CLOSING` 문구에 "최소 인원 k명 중 n명" 문구가 포함된다.

### B. 정원 도달 알림
- [ ] AC-B1: 참여 응답으로 `currentParticipants == maxParticipants`가 되는 순간 만든 사람에게 `GATHERING_FULL` 알림이 생성된다.
- [ ] AC-B2: 이미 `GATHERING_FULL`이 있으면 같은 모임에서 다시 생성되지 않는다(대기자 취소 후 재참여 등 예외 상황에서도).

### C. 최소 인원
- [ ] AC-C1: 모임 생성/수정 시 `min_participants`가 1 미만이거나 `max_participants` 초과이면 400 반환.
- [ ] AC-C2: 자동 모집 마감 배치에서 참여자 수 < 최소 인원이면 `MIN_NOT_MET` 알림이 만든 사람에게 1회 생성된다.
- [ ] AC-C3: 수동 모집 마감(`closeRecruitment`)에서도 동일하게 `MIN_NOT_MET`이 발송된다.
- [ ] AC-C4: 최소 인원이 설정되지 않으면 `MIN_NOT_MET`이 발송되지 않는다.

### D. 팔로워 알림
- [ ] AC-D1: 모임 생성 직후 만든 사람의 팔로워 각자에게 `NEW_GATHERING` 알림이 생성된다.
- [ ] AC-D2: 팔로워가 없으면 알림이 0건 생성되고 에러가 발생하지 않는다.
- [ ] AC-D3: 팔로워 알림 발송 실패(DB 오류 등)가 모임 생성 트랜잭션에 영향을 주지 않는다.

### E. 월간 다이제스트
- [ ] AC-E1: 매월 1일 UTC 01:00에 배치가 실행되고 그 달 RECRUITING 모임이 1개 이상이면 audience에게 `MONTHLY_DIGEST` 알림이 생성된다.
- [ ] AC-E2: 같은 연·월에 `MONTHLY_DIGEST`가 이미 있으면 중복 생성되지 않는다.
- [ ] AC-E3: 그 달 RECRUITING 모임이 0개이면 발송되지 않는다.

### F. 웹 UI
- [ ] AC-F1: 모임 만들기 폼에 "최소 인원(선택)" 숫자 입력란이 있다.
- [ ] AC-F2: 모임 상세에서 RECRUITING 상태일 때 인원 진행 막대가 표시된다(현재/정원).
- [ ] AC-F3: 최소 인원이 있으면 진행 막대에 최소선이 표시된다.
- [ ] AC-F4: 알림 화면에서 새 알림 종류의 이모지와 문구가 올바르게 표시된다.
- [ ] AC-F5: `MONTHLY_DIGEST` 알림을 클릭하면 `/gatherings`로 이동한다.

---

## 7. 기술 트레이드오프

| 주제 | 옵션 A | 옵션 B | 결정·이유 |
|---|---|---|---|
| 리마인더 중복 방지 | `gathering_notifications` 테이블 조회 | 별도 `sent_reminders` 테이블 | ✅ A — 기존 테이블 재사용, 스키마 변경 없음 |
| `NEW_GATHERING` 팔로워 발송 | 동기(트랜잭션 안) | 비동기 fire-and-forget | ✅ B — 팔로워 수백 명 시 응답 지연·트랜잭션 차단 방지 |
| 최소 인원 저장 | 별도 테이블 | `gatherings` 컬럼 추가 | ✅ 컬럼 추가 — 1:1 속성, 조인 불필요 |
| `MONTHLY_DIGEST` audience | 하드코딩 audience 로직 | `outingPollService.getNotificationAudience()` 재사용 | ✅ 재사용 — DRY, audience 기준 일치 |
| 스팸 위험(팔로워 알림) | 모든 모임 생성마다 발송 | 조건 필터(최소 정원 n명 이상만) | 현재: 모든 모임 발송, P1에서 설정 추가 — 초기 사용자 수가 적어 허용 |

**폴링 한계**: 현재 인앱 알림은 30초 폴링 배지 방식이다. 사용자가 앱을 열지 않으면 알림을 볼 수 없다. FCM 푸시는 P1에서 별도 Feature로 다룬다. 단기적으로는 "앱을 열었을 때 붉은 배지"로 인지하는 것이 최선이다.

---

## 8. 사용자 확인 필요 항목

| # | 항목 | 이유 |
|---|---|---|
| 1 | `gatherings.min_participants` 컬럼 추가 운영 DB 반영 | Hibernate `ddl-auto: update`라 자동 반영 가능하나, 대규모 테이블 락 위험을 사전에 인지하고 반영 시점을 결정해야 함. 반영 SQL: `ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS min_participants INTEGER;` |
| 2 | FCM 푸시 도입 여부·시점 | Firebase 프로젝트 생성, 서버 키, 기기 토큰 저장 스키마 필요 — 사용자 결정 후 별도 작업 |
| 3 | 알림 받기 설정(끄기) 우선순위 | 스팸 민원 발생 전에 준비할지 P2로 미룰지 |

---

## 9. 검증 계획

```bash
# 계약 테스트 (apps/api)
API_BASE_URL=http://localhost:8090 npm run test:contract -- gathering-reminders

# 배치 단위 테스트 (apps/api)
npm run test:unit -- gathering-reminder

# 웹 빌드
cd apps/web && npm run build
# 모임 만들기 폼 → 최소 인원 입력 → 모임 상세 → 인원 막대 확인 (Playwright)
```

테스트 케이스 최소 범위:
1. 마감 25h 전 → `RECRUITMENT_CLOSING` 없음
2. 마감 23h 전 → `RECRUITMENT_CLOSING` 1건
3. 같은 모임에 배치 재실행 → 중복 없음
4. 참여로 정원 초과(대기) → `GATHERING_FULL` 없음
5. 참여로 정원 도달 → `GATHERING_FULL` 1건
6. 최소 인원 미달 마감 → `MIN_NOT_MET` 1건
7. 팔로워 없음 → `NEW_GATHERING` 0건, 에러 없음
8. 팔로워 2명 → `NEW_GATHERING` 2건

---

## 10. 관련 파일
- 배치: `apps/api/src/batch/batch.service.ts`
- 알림 서비스: `apps/api/src/gathering/gathering-notification.service.ts`
- 모임 서비스: `apps/api/src/gathering/gathering.service.ts`
- 출사 투표 서비스: `apps/api/src/outing/outing-poll.service.ts`
- 웹 폼: `apps/web/src/pages/GatheringFormPage.tsx`
- 웹 상세: `apps/web/src/pages/GatheringDetailPage.tsx`
- 웹 알림: `apps/web/src/pages/GatheringNotificationsPage.tsx`
- 엔티티(Spring): `backend/src/main/java/com/happiness/app/gathering/entity/Gathering.java`
- 기획 원문: `DESIGN_PROMPTS/planning/37_PHOTO_GATHERING_SNS.md`
