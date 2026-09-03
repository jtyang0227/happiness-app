package com.happiness.app.gathering.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class GatheringUpdateRequest {

    private String title;
    private String description;
    private String detailDescription;
    private String location;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private Integer maxParticipants;
    private LocalDateTime recruitmentEndDateTime;
    private String thumbnailUrl;
    private String preparationNote;
    private String fee;
    private String shootTheme;
    private String locationIntro;
    private String referenceImageUrl;
    private String hashtags;
}
