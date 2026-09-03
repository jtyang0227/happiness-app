package com.happiness.app.gathering.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class GatheringPostCommentResponse {
    private Long id;
    private Long gatheringPostId;
    private Long memberId;
    private String memberName;
    private String memberAvatarUrl;
    private String content;
    private LocalDateTime createdAt;
}
