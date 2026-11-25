package com.happiness.app.outing.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** 회원×날짜 응답 1행 — AVAILABLE | UNAVAILABLE (행이 없으면 미응답) */
@Entity
@Table(name = "outing_poll_votes",
        uniqueConstraints = @UniqueConstraint(name = "uk_outing_poll_votes", columnNames = {"option_id", "member_id"}),
        indexes = @Index(name = "idx_opv_poll_member", columnList = "poll_id, member_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OutingPollVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "poll_id", nullable = false)
    private Long pollId;

    @Column(name = "option_id", nullable = false)
    private Long optionId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 12)
    private String availability;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
