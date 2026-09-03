package com.happiness.app.gathering.service;

import com.happiness.app.gathering.repository.GatheringRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class GatheringBatchService {

    private final GatheringRepository gatheringRepository;

    /**
     * 5분마다 실행 — 모임 상태 자동 전환(모집중 → 모집종료 → 모임예정 → 모임진행중 → 모임종료).
     * 1) recruitmentEndDateTime이 지난 RECRUITING 모임 → RECRUITMENT_CLOSED
     *    (운영자가 수동으로 먼저 마감했다면 close-recruitment API에서 이미 처리됨 — 여기선 시간 경과만 잡는다)
     * 2) RECRUITMENT_CLOSED 모임 → SCHEDULED (마감 직후 곧바로 "모임예정" 상태로 노출)
     * 3) startDateTime이 지난 SCHEDULED 모임 → ONGOING
     * 4) endDateTime이 지난 ONGOING 모임 → ENDED
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void transitionGatheringStatuses() {
        try {
            LocalDateTime now = LocalDateTime.now();

            int closedCount = gatheringRepository.closeExpiredRecruitments(now);
            int scheduledCount = gatheringRepository.promoteClosedToScheduled();
            int ongoingCount = gatheringRepository.startDueGatherings(now);
            int endedCount = gatheringRepository.endDueGatherings(now);

            log.info("Gathering batch: {} 모집마감, {} 모임예정 전환, {} 모임시작, {} 모임종료",
                    closedCount, scheduledCount, ongoingCount, endedCount);
        } catch (Exception e) {
            log.error("Gathering batch 실행 중 오류 발생 — 다음 실행에서 재시도됩니다: {}", e.getMessage(), e);
        }
    }
}
