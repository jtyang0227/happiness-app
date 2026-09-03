package com.happiness.app.gathering.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class GatheringAlbumResponse {
    private Long gatheringId;
    private String title;
    private int photoCount;
    private int postCount;
    private int participantCount;
    /** 모임 전체 사진 — 모든 게시물에서 createdAt ASC 순으로 평탄화 */
    private List<AlbumPhotoItem> photos;

    @Data
    @Builder
    public static class AlbumPhotoItem {
        private String imageUrl;
        private String caption;
        private Long postId;
        private LocalDateTime createdAt;
    }
}
