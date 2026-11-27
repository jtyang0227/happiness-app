-- 모임 최소 인원(선택, null = 제한 없음) — PLANNING_gathering-schedule-reminders.md
-- 운영 반영 전 사용자 확인 필요. 컷오버 전에는 Spring 엔티티(Gathering.minParticipants)로 Hibernate가 만든다.
ALTER TABLE "gatherings" ADD COLUMN IF NOT EXISTS "min_participants" INTEGER;
