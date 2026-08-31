package com.happiness.app.report.dto;

import com.happiness.app.report.entity.Report;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/** 신고자(일반 사용자) 본인 목록 조회용 응답 DTO */
@Data
@Builder
public class ReportResponse {
    private Long id;
    private Long photoId;
    private String reason;
    private String detail;
    private String evidenceUrl;
    private String status;
    private String resolutionNote;
    private boolean reporterSeen;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;

    public static ReportResponse from(Report r) {
        return ReportResponse.builder()
                .id(r.getId())
                .photoId(r.getPhotoId())
                .reason(r.getReason())
                .detail(r.getDetail())
                .evidenceUrl(r.getEvidenceUrl())
                .status(r.getStatus())
                .resolutionNote(r.getResolutionNote())
                .reporterSeen(r.isReporterSeen())
                .createdAt(r.getCreatedAt())
                .resolvedAt(r.getResolvedAt())
                .build();
    }
}
