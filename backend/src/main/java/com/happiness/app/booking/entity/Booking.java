package com.happiness.app.booking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 촬영 작가의 memberId */
    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false)
    private LocalDate shootDate;

    @Column(length = 10)
    private String shootTime;

    @Column(length = 20)
    private String shootType;

    @Column(length = 100, nullable = false)
    private String clientName;

    @Column(length = 30)
    private String clientPhone;

    @Column(length = 255)
    private String clientEmail;

    @Column(columnDefinition = "TEXT")
    private String memo;

    /** REQUESTED / CONFIRMED / REJECTED / CANCELLED */
    @Column(length = 20)
    @Builder.Default
    private String status = "REQUESTED";

    @Column(length = 200)
    private String rejectReason;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime confirmedAt;
    private LocalDateTime cancelledAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = "REQUESTED";
    }
}
