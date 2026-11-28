package com.happiness.app.ticket;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

/** 발송한 알림(인앱 수신함) — dedupe_key UNIQUE로 같은 알림은 한 번만
 * 테이블만 Hibernate가 만든다(스키마 주인 규칙) — 읽고 쓰는 코드는 Nest `apps/api/src/ticket`. 시각은 timestamptz(UTC). */
@Entity
@Table(name = "ticket_notifications", uniqueConstraints = @UniqueConstraint(name = "uk_tn_dedupe_key", columnNames = "dedupe_key"), indexes = @Index(name = "idx_tn_member_read", columnList = "member_id, is_read"))
@Getter
@Setter
@NoArgsConstructor
public class TicketNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dedupe_key", nullable = false, length = 200)
    private String dedupeKey;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "booking_phase_id")
    private Long bookingPhaseId;

    @Column(name = "kind", nullable = false, length = 30)
    private String kind;

    @Column(name = "message", nullable = false, length = 500)
    private String message;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
