package com.happiness.app.series.dto;

import com.happiness.app.photo.dto.PhotoResponse;
import com.happiness.app.series.entity.Series;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeriesResponse {
    private Long id;
    private Long memberId;
    private String title;
    private String description;
    private String coverImageUrl;
    private Integer displayOrder;
    private Integer photoCount;
    private List<PhotoResponse> photos;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SeriesResponse fromEntity(Series series, List<PhotoResponse> photos) {
        String cover = series.getCoverImageUrl();
        if (cover == null && photos != null && !photos.isEmpty()) {
            cover = photos.get(0).getThumbnailUrl() != null
                    ? photos.get(0).getThumbnailUrl()
                    : photos.get(0).getImageUrl();
        }
        return SeriesResponse.builder()
                .id(series.getId())
                .memberId(series.getMemberId())
                .title(series.getTitle())
                .description(series.getDescription())
                .coverImageUrl(cover)
                .displayOrder(series.getDisplayOrder())
                .photoCount(photos != null ? photos.size() : 0)
                .photos(photos)
                .createdAt(series.getCreatedAt())
                .updatedAt(series.getUpdatedAt())
                .build();
    }

    /** 목록용 — photos 필드 제외 */
    public static SeriesResponse summary(Series series, int photoCount, String coverUrl) {
        String cover = series.getCoverImageUrl() != null ? series.getCoverImageUrl() : coverUrl;
        return SeriesResponse.builder()
                .id(series.getId())
                .memberId(series.getMemberId())
                .title(series.getTitle())
                .description(series.getDescription())
                .coverImageUrl(cover)
                .displayOrder(series.getDisplayOrder())
                .photoCount(photoCount)
                .createdAt(series.getCreatedAt())
                .updatedAt(series.getUpdatedAt())
                .build();
    }
}
