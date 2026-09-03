package com.happiness.app.gathering.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * GET /api/gatherings/{id}/participants 응답 — 생성자 전용.
 * 참여자/대기자/미참여자 세 그룹으로 분류해 반환.
 * 미참여자의 reason은 이 응답에만 포함 (생성자 본인 확인 후 서비스에서 제공).
 */
@Data
@Builder
public class GatheringParticipantsResponse {

    private List<ParticipantResponse> participating;
    private List<ParticipantResponse> waiting;
    private List<ParticipantResponse> notParticipating;

    private long participantCount;
    private long waitingCount;
    private int maxParticipants;
}
