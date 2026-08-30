package com.happiness.app.meet.service;

import com.happiness.app.meet.repository.MeetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Slf4j
@Service
@RequiredArgsConstructor
public class MeetBatchService {

    private final MeetRepository meetRepository;

    /**
     * 매일 03:00 실행.
     * confirmedDate가 지난 CONFIRMED 약속 → COMPLETED 일괄 전환
     * (약속 목록 "확정" 탭에 이미 지난 약속이 남아 있는 UX 문제 해소)
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void completeExpiredMeets() {
        try {
            LocalDate today = LocalDate.now();

            int count = meetRepository.completeExpiredConfirmedMeets(today);

            log.info("Meet batch: {} 약속 자동 완료 처리", count);
        } catch (Exception e) {
            log.error("Meet batch 실행 중 오류 발생 — 다음 실행에서 재시도됩니다: {}", e.getMessage(), e);
        }
    }
}
