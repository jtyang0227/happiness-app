package com.happiness.app.analytics.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TopPhotoDto {
    private Long photoId;
    private String title;
    private String thumbnailUrl;
    private long count;
    private String metric; // likes / views / saves
}
