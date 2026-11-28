package com.happiness.app.ticket;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

/** 예매 단계(선예매·일반예매 등) — 공식 일정(announced/scheduled)과 오픈 상태(open_status)를 따로 둔다
 * 테이블만 Hibernate가 만든다(스키마 주인 규칙) — 읽고 쓰는 코드는 Nest `apps/api/src/ticket`. 시각은 timestamptz(UTC). */
@Entity
@Table(name = "booking_phases", indexes = {
        @Index(name = "idx_booking_phases_session", columnList = "session_id"),
        @Index(name = "idx_booking_phases_scheduled_at", columnList = "scheduled_at")
})
@Getter
@Setter
@NoArgsConstructor
public class BookingPhase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "announced_at")
    private Instant announcedAt;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "timezone", nullable = false, length = 50)
    private String timezone;

    @Column(name = "time_source", nullable = false, length = 20)
    private String timeSource;

    @Column(name = "source_url", length = 500)
    private String sourceUrl;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "last_time_sync_at")
    private Instant lastTimeSyncAt;

    @Column(name = "schedule_status", nullable = false, length = 20)
    private String scheduleStatus;

    @Column(name = "open_status", nullable = false, length = 30)
    private String openStatus;

    @Column(name = "open_status_before_error", length = 30)
    private String openStatusBeforeError;

    @Column(name = "open_check_attempts", nullable = false)
    private int openCheckAttempts;

    @Column(name = "schedule_revision", nullable = false)
    private int scheduleRevision;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
