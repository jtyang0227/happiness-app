package com.happiness.app.gathering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 게시물 좋아요 — 한 회원이 같은 게시물에 중복 좋아요 불가 (UNIQUE 제약).
 */
@Entity
@Table(
    name = "gathering_post_likes",
    indexes = {
        @Index(name = "idx_gathering_post_likes_post_id", columnList = "gathering_post_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(
            name  = "uq_gathering_post_like",
            columnNames = {"gathering_post_id", "member_id"}
        )
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringPostLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gathering_post_id", nullable = false)
    private Long gatheringPostId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
