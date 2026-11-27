# PROMPT — 모임 일정 알림 구현 (Gemini 초안 → 저장소에 맞게 수정)

> 기획: `PLANNING_gathering-schedule-reminders.md`, 디자인: `design/DESIGN_PROMPT_gathering-reminders.md`.
> 아래 "Gemini 초안"은 비밀·코드 없이 기능 요약만 보내 받은 원문이고, "저장소 반영 수정"이 실제로 따른 내용이다(2026-11-27).

## 저장소 반영 수정 (초안과 다른 점)
- **대상**: 새 API `apps/api` + 새 웹 `apps/web`만(SNAPDAY와 같음). 운영 Spring·CRA는 손대지 않음 — 컷오버 뒤 보인다.
- **스키마**: `gatherings.min_participants INTEGER NULL` 하나. Spring 엔티티 `Gathering.minParticipants`(Hibernate가 스키마 주인) + Prisma 스키마 + `prisma/migrations/20261127000000_gathering_min_participants`(로컬 NO_SPRING·컷오버 뒤용). **운영 반영 전 사용자 확인.**
- **시간대**: 모임 시각은 한국 시간 벽시계로 저장(시간대 없음)되고 서버는 UTC — 초안의 "UTC 기준 계산"이 아니라 `common/time.ts` `wallClockNow()`(기본 +540분, `APP_WALL_CLOCK_OFFSET_MINUTES`)와 비교. 기존 상태 전환 배치도 같은 이유로 9시간 늦게 돌던 것을 함께 고침.
- **중복 방지**: 초안대로 (모임·종류·회원) 알림이 이미 있으면 건너뜀 — 스키마 추가 없음. 뒤늦게 참여한 사람은 다음 배치에서 받는다.
- **모임 "CANCELLED" 상태는 없다**(삭제만 있음) — 초안의 상태 필터는 RECRUITING·RECRUITMENT_CLOSED·SCHEDULED로 대체.
- **createMany 대신 기존 `notifySafe`** — 알림 실패가 본 동작을 막지 않는 저장소 규칙. 대상 규모(팔로워·최근 참여자)가 작아 청크 불필요.
- **배치**: `BATCH_ENABLED`(LEGACY_API_URL 있으면 기본 꺼짐) 그대로. 리마인더 5분(:30초), 모집 소식 매월 1일 01:00 UTC. `node scripts/run-batch.mjs gathering-reminders|monthly-digest`로 즉시 실행.
- **팔로워 알림**: 만든 사람 본인·서로 차단한 회원 제외.
- **푸시(FCM)·알림 설정·대기 순번·모바일은 이번 범위 밖**(P1, FCM은 사용자 확인 후).

## Gemini 초안 (원문)
**[구현 목표]**
출사 소모임 앱의 알림 시스템 고도화 및 최소 인원(minParticipants) 기능 구현.

**[작업 순서]**
1. **Schema & Logic**: `Gathering` 테이블에 `minParticipants` 추가 (1 ≤ min ≤ max). 생성/수정 시 validation 로직 적용.
2. **Batch Jobs (`@nestjs/schedule`)**: 5분 주기 Cron 구현.
   - `RECRUITMENT_CLOSING`: 모집 마감 24시간 전, 방장에게 현재 참여 현황 알림.
   - `GATHERING_REMINDER_DAY`: 모임 시작 2~24시간 전, 확정 인원 대상.
   - `GATHERING_REMINDER_SOON`: 모임 시작 2시간 이내, 확정 인원 대상.
   - `MIN_NOT_MET`: 모집 마감 시점에 최소 인원 미달인 경우 방장 알림.
   - `MONTHLY_DIGEST`: 매월 1일 10:00 KST, 이번 달 모집 중인 소모임 요약 발송.
3. **Event-driven Notifications**:
   - `GATHERING_FULL`: 모집 정원 충족 시 즉시 방장 알림.
   - `NEW_GATHERING`: 소모임 생성 시 방장의 팔로워들에게 알림 (본인 제외).
4. **Frontend (Next.js)**:
   - 최소 인원 입력 필드 추가 및 유효성 검사 UI.
   - 참여 현황 프로그레스 바에 `min` 지점 마커 표시 (Toss 스타일, #3182F6).
   - 알림 내역 페이지 및 아이콘 구현.

**[예외 처리 및 Edge Cases]**
- **Timezone**: 서버 UTC 기준, 한국 시간(KST, UTC+9) 계산 주의 (특히 Monthly Digest).
- **중복 방지**: 발송 전 `Notification` 테이블에서 동일 `type`, `gatheringId`, `memberId` 존재 여부 확인 (Upsert 금지, Skip 처리).
- **상태 필터링**: `CANCELLED`, `ENDED` 상태인 모임은 배치 대상에서 제외.
- **방장 제외**: 팔로워 알림 시 생성자 본인은 수신 대상에서 제외.
- **Batch 성능**: 알림 대상이 많을 경우 Prisma `createMany` 활용 및 청크 분할 고려.

**[테스트 체크리스트]**
- [ ] `minParticipants`가 `max`보다 클 때 400 에러 반환 여부.
- [ ] 모집 마감 24시간 전 시점에 `RECRUITMENT_CLOSING` 알림이 정확히 1회 생성되는가?
- [ ] 참여자가 정원에 도달하는 순간 방장에게 즉시 알림이 가는가?
- [ ] 서버 시간 기준 매월 1일 01:00 UTC에 `MONTHLY_DIGEST` 로직이 실행되는가?
- [ ] 이미 발송된 알림이 다음 Cron 주기(5분 후)에 중복 생성되지 않는가?
- [ ] 프론트엔드 프로그레스 바에서 최소 인원 달성 여부가 시각적으로 구분되는가?
