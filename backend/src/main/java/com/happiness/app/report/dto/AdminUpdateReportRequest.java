package com.happiness.app.report.dto;

import lombok.Data;

@Data
public class AdminUpdateReportRequest {
    /** RESOLVED 또는 DISMISSED */
    private String status;
    /** 처리 메모 (신고자에게 표시, 선택) */
    private String resolutionNote;
}
