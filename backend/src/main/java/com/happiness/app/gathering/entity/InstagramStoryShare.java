package com.happiness.app.gathering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Instagram Story 공유 시도 로그 — Feature 37 Instagram 슬라이스.
 *
 * 설계 원칙:
 *   - "공유 시도" 로그이며 "공유 성공"을 추적하는 테이블이 아니다.
 *   - Instagram의 "Sharing to Stories"는 OS 레벨 딥링크(iOS URL scheme + pasteboard,
 *     Android Intent)이므로 서버가 성공 여부를 알 수 없다. status 컬럼 없음.
 *   - taggedMemberIds: 클라이언트가 합성 이미지에 텍스트로 새겨 넣을 멤버 ID 목록.
 *     실제 Instagram 멘션이 아니다. Gathering.hashtags 패턴과 동일하게 콤마 구분 VARCHAR(500)으로 저장.
 */
@Entity
@Table(name = "instagram_story_shares", indexes = {
    @Index(name = "idx_instagram_shares_gathering", columnList = "gathering_id"),
    @Index(name = "idx_instagram_shares_member",    columnList = "member_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InstagramStoryShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long gatheringId;

    @Column(nullable = false)
    private Long memberId;

    /** 어느 게시물의 사진을 공유했는지 (null이면 특정 게시물 없이 모임 자체 공유) */
    @Column
    private Long gatheringPostId;

    /** 공유 템플릿 — PHOTO_ONLY | PHOTO_PARTICIPANTS | PHOTO_TEXT */
    @Column(nullable = false, length = 30)
    private String template;

    /** 합성 이미지에 포함한 캡션 텍스트 (nullable, max 300) */
    @Column(length = 300)
    private String captionText;

    /**
     * 클라이언트가 태그 후보로 선택한 멤버 ID 목록 (콤마 구분 문자열, nullable).
     * 예: "1,5,42"
     * 실제 Instagram 멘션이 아닌, 합성 이미지에 텍스트로 새겨진 참여자 핸들 표시용.
     */
    @Column(length = 500)
    private String taggedMemberIds;

    @Column(nullable = false, updatable = false)
    private LocalDateTime sharedAt;

    @PrePersist
    protected void onCreate() {
        this.sharedAt = LocalDateTime.now();
    }
}
