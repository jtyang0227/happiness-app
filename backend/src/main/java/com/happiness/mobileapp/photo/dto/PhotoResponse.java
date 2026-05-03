package com.happiness.mobileapp.photo.dto;

import com.happiness.mobileapp.photo.entity.Photo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoResponse {
    private Long id;
    private Long memberId;
    private String title;
    private String imageUrl;
    private String description;
    private String imageRatio;
    private Integer likesCount;
    private Integer sharesCount;
    private boolean isLiked;
    private boolean isSaved;
    private List<PhotoTagDto> tags;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PhotoResponse fromEntity(Photo photo) {
        return PhotoResponse.builder()
                .id(photo.getId())
                .memberId(photo.getMemberId())
                .title(photo.getTitle())
                .imageUrl(photo.getImageUrl())
                .description(photo.getDescription())
                .imageRatio(photo.getImageRatio())
                .likesCount(photo.getLikesCount())
                .sharesCount(photo.getSharesCount())
                .createdAt(photo.getCreatedAt())
                .updatedAt(photo.getUpdatedAt())
                .build();
    }
}
