package com.happiness.app.moodboard;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 무드보드 — 이름 붙은 개인 저장 보드(Behance Moodboard 재해석). 기본 비공개(본인만). 기존 "저장"(PhotoSave)과는 별개 목록이다.
 * shareToken이 있으면 그 토큰 주소로 누구나 보기 전용으로 볼 수 있다(Cosmos 공개 클러스터 재해석). null이면 비공개.
 */
@Entity
@Table(name = "moodboards", indexes = {
        @Index(name = "idx_moodboards_member", columnList = "member_id"),
        @Index(name = "idx_moodboards_share_token", columnList = "share_token", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Moodboard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 50)
    private String name;

    /** 보기 전용 공유 링크 토큰 — null = 비공개. 링크를 끄면 null로 돌려 이전 주소를 바로 무효화한다 */
    @Column(name = "share_token", length = 32)
    private String shareToken;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
