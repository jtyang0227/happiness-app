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
    /** 보드 카드 콜라주용 — 최대 3개 썸네일 URL (목록 조회 시에만 채워짐) */
    private List<String> previewPhotos;
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

    /** 목록용 — photos 필드 제외, previewPhotos(최대 3개)로 보드 카드 콜라주 지원 */
    public static SeriesResponse summary(Series series, int photoCount, String coverUrl, List<String> previewPhotos) {
        String cover = series.getCoverImageUrl() != null ? series.getCoverImageUrl() : coverUrl;
        return SeriesResponse.builder()
                .id(series.getId())
                .memberId(series.getMemberId())
                .title(series.getTitle())
                .description(series.getDescription())
                .coverImageUrl(cover)
                .displayOrder(series.getDisplayOrder())
                .photoCount(photoCount)
                .previewPhotos(previewPhotos)
                .createdAt(series.getCreatedAt())
                .updatedAt(series.getUpdatedAt())
                .build();
    }
}
