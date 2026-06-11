package com.happiness.app.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberStatsResponse {
    private long photoCount;
    private long totalLikes;
    private long totalSaves;
    private long totalShares;
    private long inquiryCount;
    private long unreadInquiryCount;
}
