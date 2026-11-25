package com.happiness.app.gathering.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** SNAPDAY 스토리(9:16 이미지) — 태그 회원은 instagram_story_shares처럼 콤마 구분 */
@Entity
@Table(name = "gathering_stories", indexes = {
        @Index(name = "idx_gathering_stories_gathering", columnList = "gathering_id"),
        @Index(name = "idx_gathering_stories_member", columnList = "member_id")})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringStory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gathering_id", nullable = false)
    private Long gatheringId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(length = 300)
    private String caption;

    @Column(name = "tagged_member_ids", length = 500)
    private String taggedMemberIds;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
