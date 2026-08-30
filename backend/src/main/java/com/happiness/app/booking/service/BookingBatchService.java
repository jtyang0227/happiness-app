package com.happiness.app.booking.service;

import com.happiness.app.booking.repository.BookingBlockedDateRepository;
import com.happiness.app.booking.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingBatchService {

    private final BookingRepository bookingRepository;
    private final BookingBlockedDateRepository blockedDateRepository;

    /**
     * 매일 02:00 실행.
     * 1) shootDate가 지난 REQUESTED 예약 → CANCELLED 일괄 전환 (슬롯 점유 버그 해소)
     * 2) blockedDate가 30일 이상 지난 BookingBlockedDate 레코드 삭제
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void expireStaleBookings() {
        try {
            LocalDate today = LocalDate.now();

            int expiredCount = bookingRepository.cancelExpiredRequestedBookings(today);

            LocalDate blockedCutoff = today.minusDays(30);
            int cleanedCount = blockedDateRepository.deleteOldBlockedDates(blockedCutoff);

            log.info("Booking batch: {} REQUESTED 예약 만료, {} 차단 날짜 정리", expiredCount, cleanedCount);
        } catch (Exception e) {
            log.error("Booking batch 실행 중 오류 발생 — 다음 실행에서 재시도됩니다: {}", e.getMessage(), e);
        }
    }
}
