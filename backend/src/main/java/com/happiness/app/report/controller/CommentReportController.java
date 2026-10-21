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

/** 댓글 신고 — 사진 신고(PhotoReportController)와 같은 신고 큐·같은 사유 목록·같은 rate limit. */
@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentReportController {

    private final ReportService reportService;

    /** POST /api/comments/{commentId}/report */
    @PostMapping("/{commentId}/report")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReportResponse> report(@PathVariable Long commentId, @RequestBody ReportRequest req) {
        ReportResponse resp = reportService.createCommentReport(commentId, SecurityUtil.getCurrentMemberId(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }
}
