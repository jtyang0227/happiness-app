package com.happiness.app.gathering.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class GatheringPostResponse {
    private Long id;
    private Long gatheringId;
    private Long memberId;
    private String memberName;
    private String memberAvatarUrl;
    private String content;
    private String hashtags;
    private List<GatheringPhotoResponse> photos;
    private long likeCount;
    private long commentCount;
    private List<GatheringPostCommentResponse> comments;
    /** 현재 요청자가 이미 좋아요를 눌렀는지. 비인증 요청 시 항상 false. */
    private boolean likedByMe;
    private LocalDateTime createdAt;
}
