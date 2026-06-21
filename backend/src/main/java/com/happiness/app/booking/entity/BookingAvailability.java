package com.happiness.app.booking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking_availability")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingAvailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long memberId;

    /** 예약 가능 요일 (콤마 구분, 1=월요일, 7=일요일) */
    @Column(length = 20)
    @Builder.Default
    private String weekdays = "1,2,3,4,5";

    /** 예약 가능 시간 슬롯 (콤마 구분, 예: "10:00,14:00") */
    @Column(length = 100)
    @Builder.Default
    private String timeSlots = "10:00,14:00";

    /** 예약 간격 (시간, 연속 예약 방지) */
    @Builder.Default
    private int bufferHours = 0;

    @Column(columnDefinition = "TEXT")
    private String bookingNote;

    @Column(nullable = false)
    @Builder.Default
    private boolean isActive = true;

    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        this.updatedAt = LocalDateTime.now();
        if (this.weekdays == null) this.weekdays = "1,2,3,4,5";
        if (this.timeSlots == null) this.timeSlots = "10:00,14:00";
    }
}
