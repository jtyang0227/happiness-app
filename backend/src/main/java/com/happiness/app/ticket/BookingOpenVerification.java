package com.happiness.app.ticket;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

/** 실제 오픈 확인 결과 — 공식 일정과 분리
 * 테이블만 Hibernate가 만든다(스키마 주인 규칙) — 읽고 쓰는 코드는 Nest `apps/api/src/ticket`. 시각은 timestamptz(UTC). */
@Entity
@Table(name = "booking_open_verifications", indexes = @Index(name = "idx_bov_phase", columnList = "booking_phase_id"))
@Getter
@Setter
@NoArgsConstructor
public class BookingOpenVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_phase_id", nullable = false)
    private Long bookingPhaseId;

    @Column(name = "schedule_revision", nullable = false)
    private int scheduleRevision;

    @Column(name = "checked_at", nullable = false)
    private Instant checkedAt;

    @Column(name = "method", nullable = false, length = 20)
    private String method;

    @Column(name = "site", length = 50)
    private String site;

    @Column(name = "result", nullable = false, length = 20)
    private String result;

    @Column(name = "evidence", length = 500)
    private String evidence;

    @Column(name = "observed_open_at")
    private Instant observedOpenAt;

    @Column(name = "checked_by", nullable = false, length = 50)
    private String checkedBy;
}
