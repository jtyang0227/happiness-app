package com.happiness.app.feed;

import com.happiness.app.exception.ApiResponse;
import com.happiness.app.follow.FollowService;
import com.happiness.app.photo.dto.PhotoResponse;
import com.happiness.app.photo.entity.Photo;
import com.happiness.app.photo.repository.PhotoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
public class FeedController {

    private final FollowService followService;
    private final PhotoRepository photoRepository;

    /**
     * GET /api/feed?memberId=&page=0&size=20
     * 팔로우한 사람들의 사진을 최신순으로 반환
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PhotoResponse>>> getFeed(
            @RequestParam Long memberId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        List<Long> followingIds = followService.getFollowingIds(memberId);
        if (followingIds.isEmpty())
            return ResponseEntity.ok(ApiResponse.ok(List.of()));

        List<Photo> photos = photoRepository.findByMemberIdInOrderByCreatedAtDesc(
                followingIds, PageRequest.of(page, size));

        List<PhotoResponse> responses = photos.stream()
                .map(PhotoResponse::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(responses));
    }
}
