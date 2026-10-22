package com.happiness.app.feed;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.exception.ApiResponse;
import com.happiness.app.follow.FollowService;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
import com.happiness.app.photo.dto.PhotoResponse;
import com.happiness.app.photo.entity.Photo;
import com.happiness.app.photo.repository.PhotoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
public class FeedController {

    private final FollowService followService;
    private final PhotoRepository photoRepository;
    private final MemberRepository memberRepository;

    /**
     * GET /api/feed?memberId=&page=0&size=20
     * 팔로우한 사람들의 사진을 최신순으로 반환
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PhotoResponse>>> getFeed(
            @RequestParam Long memberId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        // 내 피드만 — 남의 memberId로 그 사람의 팔로우 목록·피드를 엿볼 수 없게. size는 과도한 조회 방지로 1~50
        if (!SecurityUtil.getCurrentMemberId().equals(memberId) && !SecurityUtil.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 피드만 볼 수 있습니다.");
        }
        page = Math.max(0, page);
        size = Math.max(1, Math.min(size, 50));

        List<Long> followingIds = followService.getFollowingIds(memberId);
        if (followingIds.isEmpty())
            return ResponseEntity.ok(ApiResponse.ok(List.of()));

        List<Photo> photos = photoRepository.findByMemberIdInOrderByCreatedAtDesc(
                followingIds, PageRequest.of(page, size));

        List<PhotoResponse> responses = photos.stream()
                .map(PhotoResponse::fromEntity)
                .collect(Collectors.toList());

        Set<Long> memberIds = responses.stream().map(PhotoResponse::getMemberId).collect(Collectors.toSet());
        Map<Long, Member> memberMap = memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::getId, m -> m));
        PhotoResponse.attachMembers(responses, memberMap);

        return ResponseEntity.ok(ApiResponse.ok(responses));
    }
}
