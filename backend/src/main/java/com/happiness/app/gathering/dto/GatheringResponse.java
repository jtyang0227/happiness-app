package com.happiness.app.gathering.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class GatheringResponse {

    private Long id;
    private String title;
    private String description;
    private String detailDescription;
    private String location;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private Integer maxParticipants;
    private LocalDateTime recruitmentEndDateTime;
    private String status;
    private String thumbnailUrl;
    private String preparationNote;
    private String fee;
    private String shootTheme;
    private String locationIntro;
    private String referenceImageUrl;
    private String hashtags;
    private Long createdBy;
    private LocalDateTime createdAt;

    /** 현재 PARTICIPATING 인원 */
    private long participantCount;

    /** 현재 WAITING 인원 */
    private long waitingCount;
}
