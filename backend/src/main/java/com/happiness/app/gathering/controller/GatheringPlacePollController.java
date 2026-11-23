package com.happiness.app.gathering.controller;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.gathering.service.GatheringPlacePollService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/** 모임 장소 투표 (ANALYSIS_chulsa P1) — 조회는 공개, 후보 정하기·투표는 인증. 응답은 래퍼 없는 JSON */
@RestController
@RequestMapping("/api/gatherings/{gatheringId}/place-poll")
@RequiredArgsConstructor
public class GatheringPlacePollController {

    private final GatheringPlacePollService pollService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long gatheringId) {
        return ResponseEntity.ok(pollService.getPoll(gatheringId));
    }

    /** {"options":[{"spotId":3,"label":"서울숲"},{"label":"뚝섬한강공원"}]} — 빈 배열이면 투표 없애기 */
    @SuppressWarnings("unchecked")
    @PutMapping
    public ResponseEntity<Map<String, Object>> setOptions(@PathVariable Long gatheringId, @RequestBody Map<String, Object> body) {
        Object raw = body.get("options");
        if (raw != null && !(raw instanceof List)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "options는 배열이어야 합니다.");
        }
        List<Object> list = raw == null ? List.of() : (List<Object>) raw;
        for (Object o : list) {
            if (!(o instanceof Map)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "장소 후보 형식이 올바르지 않습니다.");
        }
        return ResponseEntity.ok(pollService.setOptions(gatheringId, SecurityUtil.getCurrentMemberId(),
                (List<Map<String, Object>>) (List<?>) list));
    }

    /** {"optionId": 12} */
    @PostMapping("/vote")
    public ResponseEntity<Map<String, Object>> vote(@PathVariable Long gatheringId, @RequestBody Map<String, Object> body) {
        Object raw = body.get("optionId");
        Long optionId;
        try {
            optionId = raw == null ? null : raw instanceof Number n ? n.longValue() : Long.parseLong(raw.toString());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "후보 id가 올바르지 않습니다.");
        }
        return ResponseEntity.ok(pollService.vote(gatheringId, SecurityUtil.getCurrentMemberId(), optionId));
    }
}
