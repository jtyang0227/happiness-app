package com.happiness.app.gathering.dto;

import lombok.Data;

@Data
public class ParticipationRequest {

    /**
     * 클라이언트가 보낼 수 있는 값: PARTICIPATING | NOT_PARTICIPATING
     * WAITING / CANCELLED 는 서버가 자동 배정하며, 클라이언트 전송 시 400 반환.
     */
    private String status;

    /**
     * 미참여 사유 (status = NOT_PARTICIPATING 일 때만 의미 있음).
     * 모임 생성자에게만 공개.
     */
    private String reason;
}
