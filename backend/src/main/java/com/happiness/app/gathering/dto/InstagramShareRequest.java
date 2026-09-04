package com.happiness.app.gathering.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * POST /api/gatherings/{id}/instagram-share 요청 바디.
 */
@Getter
@NoArgsConstructor
public class InstagramShareRequest {

    /** 어느 게시물의 사진을 공유했는지 (nullable — 특정 게시물 없이 모임 자체 공유 시 null) */
    private Long gatheringPostId;

    /** 공유 템플릿 — PHOTO_ONLY | PHOTO_PARTICIPANTS | PHOTO_TEXT (필수) */
    private String template;

    /** 합성 이미지에 넣을 캡션 텍스트 (nullable, max 300) */
    private String captionText;

    /**
     * 태그 후보로 선택한 멤버 ID 목록 (nullable).
     * 실제 Instagram 멘션이 아니라 합성 이미지에 텍스트로 표시할 참여자 핸들 목록.
     */
    private List<Long> taggedMemberIds;
}
