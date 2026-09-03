package com.happiness.app.gathering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 모임 진행 중 피드에 올라오는 게시물.
 * content 또는 photos 중 적어도 하나는 반드시 존재해야 한다 (서비스 레이어에서 검증).
 */
@Entity
@Table(
    name = "gathering_posts",
    indexes = {
        @Index(name = "idx_gathering_posts_gathering_id", columnList = "gathering_id"),
        @Index(name = "idx_gathering_posts_member_id",   columnList = "member_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gathering_id", nullable = false)
    private Long gatheringId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    /** 작성 시점의 회원 이름 — N+1 방지용 비정규화 (Comment 엔티티와 동일 패턴) */
    @Column(length = 100, nullable = false)
    private String memberName;

    /** 작성 시점의 아바타 URL — N+1 방지용 비정규화 */
    @Column(length = 500)
    private String memberAvatarUrl;

    /** 텍스트 내용 — 사진만 올리는 경우 null 허용 */
    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(length = 300)
    private String hashtags;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
