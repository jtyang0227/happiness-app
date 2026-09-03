package com.happiness.app.gathering.service;

import com.happiness.app.gathering.dto.*;
import com.happiness.app.gathering.entity.*;
import com.happiness.app.gathering.repository.*;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 모임 피드(게시물/좋아요/댓글) + 앨범 서비스 — Feature 37 Slice 3.
 *
 * 권한 요약:
 *   - 게시물 작성: PARTICIPATING 참여자 + gathering.status == ONGOING
 *   - 좋아요/댓글:  PARTICIPATING 참여자 + gathering.status in {ONGOING, ENDED}
 *   - 게시물 삭제:  본인(IDOR)
 *   - 피드 조회:    공개, gathering.status in {ONGOING, ENDED}
 *   - 앨범 조회:    공개, gathering.status == ENDED
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class GatheringPostService {

    private final GatheringRepository gatheringRepository;
    private final GatheringParticipantRepository participantRepository;
    private final GatheringPostRepository postRepository;
    private final GatheringPhotoRepository photoRepository;
    private final GatheringPostLikeRepository likeRepository;
    private final GatheringPostCommentRepository commentRepository;
    private final MemberRepository memberRepository;

    // ── XSS 방지 ──────────────────────────────────────────────────────────────

    private String sanitize(String input) {
        return input == null ? null : input.replaceAll("<[^>]*>", "").trim();
    }

    // ── CREATE POST ───────────────────────────────────────────────────────────

    @Transactional
    public GatheringPostResponse createPost(Long gatheringId, Long memberId,
                                            GatheringPostRequest req) {
        // 1. 모임 존재 확인 및 상태 검증
        Gathering gathering = gatheringRepository.findById(gatheringId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "모임을 찾을 수 없습니다."));

        if (!"ONGOING".equals(gathering.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "진행 중인 모임에만 게시물을 올릴 수 있습니다.");
        }

        // 2. 참여자 확인 (IDOR 겸 권한 검사)
        GatheringParticipant participant =
                participantRepository.findByGatheringIdAndMemberId(gatheringId, memberId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                                "모임 참여자만 게시물을 올릴 수 있습니다."));

        if (!"PARTICIPATING".equals(participant.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "참여 확정된 회원만 게시물을 올릴 수 있습니다.");
        }

        // 3. content + photos 둘 다 비어있으면 400
        boolean hasContent = req.getContent() != null && !req.getContent().isBlank();
        boolean hasPhotos  = req.getPhotos() != null && !req.getPhotos().isEmpty();
        if (!hasContent && !hasPhotos) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "내용 또는 사진 중 하나 이상을 입력해야 합니다.");
        }

        // 4. 회원 정보 조회 (비정규화)
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "사용자를 찾을 수 없습니다."));

        // 5. 게시물 저장
        GatheringPost post = GatheringPost.builder()
                .gatheringId(gatheringId)
                .memberId(memberId)
                .memberName(member.getName())
                .memberAvatarUrl(member.getAvatarUrl())
                .content(sanitize(req.getContent()))
                .hashtags(sanitize(req.getHashtags()))
                .build();
        post = postRepository.save(post);
        final Long postId = post.getId();

        // 6. 첨부 사진 저장
        List<GatheringPhoto> savedPhotos = Collections.emptyList();
        if (hasPhotos) {
            List<GatheringPhoto> photos = new ArrayList<>();
            for (GatheringPostRequest.PhotoItem item : req.getPhotos()) {
                if (item.getImageUrl() == null || item.getImageUrl().isBlank()) continue;
                photos.add(GatheringPhoto.builder()
                        .gatheringPostId(postId)
                        .imageUrl(sanitize(item.getImageUrl()))
                        .caption(sanitize(item.getCaption()))
                        .sortOrder(item.getSortOrder() != null ? item.getSortOrder() : 0)
                        .build());
            }
            savedPhotos = photoRepository.saveAll(photos);
        }

        log.info("[GATHERING_POST] 게시물 작성: gatheringId={}, postId={}, memberId={}",
                gatheringId, postId, memberId);

        return buildPostResponse(post, savedPhotos, 0L, Collections.emptyList(), false);
    }

    // ── GET FEED ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<GatheringPostResponse> getFeed(Long gatheringId, Long callerMemberId,
                                               Pageable pageable) {
        Gathering gathering = gatheringRepository.findById(gatheringId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "모임을 찾을 수 없습니다."));

        if (!"ONGOING".equals(gathering.getStatus()) && !"ENDED".equals(gathering.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "진행 중이거나 종료된 모임의 피드만 조회할 수 있습니다.");
        }

        Page<GatheringPost> postPage = postRepository
                .findByGatheringIdOrderByCreatedAtDesc(gatheringId, pageable);

        if (postPage.isEmpty()) {
            return postPage.map(p -> buildPostResponse(p, Collections.emptyList(), 0L,
                    Collections.emptyList(), false));
        }

        // N+1 방지 — 페이지 내 게시물 ID로 일괄 조회
        List<Long> postIds = postPage.getContent().stream()
                .map(GatheringPost::getId).collect(Collectors.toList());

        // 사진 배치 조회 후 postId 기준으로 그룹화
        Map<Long, List<GatheringPhoto>> photosMap = photoRepository.findByPostIds(postIds)
                .stream().collect(Collectors.groupingBy(GatheringPhoto::getGatheringPostId));

        // 좋아요 배치 조회 후 그룹화 (카운트 + likedByMe 계산)
        List<GatheringPostLike> allLikes = likeRepository.findByPostIds(postIds);
        Map<Long, Long> likeCountMap = allLikes.stream()
                .collect(Collectors.groupingBy(GatheringPostLike::getGatheringPostId,
                        Collectors.counting()));
        Set<Long> likedPostIds = (callerMemberId != null)
                ? allLikes.stream()
                        .filter(l -> callerMemberId.equals(l.getMemberId()))
                        .map(GatheringPostLike::getGatheringPostId)
                        .collect(Collectors.toSet())
                : Collections.emptySet();

        // 댓글 배치 조회 후 그룹화
        Map<Long, List<GatheringPostComment>> commentsMap = commentRepository.findByPostIds(postIds)
                .stream().collect(Collectors.groupingBy(GatheringPostComment::getGatheringPostId,
                        Collectors.toList()));

        return postPage.map(post -> {
            List<GatheringPhoto> photos = photosMap.getOrDefault(post.getId(), Collections.emptyList());
            long likeCount = likeCountMap.getOrDefault(post.getId(), 0L);
            List<GatheringPostComment> comments = commentsMap.getOrDefault(post.getId(), Collections.emptyList());
            boolean likedByMe = likedPostIds.contains(post.getId());
            return buildPostResponse(post, photos, likeCount, comments, likedByMe);
        });
    }

    // ── DELETE POST ───────────────────────────────────────────────────────────

    @Transactional
    public void deletePost(Long postId, Long memberId) {
        // IDOR: 작성자 본인 검증 (GatheringService.deleteGathering 패턴과 동일)
        GatheringPost post = postRepository.findByIdAndMemberId(postId, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "게시물을 찾을 수 없거나 삭제 권한이 없습니다."));

        // 연관 레코드 cascade (FK 제약 없이 수동 삭제)
        likeRepository.deleteByGatheringPostId(postId);
        commentRepository.deleteByGatheringPostId(postId);
        photoRepository.deleteByGatheringPostId(postId);
        postRepository.delete(post);

        log.info("[GATHERING_POST] 게시물 삭제: postId={}, deletedBy={}", postId, memberId);
    }

    // ── LIKE ──────────────────────────────────────────────────────────────────

    @Transactional
    public void likePost(Long postId, Long memberId) {
        GatheringPost post = postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "게시물을 찾을 수 없습니다."));

        requireParticipantForFeedAction(post.getGatheringId(), memberId);

        if (likeRepository.existsByGatheringPostIdAndMemberId(postId, memberId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 좋아요를 눌렀습니다.");
        }

        likeRepository.save(GatheringPostLike.builder()
                .gatheringPostId(postId)
                .memberId(memberId)
                .build());
    }

    @Transactional
    public void unlikePost(Long postId, Long memberId) {
        GatheringPost post = postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "게시물을 찾을 수 없습니다."));

        requireParticipantForFeedAction(post.getGatheringId(), memberId);

        GatheringPostLike like = likeRepository
                .findByGatheringPostIdAndMemberId(postId, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "좋아요 기록이 없습니다."));

        likeRepository.delete(like);
    }

    // ── ADD COMMENT ───────────────────────────────────────────────────────────

    @Transactional
    public GatheringPostCommentResponse addComment(Long postId, Long memberId,
                                                   GatheringPostCommentRequest req) {
        if (req.getContent() == null || req.getContent().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 내용을 입력해주세요.");
        }

        GatheringPost post = postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "게시물을 찾을 수 없습니다."));

        requireParticipantForFeedAction(post.getGatheringId(), memberId);

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "사용자를 찾을 수 없습니다."));

        GatheringPostComment comment = GatheringPostComment.builder()
                .gatheringPostId(postId)
                .memberId(memberId)
                .memberName(member.getName())
                .memberAvatarUrl(member.getAvatarUrl())
                .content(sanitize(req.getContent()))
                .build();
        comment = commentRepository.save(comment);

        return toCommentResponse(comment);
    }

    // ── ALBUM ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public GatheringAlbumResponse getAlbum(Long gatheringId) {
        Gathering gathering = gatheringRepository.findById(gatheringId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "모임을 찾을 수 없습니다."));

        if (!"ENDED".equals(gathering.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "종료된 모임의 앨범만 조회할 수 있습니다.");
        }

        // 전체 사진 일괄 조회 (JPQL join — N+1 없음)
        List<GatheringPhoto> allPhotos = photoRepository.findAllPhotosByGatheringId(gatheringId);

        List<GatheringAlbumResponse.AlbumPhotoItem> albumItems = allPhotos.stream()
                .map(p -> GatheringAlbumResponse.AlbumPhotoItem.builder()
                        .imageUrl(p.getImageUrl())
                        .caption(p.getCaption())
                        .postId(p.getGatheringPostId())
                        .createdAt(p.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        long postCount = postRepository.countByGatheringId(gatheringId);
        long participantCount = participantRepository
                .countByGatheringIdAndStatus(gatheringId, "PARTICIPATING");

        return GatheringAlbumResponse.builder()
                .gatheringId(gatheringId)
                .title(gathering.getTitle())
                .photoCount(albumItems.size())
                .postCount((int) postCount)
                .participantCount((int) participantCount)
                .photos(albumItems)
                .build();
    }

    // ── 내부 헬퍼 ─────────────────────────────────────────────────────────────

    /**
     * 좋아요/댓글 공통 참여자 + 상태 검증.
     * gathering.status in {ONGOING, ENDED} + 해당 회원이 PARTICIPATING 상태여야 한다.
     */
    private void requireParticipantForFeedAction(Long gatheringId, Long memberId) {
        Gathering gathering = gatheringRepository.findById(gatheringId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "모임을 찾을 수 없습니다."));

        if (!"ONGOING".equals(gathering.getStatus()) && !"ENDED".equals(gathering.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "진행 중이거나 종료된 모임에서만 좋아요/댓글을 사용할 수 있습니다.");
        }

        GatheringParticipant participant =
                participantRepository.findByGatheringIdAndMemberId(gatheringId, memberId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                                "모임 참여자만 이 기능을 사용할 수 있습니다."));

        if (!"PARTICIPATING".equals(participant.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "참여 확정된 회원만 이 기능을 사용할 수 있습니다.");
        }
    }

    private GatheringPostResponse buildPostResponse(GatheringPost post,
                                                     List<GatheringPhoto> photos,
                                                     long likeCount,
                                                     List<GatheringPostComment> comments,
                                                     boolean likedByMe) {
        List<GatheringPhotoResponse> photoResponses = photos.stream()
                .map(p -> GatheringPhotoResponse.builder()
                        .id(p.getId())
                        .imageUrl(p.getImageUrl())
                        .caption(p.getCaption())
                        .sortOrder(p.getSortOrder())
                        .build())
                .collect(Collectors.toList());

        List<GatheringPostCommentResponse> commentResponses = comments.stream()
                .map(this::toCommentResponse)
                .collect(Collectors.toList());

        return GatheringPostResponse.builder()
                .id(post.getId())
                .gatheringId(post.getGatheringId())
                .memberId(post.getMemberId())
                .memberName(post.getMemberName())
                .memberAvatarUrl(post.getMemberAvatarUrl())
                .content(post.getContent())
                .hashtags(post.getHashtags())
                .photos(photoResponses)
                .likeCount(likeCount)
                .commentCount(commentResponses.size())
                .comments(commentResponses)
                .likedByMe(likedByMe)
                .createdAt(post.getCreatedAt())
                .build();
    }

    private GatheringPostCommentResponse toCommentResponse(GatheringPostComment c) {
        return GatheringPostCommentResponse.builder()
                .id(c.getId())
                .gatheringPostId(c.getGatheringPostId())
                .memberId(c.getMemberId())
                .memberName(c.getMemberName())
                .memberAvatarUrl(c.getMemberAvatarUrl())
                .content(c.getContent())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
