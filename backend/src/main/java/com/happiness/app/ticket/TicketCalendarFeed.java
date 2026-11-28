package com.happiness.app.ticket;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

/** 예매 알림 구독 캘린더(webcal) 비밀 링크 — 회원당 1개, 토큰 원문은 발급 응답에만(DB엔 SHA-256 해시)
 * 테이블만 Hibernate가 만든다(스키마 주인 규칙) — 읽고 쓰는 코드는 Nest `apps/api/src/ticket`. 시각은 timestamptz(UTC). */
@Entity
@Table(name = "ticket_calendar_feeds", uniqueConstraints = {
        @UniqueConstraint(name = "uk_tcf_member", columnNames = "member_id"),
        @UniqueConstraint(name = "uk_tcf_token_hash", columnNames = "token_hash")})
@Getter
@Setter
@NoArgsConstructor
public class TicketCalendarFeed {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_accessed_at")
    private Instant lastAccessedAt;
}
