package com.happiness.app.outing.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** 공휴일·대체공휴일 — 공공데이터포털 특일정보(API) 또는 관리자 등록(MANUAL). 코드에 날짜를 박지 않는다. */
@Entity
@Table(name = "public_holidays", uniqueConstraints = @UniqueConstraint(name = "uk_public_holidays_date", columnNames = "holiday_date"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicHoliday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "holiday_date", nullable = false)
    private LocalDate holidayDate;

    @Column(nullable = false, length = 50)
    private String name;

    private Boolean substitute;

    /** API | MANUAL */
    @Column(nullable = false, length = 10)
    private String source;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
