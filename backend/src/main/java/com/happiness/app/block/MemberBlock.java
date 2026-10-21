package com.happiness.app.block;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** 사용자 차단 — 차단한 사람의 화면에서 차단된 사람의 사진·댓글을 숨긴다 (앱 심사 Apple 1.2). */
@Entity
@Table(name = "member_blocks",
       uniqueConstraints = @UniqueConstraint(columnNames = {"blocker_id", "blocked_id"}),
       indexes = @Index(name = "idx_member_blocks_blocked_id", columnList = "blocked_id"))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MemberBlock {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "blocker_id", nullable = false)
    private Long blockerId;

    @Column(name = "blocked_id", nullable = false)
    private Long blockedId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }
}
