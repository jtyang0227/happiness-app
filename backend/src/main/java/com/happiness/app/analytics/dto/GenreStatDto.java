package com.happiness.app.analytics.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GenreStatDto {
    private String genre;
    private long count;
}
