package com.happiness.app.gathering.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ParticipantResponse {

    private Long id;
    private Long memberId;
    private String status;

    /**
     * 미참여 사유 — 모임 생성자에게만 공개.
     * null이면 클라이언트에 필드 자체를 내려보내지 않음 (@JsonInclude(NON_NULL) 적용 필요).
     * 서비스 레이어에서 생성자 여부에 따라 null로 설정한다.
     */
    private String reason;

    private LocalDateTime joinedAt;
}
