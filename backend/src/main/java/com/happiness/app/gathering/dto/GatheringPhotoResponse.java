package com.happiness.app.gathering.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GatheringPhotoResponse {
    private Long id;
    private String imageUrl;
    private String caption;
    private Integer sortOrder;
}
