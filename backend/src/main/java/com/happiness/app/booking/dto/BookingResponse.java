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
}
