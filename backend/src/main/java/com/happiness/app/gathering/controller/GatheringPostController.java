package com.happiness.app.gathering.controller;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.gathering.dto.*;
import com.happiness.app.gathering.service.GatheringPostService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 모임 피드(게시물/좋아요/댓글) + 앨범 API — Feature 37 Slice 3.
 *
 * 공개 엔드포인트 (SecurityConfig permitAll 등록 필요):
 *   GET /api/gatherings/{gatheringId}/posts   — 피드 (ONGOING/ENDED 상태만)
 *   GET /api/gatherings/{gatheringId}/album   — 앨범 (ENDED 상태만)
 *
 * 인증 필요 엔드포인트:
 *   POST   /api/gatherings/{gatheringId}/posts          — 게시물 작성 (PARTICIPATING + ONGOING)
 *   DELETE /api/gatherings/posts/{postId}               — 게시물 삭제 (본인 IDOR)
 *   POST   /api/gatherings/posts/{postId}/like          — 좋아요 (PARTICIPATING + ONGOING/ENDED)
 *   DELETE /api/gatherings/posts/{postId}/like          — 좋아요 취소
 *   POST   /api/gatherings/posts/{postId}/comments      — 댓글 작성 (PARTICIPATING + ONGOING/ENDED)
 */
@RestController
@RequestMapping("/api/gatherings")
@RequiredArgsConstructor
public class GatheringPostController {

    private final GatheringPostService postService;

    // ── 공개 ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/gatherings/{gatheringId}/posts?page=0&size=20
     * 피드 조회 — 공개 엔드포인트, 인증 시 likedByMe 포함.
     */
    @GetMapping("/{gatheringId}/posts")
    public ResponseEntity<Page<GatheringPostResponse>> getFeed(
            @PathVariable Long gatheringId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        // 공개 엔드포인트이므로 비인증 요청 시 null — likedByMe는 service에서 false 처리
        Long callerMemberId = SecurityUtil.isAuthenticated()
                ? SecurityUtil.getCurrentMemberId() : null;
        return ResponseEntity.ok(postService.getFeed(gatheringId, callerMemberId, pageable));
    }

    /**
     * GET /api/gatherings/{gatheringId}/album
     * 앨범 조회 — 공개 엔드포인트, gathering.status == ENDED 만 반환.
     */
    @GetMapping("/{gatheringId}/album")
    public ResponseEntity<GatheringAlbumResponse> getAlbum(@PathVariable Long gatheringId) {
        return ResponseEntity.ok(postService.getAlbum(gatheringId));
    }

    // ── 인증 필요 ─────────────────────────────────────────────────────────────

    /**
     * POST /api/gatherings/{gatheringId}/posts
     * 게시물 작성 — PARTICIPATING 참여자 + ONGOING 상태 모임만 가능.
     */
    @PostMapping("/{gatheringId}/posts")
    public ResponseEntity<GatheringPostResponse> createPost(
            @PathVariable Long gatheringId,
            @RequestBody GatheringPostRequest req) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        GatheringPostResponse response = postService.createPost(gatheringId, memberId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * DELETE /api/gatherings/posts/{postId}
     * 게시물 삭제 — 작성자 본인만 (IDOR 검증).
     */
    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<Void> deletePost(@PathVariable Long postId) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        postService.deletePost(postId, memberId);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/gatherings/posts/{postId}/like
     * 좋아요 — PARTICIPATING 참여자 + ONGOING/ENDED 상태.
     */
    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<Void> likePost(@PathVariable Long postId) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        postService.likePost(postId, memberId);
        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/gatherings/posts/{postId}/like
     * 좋아요 취소 — PARTICIPATING 참여자 + ONGOING/ENDED 상태.
     */
    @DeleteMapping("/posts/{postId}/like")
    public ResponseEntity<Void> unlikePost(@PathVariable Long postId) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        postService.unlikePost(postId, memberId);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/gatherings/posts/{postId}/comments
     * 댓글 작성 — PARTICIPATING 참여자 + ONGOING/ENDED 상태.
     */
    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<GatheringPostCommentResponse> addComment(
            @PathVariable Long postId,
            @RequestBody GatheringPostCommentRequest req) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(postService.addComment(postId, memberId, req));
    }
}
