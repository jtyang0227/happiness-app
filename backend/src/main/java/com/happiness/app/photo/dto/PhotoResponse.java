package com.happiness.app.photo.dto;

import com.happiness.app.photo.entity.Photo;
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
    private String thumbnailUrl;
    private String description;
    private String imageRatio;
    private Integer likesCount;
    private Integer savesCount;
    private Integer sharesCount;
    private Integer gridColSpan;
    private String dominantColor;
    private String colorMood;
    private String colorPalette;
    private Integer displayOrder;
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
                .thumbnailUrl(photo.getThumbnailUrl())
                .description(photo.getDescription())
                .imageRatio(photo.getImageRatio())
                .likesCount(photo.getLikesCount())
                .savesCount(photo.getSavesCount())
                .sharesCount(photo.getSharesCount())
                .gridColSpan(photo.getGridColSpan() != null ? photo.getGridColSpan() : 6)
                .dominantColor(photo.getDominantColor())
                .colorMood(photo.getColorMood())
                .colorPalette(photo.getColorPalette())
                .displayOrder(photo.getDisplayOrder())
                .createdAt(photo.getCreatedAt())
                .updatedAt(photo.getUpdatedAt())
                .build();
    }
}
