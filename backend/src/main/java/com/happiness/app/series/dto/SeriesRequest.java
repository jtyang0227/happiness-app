package com.happiness.app.series.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeriesRequest {
    private Long memberId;
    private String title;
    private String description;
    private String coverImageUrl;
    private Integer displayOrder;
    private String shootType;
    private String clientLabel;
    private String shotOn;
    private String story;
    private Boolean pinned;
}
