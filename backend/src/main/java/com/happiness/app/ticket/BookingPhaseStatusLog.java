package com.happiness.app.ticket;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

/** 오픈 상태 전이 기록
 * 테이블만 Hibernate가 만든다(스키마 주인 규칙) — 읽고 쓰는 코드는 Nest `apps/api/src/ticket`. 시각은 timestamptz(UTC). */
@Entity
@Table(name = "booking_phase_status_logs", indexes = @Index(name = "idx_bpsl_phase", columnList = "booking_phase_id"))
@Getter
@Setter
@NoArgsConstructor
public class BookingPhaseStatusLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_phase_id", nullable = false)
    private Long bookingPhaseId;

    @Column(name = "from_status", length = 30)
    private String fromStatus;

    @Column(name = "to_status", nullable = false, length = 30)
    private String toStatus;

    @Column(name = "reason", length = 300)
    private String reason;

    @Column(name = "actor", nullable = false, length = 50)
    private String actor;

    @Column(name = "revision", nullable = false)
    private int revision;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
