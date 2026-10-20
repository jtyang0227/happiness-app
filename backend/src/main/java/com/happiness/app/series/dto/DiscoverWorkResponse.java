package com.happiness.app.series.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/** 작업 탐색 카드 — 작업 요약 + 작가 정보 + "예약 받는 중" 여부. 작업 이야기 전문은 목록에 싣지 않는다. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiscoverWorkResponse {
    private Long id;
    private String title;
    private String coverImageUrl;
    private String shootType;
    private String clientLabel;
    private String shotOn;
    private Integer photoCount;
    private List<String> previewPhotos;
    private LocalDateTime updatedAt;

    private Long memberId;
    private String memberName;
    private String memberProfileName;
    private String memberAvatarUrl;
    private String memberLocation;
    private boolean acceptingBookings;
    private long appreciationCount;
    private long viewCount;
    private boolean featured;
}
