package com.happiness.app.gathering.service;

import com.happiness.app.gathering.dto.*;
import com.happiness.app.gathering.entity.Gathering;
import com.happiness.app.gathering.entity.GatheringParticipant;
import com.happiness.app.gathering.repository.GatheringParticipantRepository;
import com.happiness.app.gathering.repository.GatheringRepository;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class GatheringService {

    private final GatheringRepository gatheringRepository;
    private final GatheringParticipantRepository participantRepository;
    private final GatheringNotificationService notificationService;

    // ── XSS 방지 ──────────────────────────────────────────────────────────────

    private String sanitize(String input) {
        return input == null ? null : input.replaceAll("<[^>]*>", "").trim();
    }

    // ── CREATE ────────────────────────────────────────────────────────────────

    @Transactional
    public GatheringResponse createGathering(Long memberId, GatheringCreateRequest req) {
        validateCreateRequest(req);

        Gathering gathering = Gathering.builder()
                .title(sanitize(req.getTitle()))
                .description(sanitize(req.getDescription()))
                .detailDescription(sanitize(req.getDetailDescription()))
                .location(sanitize(req.getLocation()))
                .startDateTime(req.getStartDateTime())
                .endDateTime(req.getEndDateTime())
                .maxParticipants(req.getMaxParticipants())
                .recruitmentEndDateTime(req.getRecruitmentEndDateTime())
                .status("RECRUITING")
                .thumbnailUrl(sanitize(req.getThumbnailUrl()))
                .preparationNote(sanitize(req.getPreparationNote()))
                .fee(sanitize(req.getFee()))
                .shootTheme(sanitize(req.getShootTheme()))
                .locationIntro(sanitize(req.getLocationIntro()))
                .referenceImageUrl(sanitize(req.getReferenceImageUrl()))
                .hashtags(sanitize(req.getHashtags()))
                .createdBy(memberId)
                .build();

        gathering = gatheringRepository.save(gathering);
        log.info("[GATHERING] 모임 생성: id={}, createdBy={}", gathering.getId(), memberId);
        return toResponse(gathering);
    }

    private void validateCreateRequest(GatheringCreateRequest req) {
        if (req.getTitle() == null || req.getTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "모임 제목은 필수입니다.");
        }
        if (req.getLocation() == null || req.getLocation().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "모임 장소는 필수입니다.");
        }
        if (req.getMaxParticipants() == null || req.getMaxParticipants() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "최대 참여 인원은 1명 이상이어야 합니다.");
        }
        if (req.getStartDateTime() == null || req.getEndDateTime() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "모임 시작/종료 시간은 필수입니다.");
        }
        if (!req.getStartDateTime().isBefore(req.getEndDateTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "모임 시작 시간은 종료 시간보다 이전이어야 합니다.");
        }
        if (req.getRecruitmentEndDateTime() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "모집 마감 시간은 필수입니다.");
        }
        if (req.getRecruitmentEndDateTime().isAfter(req.getStartDateTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "모집 마감 시간은 모임 시작 시간 이전이어야 합니다.");
        }
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────

    @Transactional
    public GatheringResponse updateGathering(Long id, Long memberId, GatheringUpdateRequest req) {
        Gathering gathering = gatheringRepository.findByIdAndCreatedBy(id, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "모임을 찾을 수 없거나 수정 권한이 없습니다."));

        if (req.getTitle() != null && !req.getTitle().isBlank()) {
            gathering.setTitle(sanitize(req.getTitle()));
        }
        if (req.getDescription() != null) {
            gathering.setDescription(sanitize(req.getDescription()));
        }
        if (req.getDetailDescription() != null) {
            gathering.setDetailDescription(sanitize(req.getDetailDescription()));
        }
        if (req.getLocation() != null && !req.getLocation().isBlank()) {
            gathering.setLocation(sanitize(req.getLocation()));
        }
        if (req.getStartDateTime() != null) {
            gathering.setStartDateTime(req.getStartDateTime());
        }
        if (req.getEndDateTime() != null) {
            gathering.setEndDateTime(req.getEndDateTime());
        }
        // re-validate time constraints if both ends were provided or changed
        if (!gathering.getStartDateTime().isBefore(gathering.getEndDateTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "모임 시작 시간은 종료 시간보다 이전이어야 합니다.");
        }
        if (req.getMaxParticipants() != null) {
            if (req.getMaxParticipants() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "최대 참여 인원은 1명 이상이어야 합니다.");
            }
            gathering.setMaxParticipants(req.getMaxParticipants());
        }
        if (req.getRecruitmentEndDateTime() != null) {
            if (req.getRecruitmentEndDateTime().isAfter(gathering.getStartDateTime())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "모집 마감 시간은 모임 시작 시간 이전이어야 합니다.");
            }
            gathering.setRecruitmentEndDateTime(req.getRecruitmentEndDateTime());
        }
        if (req.getThumbnailUrl() != null) {
            gathering.setThumbnailUrl(sanitize(req.getThumbnailUrl()));
        }
        if (req.getPreparationNote() != null) {
            gathering.setPreparationNote(sanitize(req.getPreparationNote()));
        }
        if (req.getFee() != null) {
            gathering.setFee(sanitize(req.getFee()));
        }
        if (req.getShootTheme() != null) {
            gathering.setShootTheme(sanitize(req.getShootTheme()));
        }
        if (req.getLocationIntro() != null) {
            gathering.setLocationIntro(sanitize(req.getLocationIntro()));
        }
        if (req.getReferenceImageUrl() != null) {
            gathering.setReferenceImageUrl(sanitize(req.getReferenceImageUrl()));
        }
        if (req.getHashtags() != null) {
            gathering.setHashtags(sanitize(req.getHashtags()));
        }

        gathering = gatheringRepository.save(gathering);
        return toResponse(gathering);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    @Transactional
    public void deleteGathering(Long id, Long memberId) {
        Gathering gathering = gatheringRepository.findByIdAndCreatedBy(id, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "모임을 찾을 수 없거나 삭제 권한이 없습니다."));

        participantRepository.deleteByGatheringId(id);
        gatheringRepository.delete(gathering);
        log.info("[GATHERING] 모임 삭제: id={}, deletedBy={}", id, memberId);
    }

    // ── LIST (공개) ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<GatheringResponse> getGatherings(String status, Pageable pageable) {
        Page<Gathering> page = (status != null && !status.isBlank())
                ? gatheringRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                : gatheringRepository.findAllByOrderByCreatedAtDesc(pageable);

        return page.map(this::toResponse);
    }

    // ── DETAIL (공개) ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public GatheringResponse getGathering(Long id) {
        Gathering gathering = gatheringRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "모임을 찾을 수 없습니다."));
        return toResponse(gathering);
    }

    // ── MY GATHERINGS (인증) ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GatheringResponse> getMyGatherings(Long memberId) {
        // 1. 직접 생성한 모임
        List<Gathering> created = gatheringRepository.findByCreatedByOrderByCreatedAtDesc(memberId);
        Set<Long> createdIds = created.stream()
                .map(Gathering::getId).collect(Collectors.toSet());

        // 2. 참여 확정 또는 대기 중인 모임
        List<GatheringParticipant> participations = participantRepository
                .findByMemberIdAndStatusIn(memberId, List.of("PARTICIPATING", "WAITING"));

        List<Long> participatedGatheringIds = participations.stream()
                .map(GatheringParticipant::getGatheringId)
                .filter(gid -> !createdIds.contains(gid))   // 중복 제거
                .distinct()
                .collect(Collectors.toList());

        List<Gathering> participated = participatedGatheringIds.isEmpty()
                ? Collections.emptyList()
                : gatheringRepository.findByIdInOrderByCreatedAtDesc(participatedGatheringIds);

        // 3. 합산 후 최신순 정렬
        List<Gathering> all = new ArrayList<>(created);
        all.addAll(participated);
        all.sort(Comparator.comparing(Gathering::getCreatedAt).reversed());

        return all.stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── PARTICIPATION ────────────────────────────────────────────────────────

    @Transactional
    public ParticipantResponse respondParticipation(Long gatheringId, Long memberId,
                                                    ParticipationRequest req) {
        // 클라이언트 허용 값 검증
        String requestedStatus = req.getStatus();
        if (!"PARTICIPATING".equals(requestedStatus) && !"NOT_PARTICIPATING".equals(requestedStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "status는 PARTICIPATING 또는 NOT_PARTICIPATING만 가능합니다.");
        }

        Gathering gathering = gatheringRepository.findById(gatheringId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "모임을 찾을 수 없습니다."));

        // 모집 중 상태인지 확인
        if (!"RECRUITING".equals(gathering.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "모집이 마감된 모임에는 참여/미참여 응답을 변경할 수 없습니다.");
        }

        // 기존 참여 레코드 조회 (upsert)
        Optional<GatheringParticipant> existing =
                participantRepository.findByGatheringIdAndMemberId(gatheringId, memberId);

        GatheringParticipant participant;
        String resolvedStatus;

        if ("PARTICIPATING".equals(requestedStatus)) {
            // 현재 PARTICIPATING 인원 확인 (기존 레코드가 이미 PARTICIPATING이면 정원 체크 불필요)
            long participatingCount = participantRepository.countByGatheringIdAndStatus(
                    gatheringId, "PARTICIPATING");
            boolean alreadyParticipating = existing.map(p -> "PARTICIPATING".equals(p.getStatus()))
                    .orElse(false);

            if (!alreadyParticipating && participatingCount >= gathering.getMaxParticipants()) {
                resolvedStatus = "WAITING";
            } else {
                resolvedStatus = "PARTICIPATING";
            }

            participant = existing.orElseGet(() -> GatheringParticipant.builder()
                    .gatheringId(gatheringId)
                    .memberId(memberId)
                    .build());
            participant.setStatus(resolvedStatus);
            participant.setReason(null);

        } else {
            // NOT_PARTICIPATING
            resolvedStatus = "NOT_PARTICIPATING";
            participant = existing.orElseGet(() -> GatheringParticipant.builder()
                    .gatheringId(gatheringId)
                    .memberId(memberId)
                    .build());
            participant.setStatus(resolvedStatus);
            participant.setReason(sanitize(req.getReason()));
        }

        participant = participantRepository.save(participant);
        log.info("[GATHERING] 참여 응답: gatheringId={}, memberId={}, status={}",
                gatheringId, memberId, resolvedStatus);

        // 이유는 본인이 제출한 내용이므로 응답에 포함
        return toParticipantResponse(participant, true);
    }

    // ── CANCEL PARTICIPATION ─────────────────────────────────────────────────

    @Transactional
    public void cancelParticipation(Long gatheringId, Long memberId) {
        GatheringParticipant participant =
                participantRepository.findByGatheringIdAndMemberId(gatheringId, memberId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "참여 정보를 찾을 수 없습니다."));

        if (!"PARTICIPATING".equals(participant.getStatus()) &&
                !"WAITING".equals(participant.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "취소할 수 있는 상태가 아닙니다.");
        }

        boolean wasParticipating = "PARTICIPATING".equals(participant.getStatus());
        participant.setStatus("CANCELLED");
        participantRepository.save(participant);

        // PARTICIPATING 취소 시 — 모임이 여전히 RECRUITING이면 대기자 1순위 승격
        if (wasParticipating) {
            Gathering gathering = gatheringRepository.findById(gatheringId)
                    .orElse(null);
            if (gathering != null && "RECRUITING".equals(gathering.getStatus())) {
                participantRepository
                        .findFirstByGatheringIdAndStatusOrderByJoinedAtAsc(gatheringId, "WAITING")
                        .ifPresent(waiter -> {
                            waiter.setStatus("PARTICIPATING");
                            participantRepository.save(waiter);
                            log.info("[GATHERING] 대기자 승격: gatheringId={}, memberId={}",
                                    gatheringId, waiter.getMemberId());
                            try {
                                notificationService.notify(
                                        waiter.getMemberId(), gatheringId,
                                        "PARTICIPATION_CONFIRMED",
                                        "'" + gathering.getTitle() + "' 모임 참여가 확정되었습니다.",
                                        null);
                            } catch (Exception e) {
                                log.error("[GATHERING_NOTIFICATION] 대기자 승격 알림 실패: gatheringId={}, memberId={}: {}",
                                        gatheringId, waiter.getMemberId(), e.getMessage());
                            }
                        });
            }
        }

        log.info("[GATHERING] 참여 취소: gatheringId={}, memberId={}", gatheringId, memberId);
    }

    // ── CLOSE RECRUITMENT ─────────────────────────────────────────────────────

    @Transactional
    public GatheringResponse closeRecruitment(Long gatheringId, Long memberId) {
        Gathering gathering = gatheringRepository.findByIdAndCreatedBy(gatheringId, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "모임을 찾을 수 없거나 권한이 없습니다."));

        if ("RECRUITMENT_CLOSED".equals(gathering.getStatus())) {
            // 이미 마감된 경우 — 멱등 처리(현재 상태 그대로 반환)
            return toResponse(gathering);
        }

        if (!"RECRUITING".equals(gathering.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "현재 상태(" + gathering.getStatus() + ")에서는 모집을 마감할 수 없습니다.");
        }

        gathering.setStatus("RECRUITMENT_CLOSED");
        gathering = gatheringRepository.save(gathering);
        log.info("[GATHERING] 모집 마감: id={}, closedBy={}", gatheringId, memberId);

        // 참여 확정 + 대기자 모두에게 모집 마감 알림
        final String gatheringTitle = gathering.getTitle();
        final Long finalGatheringId = gatheringId;
        try {
            List<GatheringParticipant> toNotify = participantRepository
                    .findByGatheringIdAndStatus(gatheringId, "PARTICIPATING");
            toNotify.addAll(participantRepository.findByGatheringIdAndStatus(gatheringId, "WAITING"));
            for (GatheringParticipant p : toNotify) {
                try {
                    notificationService.notify(
                            p.getMemberId(), finalGatheringId,
                            "RECRUITMENT_CLOSED",
                            "'" + gatheringTitle + "' 모집이 마감되었습니다.",
                            null);
                } catch (Exception e) {
                    log.error("[GATHERING_NOTIFICATION] 모집 마감 알림 실패: gatheringId={}, memberId={}: {}",
                            finalGatheringId, p.getMemberId(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("[GATHERING_NOTIFICATION] 모집 마감 알림 목록 조회 실패: gatheringId={}: {}",
                    finalGatheringId, e.getMessage());
        }

        return toResponse(gathering);
    }

    // ── GET PARTICIPANTS (생성자 전용) ────────────────────────────────────────

    @Transactional(readOnly = true)
    public GatheringParticipantsResponse getParticipants(Long gatheringId, Long requesterId) {
        // IDOR: 생성자 본인만
        Gathering gathering = gatheringRepository.findByIdAndCreatedBy(gatheringId, requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "모임을 찾을 수 없거나 접근 권한이 없습니다."));

        List<GatheringParticipant> all =
                participantRepository.findAllByGatheringId(gatheringId);

        List<ParticipantResponse> participating = new ArrayList<>();
        List<ParticipantResponse> waiting = new ArrayList<>();
        List<ParticipantResponse> notParticipating = new ArrayList<>();

        for (GatheringParticipant p : all) {
            // 생성자 화면이므로 reason 항상 포함
            ParticipantResponse resp = toParticipantResponse(p, true);
            switch (p.getStatus()) {
                case "PARTICIPATING"     -> participating.add(resp);
                case "WAITING"          -> waiting.add(resp);
                case "NOT_PARTICIPATING" -> notParticipating.add(resp);
                // CANCELLED는 생략
            }
        }

        return GatheringParticipantsResponse.builder()
                .participating(participating)
                .waiting(waiting)
                .notParticipating(notParticipating)
                .participantCount(participating.size())
                .waitingCount(waiting.size())
                .maxParticipants(gathering.getMaxParticipants())
                .build();
    }

    // ── 내부 헬퍼 ─────────────────────────────────────────────────────────────

    private GatheringResponse toResponse(Gathering g) {
        long participantCount = participantRepository.countByGatheringIdAndStatus(g.getId(), "PARTICIPATING");
        long waitingCount = participantRepository.countByGatheringIdAndStatus(g.getId(), "WAITING");
        return GatheringResponse.builder()
                .id(g.getId())
                .title(g.getTitle())
                .description(g.getDescription())
                .detailDescription(g.getDetailDescription())
                .location(g.getLocation())
                .startDateTime(g.getStartDateTime())
                .endDateTime(g.getEndDateTime())
                .maxParticipants(g.getMaxParticipants())
                .recruitmentEndDateTime(g.getRecruitmentEndDateTime())
                .status(g.getStatus())
                .thumbnailUrl(g.getThumbnailUrl())
                .preparationNote(g.getPreparationNote())
                .fee(g.getFee())
                .shootTheme(g.getShootTheme())
                .locationIntro(g.getLocationIntro())
                .referenceImageUrl(g.getReferenceImageUrl())
                .hashtags(g.getHashtags())
                .createdBy(g.getCreatedBy())
                .createdAt(g.getCreatedAt())
                .participantCount(participantCount)
                .waitingCount(waitingCount)
                .build();
    }

    /**
     * @param includeReason true이면 reason 필드를 응답에 포함 (생성자 전용 화면)
     */
    private ParticipantResponse toParticipantResponse(GatheringParticipant p, boolean includeReason) {
        return ParticipantResponse.builder()
                .id(p.getId())
                .memberId(p.getMemberId())
                .status(p.getStatus())
                .reason(includeReason ? p.getReason() : null)
                .joinedAt(p.getJoinedAt())
                .build();
    }
}
