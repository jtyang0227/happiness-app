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
    private String shootType;
    private String clientLabel;
    private String shotOn;
    private String story;
    private boolean pinned;
    private boolean draft;
    private Integer photoCount;
    private List<PhotoResponse> photos;
    /** 보드 카드 콜라주용 — 최대 3개 썸네일 URL (목록 조회 시에만 채워짐) */
    private List<String> previewPhotos;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /** 작업 감상·조회 수와 내가 감상했는지 — 상세 조회(GET /series/{id})에서만 채워짐 */
    private Long appreciationCount;
    private Long viewCount;
    private Boolean appreciatedByMe;
    /** 함께한 사람 — 목록·상세 모두 채움. linked는 상세에서만 계산 */
    private List<CreditDto> credits;

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
                .shootType(series.getShootType())
                .clientLabel(series.getClientLabel())
                .shotOn(series.getShotOn())
                .story(series.getStory())
                .pinned(Boolean.TRUE.equals(series.getPinned()))
                .draft(Boolean.TRUE.equals(series.getDraft()))
                .credits(CreditsJson.read(series.getCreditsJson()))
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
                .shootType(series.getShootType())
                .clientLabel(series.getClientLabel())
                .shotOn(series.getShotOn())
                .story(series.getStory())
                .pinned(Boolean.TRUE.equals(series.getPinned()))
                .draft(Boolean.TRUE.equals(series.getDraft()))
                .credits(CreditsJson.read(series.getCreditsJson()))
                .photoCount(photoCount)
                .previewPhotos(previewPhotos)
                .createdAt(series.getCreatedAt())
                .updatedAt(series.getUpdatedAt())
                .build();
    }
}
