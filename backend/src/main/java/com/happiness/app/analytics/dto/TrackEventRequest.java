package com.happiness.app.analytics.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TrackEventRequest {
    /** PORTFOLIO_VIEW / PHOTO_VIEW / PHOTO_LIKE / PHOTO_SAVE / INQUIRY_SENT */
    private String eventType;
    /** PHOTO / PORTFOLIO / SERIES */
    private String targetType;
    private Long targetId;
    /** 콘텐츠 소유자의 memberId */
    private Long memberId;
    /** 세션 임시 토큰 (IP 대체) */
    private String visitorToken;
}
