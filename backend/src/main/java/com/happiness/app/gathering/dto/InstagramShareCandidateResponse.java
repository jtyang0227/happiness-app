package com.happiness.app.gathering.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * Instagram Story 공유 시 태그 후보 참여자 정보.
 * PARTICIPATING 상태이고 instagramId 가 등록된 참여자만 포함 (요청자 본인 제외).
 */
@Getter
@Builder
public class InstagramShareCandidateResponse {
    private Long memberId;
    private String name;
    private String avatarUrl;
    /** @ 기호 제외 저장된 Instagram 아이디 */
    private String instagramId;
}
