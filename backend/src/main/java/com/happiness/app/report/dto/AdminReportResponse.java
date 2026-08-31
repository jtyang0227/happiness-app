package com.happiness.app.report.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 어드민 신고 목록 응답 DTO.
 * 프론트엔드 AdminModerationPage.jsx 의 ReportRow 컴포넌트가 기대하는 필드를 그대로 맞춤:
 *   id, photo{id,title,thumbnailUrl}, reason, reporterName, reporterEmail,
 *   reportedAt, status, detail
 * 신규 추가 필드: evidenceUrl, resolutionNote
 */
@Data
@Builder
public class AdminReportResponse {

    private Long id;
    private PhotoSummary photo;
    private String reason;
    private String detail;
    private String evidenceUrl;
    private String reporterName;
    private String reporterEmail;
    private LocalDateTime reportedAt;   // = report.createdAt
    private String status;
    private String resolutionNote;

    @Data
    @Builder
    public static class PhotoSummary {
        private Long id;
        private String title;
        private String thumbnailUrl;
    }
}
