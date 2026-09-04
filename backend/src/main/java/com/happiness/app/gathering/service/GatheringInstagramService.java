package com.happiness.app.gathering.service;

import com.happiness.app.gathering.dto.InstagramShareCandidateResponse;
import com.happiness.app.gathering.dto.InstagramShareRequest;
import com.happiness.app.gathering.dto.InstagramShareResponse;
import com.happiness.app.gathering.entity.GatheringParticipant;
import com.happiness.app.gathering.entity.InstagramStoryShare;
import com.happiness.app.gathering.repository.GatheringParticipantRepository;
import com.happiness.app.gathering.repository.GatheringRepository;
import com.happiness.app.gathering.repository.InstagramStoryShareRepository;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Instagram Story 공유 — Feature 37 Instagram 슬라이스.
 *
 * 이 서비스의 역할:
 *   1. 공유 후보 참여자 목록 반환 (instagramId 보유자만, 본인 제외)
 *   2. 공유 시도 로깅 (서버는 OS 레벨 딥링크 완료 여부를 알 수 없으므로 "시도" 만 기록)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GatheringInstagramService {

    private static final Set<String> ALLOWED_TEMPLATES =
            Set.of("PHOTO_ONLY", "PHOTO_PARTICIPANTS", "PHOTO_TEXT");

    private final GatheringRepository gatheringRepository;
    private final GatheringParticipantRepository participantRepository;
    private final InstagramStoryShareRepository shareRepository;
    private final MemberRepository memberRepository;

    // ── XSS 방지 ──────────────────────────────────────────────────────────────

    private String sanitize(String input) {
        return input == null ? null : input.replaceAll("<[^>]*>", "").trim();
    }

    // ── 공유 후보 목록 ────────────────────────────────────────────────────────

    /**
     * 이 모임의 PARTICIPATING 참여자 중 Instagram ID가 등록된 회원 목록을 반환한다.
     * 요청자 본인은 제외한다. 요청자도 PARTICIPATING이어야 한다(IDOR 겸 권한 검사).
     */
    @Transactional(readOnly = true)
    public List<InstagramShareCandidateResponse> getShareCandidates(Long gatheringId, Long requesterId) {
        // 모임 존재 확인
        gatheringRepository.findById(gatheringId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "모임을 찾을 수 없습니다."));

        // 요청자가 PARTICIPATING 참여자인지 확인
        requireParticipating(gatheringId, requesterId);

        // PARTICIPATING 참여자 전원 조회
        List<GatheringParticipant> participants =
                participantRepository.findByGatheringIdAndStatus(gatheringId, "PARTICIPATING");

        // 본인 제외 후 memberId 수집
        List<Long> otherMemberIds = participants.stream()
                .map(GatheringParticipant::getMemberId)
                .filter(id -> !id.equals(requesterId))
                .collect(Collectors.toList());

        if (otherMemberIds.isEmpty()) {
            return List.of();
        }

        // 배치 조회 (N+1 방지) — instagramId 보유자만 필터링
        List<Member> members = memberRepository.findAllById(otherMemberIds);

        return members.stream()
                .filter(m -> m.getInstagramId() != null && !m.getInstagramId().isBlank())
                .map(m -> InstagramShareCandidateResponse.builder()
                        .memberId(m.getId())
                        .name(m.getName())
                        .avatarUrl(m.getAvatarUrl())
                        .instagramId(m.getInstagramId())
                        .build())
                .collect(Collectors.toList());
    }

    // ── 공유 시도 로깅 ────────────────────────────────────────────────────────

    /**
     * Instagram Story 공유 시도를 기록한다.
     * 실제 OS 레벨 딥링크 성공 여부는 서버가 알 수 없으므로 성공/실패 구분 없이 시도만 저장한다.
     */
    @Transactional
    public InstagramShareResponse logShare(Long gatheringId, Long memberId, InstagramShareRequest req) {
        // 모임 존재 확인
        gatheringRepository.findById(gatheringId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "모임을 찾을 수 없습니다."));

        // 요청자가 PARTICIPATING 참여자인지 확인
        requireParticipating(gatheringId, memberId);

        // template 유효성 검사
        if (req.getTemplate() == null || !ALLOWED_TEMPLATES.contains(req.getTemplate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "유효하지 않은 템플릿입니다. PHOTO_ONLY, PHOTO_PARTICIPANTS, PHOTO_TEXT 중 하나를 사용하세요.");
        }

        // taggedMemberIds 목록 → 콤마 구분 문자열 (Gathering.hashtags 패턴과 동일)
        String taggedMemberIdsStr = null;
        if (req.getTaggedMemberIds() != null && !req.getTaggedMemberIds().isEmpty()) {
            taggedMemberIdsStr = req.getTaggedMemberIds().stream()
                    .map(String::valueOf)
                    .collect(Collectors.joining(","));
        }

        InstagramStoryShare share = InstagramStoryShare.builder()
                .gatheringId(gatheringId)
                .memberId(memberId)
                .gatheringPostId(req.getGatheringPostId())
                .template(req.getTemplate())
                .captionText(sanitize(req.getCaptionText()))
                .taggedMemberIds(taggedMemberIdsStr)
                .build();

        share = shareRepository.save(share);

        log.info("[INSTAGRAM_SHARE] gatheringId={}, memberId={}, template={}, taggedCount={}, sharedAt={}",
                gatheringId, memberId, req.getTemplate(),
                req.getTaggedMemberIds() == null ? 0 : req.getTaggedMemberIds().size(),
                share.getSharedAt());

        return InstagramShareResponse.builder()
                .id(share.getId())
                .sharedAt(share.getSharedAt())
                .build();
    }

    // ── 내부 헬퍼 ─────────────────────────────────────────────────────────────

    /**
     * 요청자가 해당 모임의 PARTICIPATING 참여자인지 검증한다.
     * GatheringPostService.requireParticipantForFeedAction 과 동일한 IDOR 방지 패턴.
     * 단, 이 메서드는 모임 status 제약이 없다 (ENDED 후에도 공유 가능).
     */
    private void requireParticipating(Long gatheringId, Long memberId) {
        GatheringParticipant participant =
                participantRepository.findByGatheringIdAndMemberId(gatheringId, memberId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                                "모임 참여자만 이 기능을 사용할 수 있습니다."));

        if (!"PARTICIPATING".equals(participant.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "참여 확정된 회원만 이 기능을 사용할 수 있습니다.");
        }
    }
}
