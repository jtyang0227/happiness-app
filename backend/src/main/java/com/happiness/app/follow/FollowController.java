package com.happiness.app.follow;

import com.happiness.app.exception.ApiResponse;
import com.happiness.app.member.dto.MemberResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/follows")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    /** 팔로우 */
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> follow(
            @RequestParam Long followerId,
            @RequestParam Long followingId) {
        followService.follow(followerId, followingId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    /** 언팔로우 */
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> unfollow(
            @RequestParam Long followerId,
            @RequestParam Long followingId) {
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
        return ResponseEntity.ok(ApiResponse.ok(followService.getFollowers(memberId)));
    }

    /** 팔로잉 목록 */
    @GetMapping("/following")
    public ResponseEntity<ApiResponse<List<MemberResponse>>> getFollowing(@RequestParam Long memberId) {
        return ResponseEntity.ok(ApiResponse.ok(followService.getFollowing(memberId)));
    }
}
