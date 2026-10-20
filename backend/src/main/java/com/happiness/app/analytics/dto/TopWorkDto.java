package com.happiness.app.analytics.dto;

import lombok.Builder;
import lombok.Data;

/** 많이 본 작업 — 작업 노트 페이지 조회수와 그 작업에서 온 문의 수 (작업 노트 P2) */
@Data
@Builder
public class TopWorkDto {
    private Long seriesId;
    private String title;
    private String coverImageUrl;
    private long views;
    private long inquiries;
}
