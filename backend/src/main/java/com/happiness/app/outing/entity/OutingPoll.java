package com.happiness.app.outing.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * SNAPDAY 월간 출사 투표 (DESIGN_PROMPTS/planning/snapday) — 월 1개.
 * 표 정의만 여기 둔다(컷오버 전 스키마 주인은 Hibernate). API는 새 API(apps/api)에만 있다.
 */
@Entity
@Table(name = "outing_polls", uniqueConstraints = @UniqueConstraint(name = "uk_outing_polls_month", columnNames = {"poll_year", "poll_month"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OutingPoll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "poll_year", nullable = false)
    private Integer year;

    @Column(name = "poll_month", nullable = false)
    private Integer month;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 50)
    private String region;

    /** OPEN | CLOSED | CONFIRMED */
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "starts_at", nullable = false)
    private LocalDateTime startsAt;

    @Column(name = "ends_at", nullable = false)
    private LocalDateTime endsAt;

    @Column(name = "min_participants")
    private Integer minParticipants;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    @Column(name = "confirmed_option_id")
    private Long confirmedOptionId;

    @Column(name = "gathering_id")
    private Long gatheringId;

    @Column(name = "closing_notified")
    private Boolean closingNotified;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
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
