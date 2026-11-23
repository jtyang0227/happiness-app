package com.happiness.app.gathering.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** 모임 장소 투표 후보 (ANALYSIS_chulsa P1) — 모임당 2~5개, 출사 스팟이거나 이름만 있는 장소 */
@Entity
@Table(name = "gathering_place_options", indexes = @Index(name = "idx_gpo_gathering", columnList = "gathering_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringPlaceOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gathering_id", nullable = false)
    private Long gatheringId;

    @Column(name = "spot_id")
    private Long spotId;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
