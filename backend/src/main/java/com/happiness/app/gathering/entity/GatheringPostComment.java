package com.happiness.app.gathering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 게시물 댓글 — memberName/memberAvatarUrl은 작성 시점에 비정규화 (Comment 엔티티와 동일 패턴).
 * 대댓글(parentId) 기능은 이번 슬라이스에서 제외.
 */
@Entity
@Table(
    name = "gathering_post_comments",
    indexes = {
        @Index(name = "idx_gathering_post_comments_post_id", columnList = "gathering_post_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringPostComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gathering_post_id", nullable = false)
    private Long gatheringPostId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    /** 작성 시점의 회원 이름 — N+1 방지용 비정규화 */
    @Column(length = 100, nullable = false)
    private String memberName;

    /** 작성 시점의 아바타 URL — N+1 방지용 비정규화 */
    @Column(length = 500)
    private String memberAvatarUrl;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
