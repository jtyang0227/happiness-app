package com.happiness.app.gathering.controller;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.gathering.dto.InstagramShareCandidateResponse;
import com.happiness.app.gathering.dto.InstagramShareRequest;
import com.happiness.app.gathering.dto.InstagramShareResponse;
import com.happiness.app.gathering.service.GatheringInstagramService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Instagram Story 공유 API — Feature 37 Instagram 슬라이스.
 *
 * 두 엔드포인트 모두 인증 필요.
 * SecurityConfig 의 anyRequest().authenticated() 처리에 해당:
 *   - GET  /api/gatherings/{id}/instagram-candidates 는 GET /api/gatherings/* 패턴(단일 세그먼트)에
 *     매칭되지 않으므로 anyRequest().authenticated() 로 처리됨 (검증 완료).
 *   - POST /api/gatherings/{id}/instagram-share 역시 기존 permitAll POST 패턴과 충돌 없음 (검증 완료).
 */
@RestController
@RequestMapping("/api/gatherings")
@RequiredArgsConstructor
public class GatheringInstagramController {

    private final GatheringInstagramService instagramService;

    /**
     * GET /api/gatherings/{id}/instagram-candidates
     *
     * 이 모임에서 Instagram ID가 등록된 PARTICIPATING 참여자 목록을 반환한다 (본인 제외).
     * 클라이언트는 이 목록으로 "스토리에 태그할 참여자" 체크리스트를 구성한다.
     * 요청자도 PARTICIPATING이어야 접근 가능 (403 otherwise).
     */
    @GetMapping("/{id}/instagram-candidates")
    public ResponseEntity<List<InstagramShareCandidateResponse>> getCandidates(
            @PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(instagramService.getShareCandidates(id, memberId));
    }

    /**
     * POST /api/gatherings/{id}/instagram-share
     *
     * Instagram Story 공유 시도를 서버에 기록한다.
     * 실제 공유(OS 레벨 딥링크 완료)는 모바일 클라이언트에서 처리하며,
     * 서버는 "시도" 만 기록하고 성공/실패를 추적하지 않는다.
     *
     * Body: { gatheringPostId?, template, captionText?, taggedMemberIds?: [Long] }
     */
    @PostMapping("/{id}/instagram-share")
    public ResponseEntity<InstagramShareResponse> logShare(
            @PathVariable Long id,
            @RequestBody InstagramShareRequest req) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(instagramService.logShare(id, memberId, req));
    }
}
