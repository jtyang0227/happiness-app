package com.happiness.app.photo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PhotoRequest {
    private Long memberId;
    private String title;
    private String imageUrl;
    private String description;
    private String imageRatio;
    private Integer gridColSpan;
    private String colorMood;
    // EXIF
    private String cameraModel;
    private String lensModel;
    private String aperture;
    private String shutterSpeed;
    private Integer iso;
    private String focalLength;
    // Feature 26 — 장르 분류
    private String genre;
    private String subGenres;  // JSON 배열 문자열 예: '["FASHION","LIFESTYLE"]'
    // Feature 25 — 매거진 판 타입
    private String panType;
    private String magazineCaption;
    private Boolean imageRight;
}
