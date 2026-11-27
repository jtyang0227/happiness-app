package com.happiness.app.ticket;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

/** 일정 변경 이력 — 추가만 한다(수정·삭제 금지)
 * 테이블만 Hibernate가 만든다(스키마 주인 규칙) — 읽고 쓰는 코드는 Nest `apps/api/src/ticket`. 시각은 timestamptz(UTC). */
@Entity
@Table(name = "booking_phase_schedule_revisions", uniqueConstraints = @UniqueConstraint(name = "uk_bpsr_phase_revision", columnNames = {"booking_phase_id", "revision"}))
@Getter
@Setter
@NoArgsConstructor
public class BookingPhaseScheduleRevision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_phase_id", nullable = false)
    private Long bookingPhaseId;

    @Column(name = "revision", nullable = false)
    private int revision;

    @Column(name = "prev_announced_at")
    private Instant prevAnnouncedAt;

    @Column(name = "new_announced_at")
    private Instant newAnnouncedAt;

    @Column(name = "prev_scheduled_at")
    private Instant prevScheduledAt;

    @Column(name = "new_scheduled_at")
    private Instant newScheduledAt;

    @Column(name = "prev_timezone", length = 50)
    private String prevTimezone;

    @Column(name = "new_timezone", length = 50)
    private String newTimezone;

    @Column(name = "prev_schedule_status", length = 20)
    private String prevScheduleStatus;

    @Column(name = "new_schedule_status", length = 20)
    private String newScheduleStatus;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "source_url", length = 500)
    private String sourceUrl;

    @Column(name = "time_source", length = 20)
    private String timeSource;

    @Column(name = "changed_by", nullable = false, length = 50)
    private String changedBy;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;
}
