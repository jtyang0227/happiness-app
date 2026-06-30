package com.happiness.app.meet.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class MeetResponse {
    private Long id;
    private String status;

    private Long requesterId;
    private String requesterName;
    private String requesterAvatarUrl;
    private String requesterProfileName;

    private Long receiverId;
    private String receiverName;
    private String receiverAvatarUrl;
    private String receiverProfileName;

    private String locationName;
    private String locationAddress;
    private Double locationLat;
    private Double locationLng;

    private LocalDate confirmedDate;
    private String confirmedTime;
    private String initialMessage;

    private long messageCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
