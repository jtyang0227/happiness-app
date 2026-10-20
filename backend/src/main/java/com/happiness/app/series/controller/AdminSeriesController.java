package com.happiness.app.series.controller;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.series.entity.Series;
import com.happiness.app.series.repository.SeriesRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 운영자 큐레이션 (WORK_QUEUE 8) — 작업을 "에디터 추천"으로 올리고 내린다.
 * URL 레벨(/api/admin/** → WM·SA)과 메서드 레벨 @PreAuthorize 이중 방어(AdminReportController와 같은 관례). 변경은 INFO 로그로 남긴다.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/series")
@RequiredArgsConstructor
public class AdminSeriesController {

    private final SeriesRepository seriesRepository;

    @PutMapping("/{id}/featured")
    @PreAuthorize("hasAnyRole('WM', 'SA')")
    public ResponseEntity<Map<String, Object>> setFeatured(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        if (!(body.get("featured") instanceof Boolean featured)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "featured(true/false)가 필요합니다.");
        }
        Series series = seriesRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "작업을 찾을 수 없습니다."));
        if (featured && Boolean.TRUE.equals(series.getDraft())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "초안 작업은 추천할 수 없어요.");
        }
        seriesRepository.updateFeaturedAt(id, featured ? LocalDateTime.now() : null);
        log.info("[ADMIN] series featured: seriesId={} featured={} by memberId={}",
                id, featured, SecurityUtil.getCurrentMemberId());
        return ResponseEntity.ok(Map.of("id", id, "featured", featured));
    }
}
