package com.happiness.app.ticket;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

/** 영속 작업 큐 — dedupe_key로 같은 작업은 한 행, 임대(lease)로 재시작 복구
 * 테이블만 Hibernate가 만든다(스키마 주인 규칙) — 읽고 쓰는 코드는 Nest `apps/api/src/ticket`. 시각은 timestamptz(UTC). */
@Entity
@Table(name = "ticket_scheduled_jobs", uniqueConstraints = @UniqueConstraint(name = "uk_tsj_dedupe_key", columnNames = "dedupe_key"), indexes = {
        @Index(name = "idx_tsj_status_run_at", columnList = "status, run_at"),
        @Index(name = "idx_tsj_phase", columnList = "booking_phase_id")
})
@Getter
@Setter
@NoArgsConstructor
public class TicketScheduledJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_type", nullable = false, length = 30)
    private String jobType;

    @Column(name = "dedupe_key", nullable = false, length = 200)
    private String dedupeKey;

    /** 예매 단계 작업이면 그 단계와 revision — 일정이 바뀌면 이전 revision 작업을 한 번에 취소한다 */
    @Column(name = "booking_phase_id")
    private Long bookingPhaseId;

    @Column(name = "schedule_revision")
    private Integer scheduleRevision;

    @Column(name = "payload", columnDefinition = "TEXT")
    private String payload;

    @Column(name = "run_at", nullable = false)
    private Instant runAt;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "max_attempts", nullable = false)
    private int maxAttempts;

    @Column(name = "claimed_by", length = 100)
    private String claimedBy;

    @Column(name = "lease_until")
    private Instant leaseUntil;

    @Column(name = "time_sensitive", nullable = false)
    private boolean timeSensitive;

    @Column(name = "last_error", length = 500)
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;
}
