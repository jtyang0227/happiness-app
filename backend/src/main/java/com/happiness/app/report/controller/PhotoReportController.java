package com.happiness.app.report.controller;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.report.dto.ReportRequest;
import com.happiness.app.report.dto.ReportResponse;
import com.happiness.app.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 일반 사용자용 신고 엔드포인트.
 * 모든 메서드는 인증 필수 (SecurityConfig anyRequest().authenticated() + @PreAuthorize 이중 방어).
 */
@RestController
@RequestMapping("/api/photos")
@RequiredArgsConstructor
public class PhotoReportController {

    private final ReportService reportService;

    /**
     * POST /api/photos/{photoId}/report
     * 사진 신고 접수. rate limit: 10분에 5건.
     */
    @PostMapping("/{photoId}/report")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReportResponse> report(
            @PathVariable Long photoId,
            @RequestBody ReportRequest req) {
        Long reporterId = SecurityUtil.getCurrentMemberId();
        ReportResponse resp = reportService.createReport(photoId, reporterId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    /**
     * GET /api/photos/reports/mine
     * 본인이 제출한 신고 목록 (최신순).
     */
    @GetMapping("/reports/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ReportResponse>> myReports() {
        Long reporterId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(reportService.getMyReports(reporterId));
    }

    /**
     * GET /api/photos/reports/mine/unread-count
     * 처리 완료됐으나 아직 확인하지 않은 신고 결과 수.
     * 응답 형태: { "count": N } — InquiryController.getUnreadCount 와 동일한 구조
     */
    @GetMapping("/reports/mine/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Long>> myUnreadCount() {
        Long reporterId = SecurityUtil.getCurrentMemberId();
        long count = reportService.getMyUnreadCount(reporterId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /**
     * PUT /api/photos/reports/mine/{id}/seen
     * 처리 결과 확인 처리. IDOR-safe (본인 신고만).
     */
    @PutMapping("/reports/mine/{id}/seen")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> markSeen(@PathVariable Long id) {
        Long reporterId = SecurityUtil.getCurrentMemberId();
        reportService.markSeen(id, reporterId);
        return ResponseEntity.ok(Map.of("message", "확인 처리되었습니다."));
    }
}
