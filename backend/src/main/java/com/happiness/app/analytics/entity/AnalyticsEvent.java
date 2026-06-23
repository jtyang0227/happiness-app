package com.happiness.app.analytics.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "analytics_events",
    indexes = {
        @Index(name = "idx_analytics_member_type", columnList = "member_id, event_type"),
        @Index(name = "idx_analytics_created_at", columnList = "created_at")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** PORTFOLIO_VIEW / PHOTO_VIEW / PHOTO_LIKE / PHOTO_SAVE / INQUIRY_SENT */
    @Column(name = "event_type", length = 30, nullable = false)
    private String eventType;

    /** PHOTO / PORTFOLIO / SERIES */
    @Column(name = "target_type", length = 20)
    private String targetType;

    @Column(name = "target_id")
    private Long targetId;

    /** 콘텐츠 소유자의 memberId (방문자 ID 아님) */
    @Column(name = "member_id", nullable = false)
    private Long memberId;

    /** 세션 임시 토큰 (IP 대신 사용, 프라이버시 보호) */
    @Column(name = "visitor_token", length = 32)
    private String visitorToken;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
