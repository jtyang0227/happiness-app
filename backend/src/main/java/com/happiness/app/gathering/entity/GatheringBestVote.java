package com.happiness.app.gathering.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** 베스트 포토 투표 — 회원×사진 1표, 모임당 3표는 서비스에서 검사 */
@Entity
@Table(name = "gathering_best_votes",
        uniqueConstraints = @UniqueConstraint(name = "uk_gathering_best_votes", columnNames = {"photo_id", "member_id"}),
        indexes = @Index(name = "idx_gbv_gathering_member", columnList = "gathering_id, member_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringBestVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gathering_id", nullable = false)
    private Long gatheringId;

    /** gathering_photos.id */
    @Column(name = "photo_id", nullable = false)
    private Long photoId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
