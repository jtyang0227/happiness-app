package com.happiness.app.gathering.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class GatheringCreateRequest {

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

    /** 출사 스팟 id — 수정 시 null이면 변경 없음, 0이면 연결 해제 */
    private Long spotId;
    private Boolean beginnerFriendly;
    private Boolean portraitConsentRule;
}
