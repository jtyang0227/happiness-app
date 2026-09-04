package com.happiness.app.gathering.service;

import com.happiness.app.gathering.entity.Gathering;
import com.happiness.app.gathering.entity.GatheringParticipant;
import com.happiness.app.gathering.repository.GatheringParticipantRepository;
import com.happiness.app.gathering.repository.GatheringRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GatheringBatchService {

    private final GatheringRepository gatheringRepository;
    private final GatheringParticipantRepository participantRepository;
    private final GatheringNotificationService notificationService;

    /**
     * 5분마다 실행 — 모임 상태 자동 전환(모집중 → 모집종료 → 모임예정 → 모임진행중 → 모임종료).
     *
     * 알림 트리거:
     *   RECRUITING → RECRUITMENT_CLOSED : PARTICIPATING + WAITING 참여자에게 RECRUITMENT_CLOSED 알림
     *   SCHEDULED  → ONGOING            : PARTICIPATING 참여자에게 GATHERING_STARTED 알림
     *   ONGOING    → ENDED              : PARTICIPATING 참여자에게 GATHERING_ENDED 알림
     *
     * RECRUITMENT_CLOSED → SCHEDULED 는 사용자 노출 의미가 없어 알림 대상 아님.
     * 알림 루프 실패 시 catch(Exception)로 로깅 후 상태 전환 결과는 보존 — 전환이 더 중요.
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void transitionGatheringStatuses() {
        try {
            LocalDateTime now = LocalDateTime.now();

            // 1) RECRUITING → RECRUITMENT_CLOSED (시간 자동 마감)
            // 알림 대상 모임 ID를 UPDATE 전에 먼저 SELECT
            List<Long> toCloseIds = gatheringRepository
                    .findIdsByRecruitingAndRecruitmentEndBefore(now);

            int closedCount = gatheringRepository.closeExpiredRecruitments(now);

            if (!toCloseIds.isEmpty()) {
                sendBatchNotifications(toCloseIds, "RECRUITMENT_CLOSED",
                        title -> "'" + title + "' 모집이 마감되었습니다.",
                        List.of("PARTICIPATING", "WAITING"));
            }

            // 2) RECRUITMENT_CLOSED → SCHEDULED (알림 없음)
            int scheduledCount = gatheringRepository.promoteClosedToScheduled();

            // 3) SCHEDULED → ONGOING
            List<Long> toStartIds = gatheringRepository.findIdsByScheduledAndStartBefore(now);

            int ongoingCount = gatheringRepository.startDueGatherings(now);

            if (!toStartIds.isEmpty()) {
                sendBatchNotifications(toStartIds, "GATHERING_STARTED",
                        title -> "'" + title + "' 모임이 시작되었습니다.",
                        List.of("PARTICIPATING"));
            }

            // 4) ONGOING → ENDED
            List<Long> toEndIds = gatheringRepository.findIdsByOngoingAndEndBefore(now);

            int endedCount = gatheringRepository.endDueGatherings(now);

            if (!toEndIds.isEmpty()) {
                sendBatchNotifications(toEndIds, "GATHERING_ENDED",
                        title -> "'" + title + "' 모임이 종료되어 앨범이 생성되었습니다.",
                        List.of("PARTICIPATING"));
            }

            log.info("Gathering batch: {} 모집마감, {} 모임예정 전환, {} 모임시작, {} 모임종료",
                    closedCount, scheduledCount, ongoingCount, endedCount);

        } catch (Exception e) {
            log.error("Gathering batch 실행 중 오류 발생 — 다음 실행에서 재시도됩니다: {}", e.getMessage(), e);
        }
    }

    /**
     * 지정 모임 ID 목록의 PARTICIPATING(+선택적 WAITING) 참여자에게 알림 발송.
     * 알림 생성 실패 시 개별 catch로 로깅하고 다음 건으로 진행 — 상태 전환 트랜잭션은 영향 없음.
     */
    @FunctionalInterface
    private interface TitleToMessage {
        String build(String title);
    }

    private void sendBatchNotifications(List<Long> gatheringIds,
                                        String type,
                                        TitleToMessage messageBuilder,
                                        List<String> participantStatuses) {
        try {
            // 모임 title 배치 조회
            List<Gathering> gatherings = gatheringRepository.findByIds(gatheringIds);
            Map<Long, String> titleMap = gatherings.stream()
                    .collect(Collectors.toMap(Gathering::getId, Gathering::getTitle));

            for (Long gatheringId : gatheringIds) {
                String title = titleMap.getOrDefault(gatheringId, "모임");
                String message = messageBuilder.build(title);

                for (String status : participantStatuses) {
                    List<GatheringParticipant> participants =
                            participantRepository.findByGatheringIdAndStatus(gatheringId, status);
                    for (GatheringParticipant p : participants) {
                        try {
                            notificationService.notify(
                                    p.getMemberId(), gatheringId, type, message, null);
                        } catch (Exception e) {
                            log.error("[GATHERING_NOTIFICATION] 배치 알림 실패: type={}, gatheringId={}, memberId={}: {}",
                                    type, gatheringId, p.getMemberId(), e.getMessage());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("[GATHERING_NOTIFICATION] 배치 알림 루프 실패: type={}, ids={}: {}",
                    type, gatheringIds, e.getMessage());
        }
    }
}
