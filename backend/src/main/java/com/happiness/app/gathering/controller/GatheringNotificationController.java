package com.happiness.app.gathering.controller;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.gathering.dto.GatheringNotificationResponse;
import com.happiness.app.gathering.service.GatheringNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 모임 인앱 알림 API — Feature 37 Phase 1.
 *
 * 모든 엔드포인트는 인증 필요 (JWT).
 *
 * GET  /api/gatherings/notifications?page=&size=   — 내 알림 목록 (최신순, 페이징)
 * GET  /api/gatherings/notifications/unread-count  — 읽지 않은 알림 수 { "count": N }
 * PUT  /api/gatherings/notifications/{id}/read     — 단건 읽음 처리 (IDOR)
 * POST /api/gatherings/notifications/read-all      — 전체 읽음 처리
 */
@RestController
@RequestMapping("/api/gatherings/notifications")
@RequiredArgsConstructor
public class GatheringNotificationController {

    private final GatheringNotificationService notificationService;

    /**
     * GET /api/gatherings/notifications?page=0&size=20
     * 내 알림 목록 — 최신순 페이징.
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<GatheringNotificationResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        return ResponseEntity.ok(notificationService.getMyNotifications(memberId, pageable));
    }

    /**
     * GET /api/gatherings/notifications/unread-count
     * 읽지 않은 알림 수 — { "count": N } 형태.
     * PhotoReportController.myUnreadCount() 와 동일한 응답 구조.
     */
    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        Long memberId = SecurityUtil.getCurrentMemberId();
        long count = notificationService.getUnreadCount(memberId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /**
     * PUT /api/gatherings/notifications/{id}/read
     * 단건 읽음 처리 — IDOR (수신자 본인만).
     */
    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        notificationService.markRead(id, memberId);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/gatherings/notifications/read-all
     * 전체 읽음 처리.
     */
    @PostMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAllRead() {
        Long memberId = SecurityUtil.getCurrentMemberId();
        notificationService.markAllRead(memberId);
        return ResponseEntity.noContent().build();
    }
}
