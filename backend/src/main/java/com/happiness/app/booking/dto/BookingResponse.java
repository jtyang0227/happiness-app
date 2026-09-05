package com.happiness.app.booking.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class BookingResponse {
    private Long id;
    private Long memberId;
    private LocalDate shootDate;
    private String shootTime;
    private String shootType;
    private String clientName;
    private String clientPhone;
    private String clientEmail;
    private String memo;
    private String status;
    private String rejectReason;
    private LocalDateTime createdAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime cancelledAt;

    // Feature 39(b) — 촬영 준비 체크리스트
    private String checklistJson;
    private LocalDate deliveryDeadline;

    // Feature 39(c) — 계약금/잔금 수금 상태
    private String depositStatus;
    private Integer depositAmount;
    private LocalDateTime depositReceivedAt;
    private String balanceStatus;
    private Integer balanceAmount;
    private LocalDateTime balanceReceivedAt;
}
