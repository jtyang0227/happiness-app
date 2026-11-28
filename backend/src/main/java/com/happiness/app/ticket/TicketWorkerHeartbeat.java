package com.happiness.app.ticket;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

/** 작업 처리기(워커) 상태 — 30초마다 갱신
 * 테이블만 Hibernate가 만든다(스키마 주인 규칙) — 읽고 쓰는 코드는 Nest `apps/api/src/ticket`. 시각은 timestamptz(UTC). */
@Entity
@Table(name = "ticket_worker_heartbeats", uniqueConstraints = @UniqueConstraint(name = "uk_twh_worker_id", columnNames = "worker_id"))
@Getter
@Setter
@NoArgsConstructor
public class TicketWorkerHeartbeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "worker_id", nullable = false, length = 100)
    private String workerId;

    @Column(name = "host", length = 100)
    private String host;

    @Column(name = "grade", nullable = false, length = 20)
    private String grade;

    @Column(name = "offset_ms")
    private Double offsetMs;

    @Column(name = "db_skew_ms")
    private Double dbSkewMs;

    @Column(name = "queue_lag_ms")
    private Long queueLagMs;

    @Column(name = "paused", nullable = false)
    private boolean paused;

    @Column(name = "leader", nullable = false)
    private boolean leader;

    @Column(name = "recovered_count", nullable = false)
    private int recoveredCount;

    @Column(name = "skipped_count", nullable = false)
    private int skippedCount;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "checked_at", nullable = false)
    private Instant checkedAt;
}
