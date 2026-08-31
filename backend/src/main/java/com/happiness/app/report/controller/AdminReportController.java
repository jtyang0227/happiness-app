package com.happiness.app.report.controller;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.report.dto.AdminReportResponse;
import com.happiness.app.report.dto.AdminUpdateReportRequest;
import com.happiness.app.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 어드민 신고 관리 엔드포인트.
 * URL 레벨: SecurityConfig ".requestMatchers("/api/admin/**").hasAnyRole("WM", "SA")"
 * 메서드 레벨: @PreAuthorize 이중 방어 (이 프로젝트 관례 — AuthController 참고)
 */
@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final ReportService reportService;

    /**
     * GET /api/admin/reports?status=&page=&size=
     * 신고 목록 (페이징). status 생략 또는 ALL → 전체.
     * 응답: Page<AdminReportResponse>
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('WM', 'SA')")
    public ResponseEntity<Page<AdminReportResponse>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<AdminReportResponse> result =
                reportService.getAdminReports(status, PageRequest.of(page, size));
        return ResponseEntity.ok(result);
    }

    /**
     * PUT /api/admin/reports/{id}
     * 신고 상태 변경: RESOLVED 또는 DISMISSED. resolutionNote 선택.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('WM', 'SA')")
    public ResponseEntity<AdminReportResponse> update(
            @PathVariable Long id,
            @RequestBody AdminUpdateReportRequest req) {

        String adminEmail = SecurityUtil.getCurrentMemberEmail();
        AdminReportResponse result = reportService.updateReport(id, req, adminEmail);
        return ResponseEntity.ok(result);
    }
}
