package com.happiness.app.gathering.dto;

import com.happiness.app.gathering.entity.GatheringNotification;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class GatheringNotificationResponse {

    private Long id;
    private Long gatheringId;
    private String type;
    private String message;
    private Long relatedPostId;
    private boolean isRead;
    private LocalDateTime createdAt;

    public static GatheringNotificationResponse from(GatheringNotification n) {
        return GatheringNotificationResponse.builder()
                .id(n.getId())
                .gatheringId(n.getGatheringId())
                .type(n.getType())
                .message(n.getMessage())
                .relatedPostId(n.getRelatedPostId())
                .isRead(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
