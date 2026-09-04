package com.happiness.app.gathering.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * POST /api/gatherings/{id}/instagram-share 응답.
 * 로그 레코드 ID + 기록 시각만 반환한다 (공유 성공 여부는 서버가 알 수 없으므로 status 없음).
 */
@Getter
@Builder
public class InstagramShareResponse {
    private Long id;
    private LocalDateTime sharedAt;
}
