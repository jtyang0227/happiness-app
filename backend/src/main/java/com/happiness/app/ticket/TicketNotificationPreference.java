package com.happiness.app.ticket;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

/** 사용자별 예매 알림 설정 (offsets = "24h,1h,10m,1m" 중 일부)
 * 테이블만 Hibernate가 만든다(스키마 주인 규칙) — 읽고 쓰는 코드는 Nest `apps/api/src/ticket`. 시각은 timestamptz(UTC). */
@Entity
@Table(name = "ticket_notification_preferences", uniqueConstraints = @UniqueConstraint(name = "uk_tnp_member_phase", columnNames = {"member_id", "booking_phase_id"}),
        indexes = @Index(name = "idx_tnp_phase", columnList = "booking_phase_id"))
@Getter
@Setter
@NoArgsConstructor
public class TicketNotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "booking_phase_id", nullable = false)
    private Long bookingPhaseId;

    @Column(name = "offsets", nullable = false, length = 50)
    private String offsets;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
