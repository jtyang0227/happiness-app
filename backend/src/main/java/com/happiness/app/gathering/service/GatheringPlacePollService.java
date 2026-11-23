package com.happiness.app.gathering.service;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.gathering.entity.Gathering;
import com.happiness.app.gathering.entity.GatheringParticipant;
import com.happiness.app.gathering.entity.GatheringPlaceOption;
import com.happiness.app.gathering.entity.GatheringPlaceVote;
import com.happiness.app.gathering.repository.GatheringParticipantRepository;
import com.happiness.app.gathering.repository.GatheringPlaceOptionRepository;
import com.happiness.app.gathering.repository.GatheringPlaceVoteRepository;
import com.happiness.app.gathering.repository.GatheringRepository;
import com.happiness.app.spot.Spot;
import com.happiness.app.spot.SpotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/**
 * 모임 장소 투표 (ANALYSIS_chulsa P1).
 * 후보는 모임을 만든 사람이 2~5개 정한다(투표가 시작되면 바꿀 수 없음). 투표는 참여 확정·대기자만, 모집 중에만.
 * 모집이 마감되면(수동·배치) 최다 득표 후보가 모임 장소가 된다 — 동점은 먼저 등록된 후보, 표가 없으면 장소를 그대로 둔다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GatheringPlacePollService {

    static final int MIN_OPTIONS = 2;
    static final int MAX_OPTIONS = 5;

    private final GatheringRepository gatheringRepository;
    private final GatheringParticipantRepository participantRepository;
    private final GatheringPlaceOptionRepository optionRepository;
    private final GatheringPlaceVoteRepository voteRepository;
    private final SpotRepository spotRepository;
    private final GatheringNotificationService notificationService;

    private Gathering findGathering(Long id) {
        return gatheringRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "모임을 찾을 수 없습니다."));
    }

    private Map<Long, Long> counts(Long gatheringId) {
        Map<Long, Long> m = new HashMap<>();
        for (Object[] r : voteRepository.countByOption(gatheringId)) m.put((Long) r[0], ((Number) r[1]).longValue());
        return m;
    }

    /** 최다 득표 후보 — 표가 하나도 없으면 null. 동점은 id가 작은(먼저 등록된) 후보 */
    GatheringPlaceOption winner(List<GatheringPlaceOption> options, Map<Long, Long> counts) {
        GatheringPlaceOption best = null;
        long bestCount = 0;
        for (GatheringPlaceOption o : options) {   // id 오름차순
            long c = counts.getOrDefault(o.getId(), 0L);
            if (c > bestCount) { best = o; bestCount = c; }
        }
        return best;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPoll(Long gatheringId) {
        Gathering g = findGathering(gatheringId);
        List<GatheringPlaceOption> options = optionRepository.findByGatheringIdOrderByIdAsc(gatheringId);
        Map<Long, Long> counts = counts(gatheringId);
        boolean open = "RECRUITING".equals(g.getStatus());
        GatheringPlaceOption w = open ? null : winner(options, counts);

        List<Map<String, Object>> list = new ArrayList<>();
        for (GatheringPlaceOption o : options) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", o.getId());
            m.put("label", o.getLabel());
            m.put("spotId", o.getSpotId());
            m.put("voteCount", counts.getOrDefault(o.getId(), 0L));
            list.add(m);
        }
        Long myOptionId = null;
        if (SecurityUtil.isAuthenticated()) {
            myOptionId = voteRepository.findByGatheringIdAndMemberId(gatheringId, SecurityUtil.getCurrentMemberId())
                    .map(GatheringPlaceVote::getOptionId).orElse(null);
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("options", list);
        body.put("totalVotes", counts.values().stream().mapToLong(Long::longValue).sum());
        body.put("open", open);
        body.put("myOptionId", myOptionId);
        body.put("winnerOptionId", w != null ? w.getId() : null);
        return body;
    }

    /** 후보 정하기/바꾸기 — 만든 사람만, 모집 중에만, 표가 들어오기 전까지. 빈 목록이면 투표 없애기 */
    @Transactional
    public Map<String, Object> setOptions(Long gatheringId, Long memberId, List<Map<String, Object>> raw) {
        Gathering g = gatheringRepository.findByIdAndCreatedBy(gatheringId, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "모임을 만든 사람만 장소 후보를 정할 수 있어요."));
        if (!"RECRUITING".equals(g.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "모집 중인 모임에서만 장소 투표를 열 수 있어요.");
        }
        if (voteRepository.countByGatheringId(gatheringId) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 투표가 시작돼 후보를 바꿀 수 없어요.");
        }
        List<Map<String, Object>> items = raw == null ? List.of() : raw;
        if (!items.isEmpty() && (items.size() < MIN_OPTIONS || items.size() > MAX_OPTIONS)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "장소 후보는 2~5개로 정해 주세요.");
        }
        List<GatheringPlaceOption> next = new ArrayList<>();
        for (Map<String, Object> it : items) {
            Long spotId = null;
            Object rawSpot = it.get("spotId");
            if (rawSpot != null && !rawSpot.toString().isBlank()) {
                try {
                    spotId = rawSpot instanceof Number n ? n.longValue() : Long.parseLong(rawSpot.toString());
                } catch (NumberFormatException e) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "스팟 id가 올바르지 않습니다.");
                }
            }
            Spot spot = spotId == null ? null : spotRepository.findById(spotId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "출사 스팟을 찾을 수 없습니다."));
            String label = it.get("label") == null ? "" : it.get("label").toString().replaceAll("<[^>]*>", "").trim();
            if (label.isEmpty() && spot != null) label = spot.getName();
            if (label.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "장소 후보 이름을 입력해 주세요.");
            if (label.length() > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "장소 후보 이름은 100자 이내로 입력해 주세요.");
            next.add(GatheringPlaceOption.builder().gatheringId(gatheringId).spotId(spot != null ? spot.getId() : null).label(label).build());
        }
        optionRepository.deleteByGatheringId(gatheringId);
        optionRepository.saveAll(next);
        log.info("[GATHERING] 장소 후보 설정: gatheringId={}, count={}", gatheringId, next.size());
        return getPoll(gatheringId);
    }

    /** 투표 — 참여 확정·대기자만, 모집 중에만. 같은 후보를 다시 고르면 그대로(멱등), 다른 후보면 표를 옮긴다 */
    @Transactional
    public Map<String, Object> vote(Long gatheringId, Long memberId, Long optionId) {
        Gathering g = findGathering(gatheringId);
        if (!"RECRUITING".equals(g.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "모집이 끝나 투표할 수 없어요.");
        }
        String status = participantRepository.findByGatheringIdAndMemberId(gatheringId, memberId)
                .map(GatheringParticipant::getStatus).orElse(null);
        if (!"PARTICIPATING".equals(status) && !"WAITING".equals(status)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "참여 신청한 사람만 투표할 수 있어요.");
        }
        if (optionId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "투표할 후보를 골라 주세요.");
        GatheringPlaceOption option = optionRepository.findById(optionId)
                .filter(o -> o.getGatheringId().equals(gatheringId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "장소 후보를 찾을 수 없습니다."));
        GatheringPlaceVote vote = voteRepository.findByGatheringIdAndMemberId(gatheringId, memberId)
                .orElseGet(() -> GatheringPlaceVote.builder().gatheringId(gatheringId).memberId(memberId).build());
        if (!option.getId().equals(vote.getOptionId())) {
            vote.setOptionId(option.getId());
            voteRepository.save(vote);
        }
        return getPoll(gatheringId);
    }

    /**
     * 모집 마감 시 호출 — 표가 있으면 이긴 후보를 모임 장소(+스팟)로 바꾸고 참여자·대기자에게 알린다.
     * 엔티티만 바꾸고 저장은 호출한 쪽(트랜잭션)이 한다.
     */
    @Transactional
    public void applyWinner(Gathering g) {
        List<GatheringPlaceOption> options = optionRepository.findByGatheringIdOrderByIdAsc(g.getId());
        if (options.isEmpty()) return;
        GatheringPlaceOption w = winner(options, counts(g.getId()));
        if (w == null) return;
        g.setLocation(w.getLabel());
        if (w.getSpotId() != null) g.setSpotId(w.getSpotId());
        log.info("[GATHERING] 장소 확정: gatheringId={}, optionId={}", g.getId(), w.getId());
        String message = "'" + g.getTitle() + "' 장소가 '" + w.getLabel() + "'(으)로 정해졌어요.";
        for (String st : List.of("PARTICIPATING", "WAITING")) {
            for (GatheringParticipant p : participantRepository.findByGatheringIdAndStatus(g.getId(), st)) {
                try {
                    notificationService.notify(p.getMemberId(), g.getId(), "PLACE_DECIDED",
                            message.length() > 300 ? message.substring(0, 300) : message, null);
                } catch (Exception e) {
                    log.error("[GATHERING_NOTIFICATION] 장소 확정 알림 실패: gatheringId={}, memberId={}: {}",
                            g.getId(), p.getMemberId(), e.getMessage());
                }
            }
        }
    }

    /** 배치 자동 마감 뒤 호출 */
    @Transactional
    public void decideAfterClose(Long gatheringId) {
        gatheringRepository.findById(gatheringId).ifPresent(g -> {
            applyWinner(g);
            gatheringRepository.save(g);
        });
    }

    @Transactional
    public void deleteForGathering(Long gatheringId) {
        voteRepository.deleteByGatheringId(gatheringId);
        optionRepository.deleteByGatheringId(gatheringId);
    }
}
