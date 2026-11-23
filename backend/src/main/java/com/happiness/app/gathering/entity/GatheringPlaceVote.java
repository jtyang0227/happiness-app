package com.happiness.app.gathering.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** 장소 투표 — 회원당 모임마다 한 표(다시 고르면 바뀜) */
@Entity
@Table(name = "gathering_place_votes",
        uniqueConstraints = @UniqueConstraint(name = "uk_gpv_gathering_member", columnNames = {"gathering_id", "member_id"}),
        indexes = @Index(name = "idx_gpv_option", columnList = "option_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringPlaceVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gathering_id", nullable = false)
    private Long gatheringId;

    @Column(name = "option_id", nullable = false)
    private Long optionId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(nullable = false)
    private LocalDateTime votedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.votedAt = LocalDateTime.now();
    }
}
