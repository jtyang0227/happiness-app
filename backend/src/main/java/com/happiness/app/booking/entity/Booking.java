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

    /** 촬영 준비 체크리스트: [{"id":"uuid","text":"카메라 바디","checked":false}, ...] */
    @Column(columnDefinition = "TEXT")
    private String checklistJson;

    /** 납품 기한 */
    private LocalDate deliveryDeadline;

    /** PENDING / RECEIVED */
    @Column(length = 20)
    @Builder.Default
    private String depositStatus = "PENDING";

    private Integer depositAmount;
    private LocalDateTime depositReceivedAt;

    /** PENDING / RECEIVED */
    @Column(length = 20)
    @Builder.Default
    private String balanceStatus = "PENDING";

    private Integer balanceAmount;
    private LocalDateTime balanceReceivedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = "REQUESTED";
        if (this.depositStatus == null) this.depositStatus = "PENDING";
        if (this.balanceStatus == null) this.balanceStatus = "PENDING";
    }
}
