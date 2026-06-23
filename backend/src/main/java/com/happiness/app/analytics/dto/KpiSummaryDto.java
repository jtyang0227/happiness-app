package com.happiness.app.analytics.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class KpiSummaryDto {
    private long portfolioViews;
    private long portfolioViewsPrev;
    private double portfolioViewsChange;   // % change vs previous period

    private long totalLikes;
    private long totalLikesPrev;
    private double totalLikesChange;

    private long totalSaves;
    private long totalSavesPrev;
    private double totalSavesChange;

    private long inquiryCount;
    private long inquiryCountPrev;
    private double inquiryCountChange;

    private int period; // days
}
