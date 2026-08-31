package com.happiness.app.report.dto;

import lombok.Data;

@Data
public class ReportRequest {
    /** COPYRIGHT / INAPPROPRIATE / PRIVACY / SPAM / OTHER */
    private String reason;
    /** 상세 설명 (reason=OTHER 일 때 필수, 그 외 선택) */
    private String detail;
    /** 증거 스크린샷 URL (선택) */
    private String evidenceUrl;
}
