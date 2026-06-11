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
}
