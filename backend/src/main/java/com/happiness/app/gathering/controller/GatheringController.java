package com.happiness.app.gathering.controller;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.gathering.dto.*;
import com.happiness.app.gathering.service.GatheringService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 사진 모임(Photo Gathering) API — Feature 37.
 *
 * 공개 엔드포인트:
 *   GET /api/gatherings          — 목록 (status 필터, 페이징)
 *   GET /api/gatherings/{id}     — 상세
 *
 * 인증 필요 엔드포인트:
 *   POST   /api/gatherings                           — 모임 생성
 *   PUT    /api/gatherings/{id}                      — 모임 수정 (생성자 IDOR)
 *   DELETE /api/gatherings/{id}                      — 모임 삭제 (생성자 IDOR)
 *   GET    /api/gatherings/my                        — 내 모임 목록
 *   POST   /api/gatherings/{id}/participation        — 참여/미참여 응답
 *   DELETE /api/gatherings/{id}/participation        — 참여 취소
 *   GET    /api/gatherings/{id}/participants         — 참여자 목록 (생성자 IDOR)
 *   POST   /api/gatherings/{id}/close-recruitment    — 수동 모집 마감 (생성자 IDOR)
 */
@RestController
@RequestMapping("/api/gatherings")
@RequiredArgsConstructor
public class GatheringController {

    private final GatheringService gatheringService;

    // ── 공개 ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/gatherings?status=RECRUITING&page=0&size=20
     * status 미전달 시 전체 목록 반환.
     */
    @GetMapping
    public ResponseEntity<Page<GatheringResponse>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        return ResponseEntity.ok(gatheringService.getGatherings(status, pageable));
    }

    /**
     * GET /api/gatherings/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<GatheringResponse> detail(@PathVariable Long id) {
        return ResponseEntity.ok(gatheringService.getGathering(id));
    }

    // ── 인증 필요 ─────────────────────────────────────────────────────────────

    /**
     * POST /api/gatherings — 모임 생성 (인증 필요, 모든 회원 가능)
     */
    @PostMapping
    public ResponseEntity<GatheringResponse> create(@RequestBody GatheringCreateRequest req) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        GatheringResponse response = gatheringService.createGathering(memberId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * PUT /api/gatherings/{id} — 모임 수정 (생성자 IDOR)
     */
    @PutMapping("/{id}")
    public ResponseEntity<GatheringResponse> update(
            @PathVariable Long id,
            @RequestBody GatheringUpdateRequest req) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(gatheringService.updateGathering(id, memberId, req));
    }

    /**
     * DELETE /api/gatherings/{id} — 모임 삭제 (생성자 IDOR)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        gatheringService.deleteGathering(id, memberId);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/gatherings/my — 내가 생성하거나 참여(확정/대기) 중인 모임
     */
    @GetMapping("/my")
    public ResponseEntity<List<GatheringResponse>> myGatherings() {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(gatheringService.getMyGatherings(memberId));
    }

    /**
     * POST /api/gatherings/{id}/participation — 참여/미참여 응답
     * Body: { "status": "PARTICIPATING" | "NOT_PARTICIPATING", "reason": "선택사항" }
     */
    @PostMapping("/{id}/participation")
    public ResponseEntity<ParticipantResponse> participate(
            @PathVariable Long id,
            @RequestBody ParticipationRequest req) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(gatheringService.respondParticipation(id, memberId, req));
    }

    /**
     * DELETE /api/gatherings/{id}/participation — 참여 취소
     */
    @DeleteMapping("/{id}/participation")
    public ResponseEntity<Void> cancelParticipation(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        gatheringService.cancelParticipation(id, memberId);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/gatherings/{id}/participants — 참여자/대기자 목록 (생성자 전용)
     */
    @GetMapping("/{id}/participants")
    public ResponseEntity<GatheringParticipantsResponse> participants(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(gatheringService.getParticipants(id, memberId));
    }

    /**
     * POST /api/gatherings/{id}/close-recruitment — 수동 모집 마감 (생성자 전용)
     */
    @PostMapping("/{id}/close-recruitment")
    public ResponseEntity<GatheringResponse> closeRecruitment(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(gatheringService.closeRecruitment(id, memberId));
    }
}
