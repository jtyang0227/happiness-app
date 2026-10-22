package com.happiness.app.follow;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.exception.ApiResponse;
import com.happiness.app.member.dto.MemberResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/follows")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    /** 팔로우·언팔로우는 로그인 회원 본인으로만 — 예전엔 followerId를 그대로 믿어 남을 대신 팔로우·언팔로우할 수 있었다 */
    private static void requireSelf(Long followerId) {
        if (!SecurityUtil.getCurrentMemberId().equals(followerId) && !SecurityUtil.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 계정으로만 할 수 있습니다.");
        }
    }

    /** 팔로우 */
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> follow(
            @RequestParam Long followerId,
            @RequestParam Long followingId) {
        requireSelf(followerId);
        followService.follow(followerId, followingId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    /** 언팔로우 */
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> unfollow(
            @RequestParam Long followerId,
            @RequestParam Long followingId) {
        requireSelf(followerId);
        followService.unfollow(followerId, followingId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    /** 팔로우 여부 확인 */
    @GetMapping("/check")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> check(
            @RequestParam Long followerId,
            @RequestParam Long followingId) {
        return ResponseEntity.ok(ApiResponse.ok(
                Map.of("following", followService.isFollowing(followerId, followingId))
        ));
    }

    /** 팔로워/팔로잉 수 */
    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> count(@RequestParam Long memberId) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "followerCount",  followService.getFollowerCount(memberId),
                "followingCount", followService.getFollowingCount(memberId)
        )));
    }

    /** 팔로워 목록 */
    @GetMapping("/followers")
    public ResponseEntity<ApiResponse<List<MemberResponse>>> getFollowers(@RequestParam Long memberId) {
        return ResponseEntity.ok(ApiResponse.ok(followService.getFollowers(memberId).stream()
                .map(MemberResponse::withoutContact).toList()));   // 남의 연락처 제외
    }

    /** 팔로잉 목록 */
    @GetMapping("/following")
    public ResponseEntity<ApiResponse<List<MemberResponse>>> getFollowing(@RequestParam Long memberId) {
        return ResponseEntity.ok(ApiResponse.ok(followService.getFollowing(memberId).stream()
                .map(MemberResponse::withoutContact).toList()));   // 남의 연락처 제외
    }
}
