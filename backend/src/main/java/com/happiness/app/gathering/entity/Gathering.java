package com.happiness.app.gathering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 사진 모임(Photo Gathering) — N명이 함께 촬영하는 그룹 모임.
 * Feature 37. Feature 35(Meet, 1:1 약속)와 완전히 다른 기능.
 *
 * status: RECRUITING | RECRUITMENT_CLOSED | SCHEDULED | ONGOING | ENDED
 *   - RECRUITING: 모집 중 (기본값)
 *   - RECRUITMENT_CLOSED: 모집 마감
 *   - SCHEDULED: 모임 예정 (배치 전용 — 이 슬라이스 미사용, 향후 GatheringBatchService에서 설정)
 *   - ONGOING: 진행 중 (배치 전용)
 *   - ENDED: 종료 (배치 전용)
 */
@Entity
@Table(name = "gatherings", indexes = {
    @Index(name = "idx_gatherings_status",     columnList = "status"),
    @Index(name = "idx_gatherings_start_date", columnList = "start_date_time"),
    @Index(name = "idx_gatherings_created_by", columnList = "created_by")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Gathering {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 200, nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String detailDescription;

    @Column(length = 300, nullable = false)
    private String location;

    @Column(nullable = false)
    private LocalDateTime startDateTime;

    @Column(nullable = false)
    private LocalDateTime endDateTime;

    @Column(nullable = false)
    private Integer maxParticipants;

    @Column(nullable = false)
    private LocalDateTime recruitmentEndDateTime;

    /**
     * RECRUITING | RECRUITMENT_CLOSED | SCHEDULED | ONGOING | ENDED
     */
    @Column(length = 20, nullable = false)
    @Builder.Default
    private String status = "RECRUITING";

    @Column(length = 500)
    private String thumbnailUrl;

    @Column(columnDefinition = "TEXT")
    private String preparationNote;

    @Column(length = 100)
    private String fee;

    @Column(length = 200)
    private String shootTheme;

    @Column(columnDefinition = "TEXT")
    private String locationIntro;

    @Column(length = 500)
    private String referenceImageUrl;

    @Column(length = 300)
    private String hashtags;

    @Column(nullable = false)
    private Long createdBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = "RECRUITING";
    }
}
