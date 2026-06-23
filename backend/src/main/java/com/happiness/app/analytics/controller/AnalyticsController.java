package com.happiness.app.analytics.controller;

import com.happiness.app.analytics.dto.*;
import com.happiness.app.analytics.service.AnalyticsService;
import com.happiness.app.common.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * POST /api/analytics/track — 이벤트 추적 (인증 불필요, visitorToken 기준 rate limit)
     */
    @PostMapping("/track")
    public ResponseEntity<Void> track(@RequestBody TrackEventRequest req) {
        analyticsService.trackEvent(req);
        return ResponseEntity.ok().build();
    }

    /**
     * GET /api/analytics/summary — KPI 요약 (인증 필요, 본인만)
     */
    @GetMapping("/summary")
    public ResponseEntity<KpiSummaryDto> summary(
            @RequestParam Long memberId,
            @RequestParam(defaultValue = "7") int period) {
        verifyMemberAccess(memberId);
        return ResponseEntity.ok(analyticsService.getSummary(memberId, period));
    }

    /**
     * GET /api/analytics/daily — 일별 조회수 (인증 필요, 본인만)
     */
    @GetMapping("/daily")
    public ResponseEntity<List<DailyViewDto>> daily(
            @RequestParam Long memberId,
            @RequestParam(defaultValue = "30") int period) {
        verifyMemberAccess(memberId);
        return ResponseEntity.ok(analyticsService.getDailyViews(memberId, period));
    }

    /**
     * GET /api/analytics/top-photos — 인기 사진 (인증 필요, 본인만)
     */
    @GetMapping("/top-photos")
    public ResponseEntity<List<TopPhotoDto>> topPhotos(
            @RequestParam Long memberId,
            @RequestParam(defaultValue = "views") String metric,
            @RequestParam(defaultValue = "5") int limit) {
        verifyMemberAccess(memberId);
        int safeLimit = Math.max(1, Math.min(20, limit));
        return ResponseEntity.ok(analyticsService.getTopPhotos(memberId, metric, safeLimit));
    }

    /**
     * GET /api/analytics/genre-distribution — 장르 분포 (인증 필요, 본인만)
     */
    @GetMapping("/genre-distribution")
    public ResponseEntity<List<GenreStatDto>> genreDistribution(@RequestParam Long memberId) {
        verifyMemberAccess(memberId);
        return ResponseEntity.ok(analyticsService.getGenreDistribution(memberId));
    }

    private void verifyMemberAccess(Long memberId) {
        Long currentMemberId = SecurityUtil.getCurrentMemberId();
        if (!currentMemberId.equals(memberId) && !SecurityUtil.isAdmin()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "접근 권한이 없습니다");
        }
    }
}
