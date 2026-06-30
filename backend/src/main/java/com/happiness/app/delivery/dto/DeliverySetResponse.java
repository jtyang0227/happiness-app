package com.happiness.app.delivery.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DeliverySetResponse {
    private Long id;
    private String token;
    private String title;
    private String clientName;
    private String status;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private long photoCount;
    private long likedCount;
    private String feedback;
    private LocalDateTime viewedAt;
    private LocalDateTime approvedAt;
    private boolean hasPassword;
}
