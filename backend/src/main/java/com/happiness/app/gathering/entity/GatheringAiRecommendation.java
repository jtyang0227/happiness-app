package com.happiness.app.gathering.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** SNAPDAY AI 출사 추천 결과 — source AI | SAMPLE(키 없을 때 개발용) */
@Entity
@Table(name = "gathering_ai_recommendations", indexes = @Index(name = "idx_gar_gathering", columnList = "gathering_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringAiRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gathering_id", nullable = false)
    private Long gatheringId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 10)
    private String source;

    @Column(length = 60)
    private String model;

    @Column(length = 500)
    private String question;

    @Column(name = "result_json", nullable = false, columnDefinition = "TEXT")
    private String resultJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
