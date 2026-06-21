package com.happiness.app.booking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(
    name = "booking_blocked_dates",
    uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "blocked_date"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingBlockedDate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "blocked_date", nullable = false)
    private LocalDate blockedDate;

    @Column(length = 100)
    private String reason;
}
