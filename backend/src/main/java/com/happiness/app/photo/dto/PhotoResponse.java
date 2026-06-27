package com.happiness.app.photo.dto;

import com.happiness.app.photo.entity.Photo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Arrays;
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
    // EXIF
    private String cameraModel;
    private String lensModel;
    private String aperture;
    private String shutterSpeed;
    private Integer iso;
    private String focalLength;
    // Feature 26 — 장르 분류 (subGenres는 List로 직렬화)
    private String genre;
    private List<String> subGenres;
    // Feature 25 — 매거진 판 타입
    private String panType;
    private String magazineCaption;
    private Boolean imageRight;
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
                .genre(photo.getGenre())
                .subGenres(parseSubGenres(photo.getSubGenres()))
                .cameraModel(photo.getCameraModel())
                .lensModel(photo.getLensModel())
                .aperture(photo.getAperture())
                .shutterSpeed(photo.getShutterSpeed())
                .iso(photo.getIso())
                .focalLength(photo.getFocalLength())
                .panType(photo.getPanType() != null ? photo.getPanType() : "EDITORIAL")
                .magazineCaption(photo.getMagazineCaption())
                .imageRight(photo.getImageRight() != null ? photo.getImageRight() : false)
                .createdAt(photo.getCreatedAt())
                .updatedAt(photo.getUpdatedAt())
                .build();
    }

    private static List<String> parseSubGenres(String subGenresJson) {
        if (subGenresJson == null || subGenresJson.isBlank()) return List.of();
        try {
            // 간단한 JSON 배열 파싱: ["FASHION","LIFESTYLE"] → List
            String cleaned = subGenresJson.trim().replaceAll("[\\[\\]\"\\s]", "");
            if (cleaned.isEmpty()) return List.of();
            return Arrays.asList(cleaned.split(","));
        } catch (Exception e) {
            return List.of();
        }
    }
}
