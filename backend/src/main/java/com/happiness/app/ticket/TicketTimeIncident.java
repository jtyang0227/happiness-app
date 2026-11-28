package com.happiness.app.ticket;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

/** 서버 시간 동기화 장애 기록(관리자 알림을 장애 단위로 묶음)
 * 테이블만 Hibernate가 만든다(스키마 주인 규칙) — 읽고 쓰는 코드는 Nest `apps/api/src/ticket`. 시각은 timestamptz(UTC). */
@Entity
@Table(name = "ticket_time_incidents")
@Getter
@Setter
@NoArgsConstructor
public class TicketTimeIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reason", nullable = false, length = 300)
    private String reason;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "last_alert_at", nullable = false)
    private Instant lastAlertAt;
}
