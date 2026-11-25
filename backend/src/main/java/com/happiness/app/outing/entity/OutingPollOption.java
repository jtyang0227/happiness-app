package com.happiness.app.outing.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** 월간 출사 투표의 날짜 후보 — SAT | SUN | HOLIDAY | WEEKDAY */
@Entity
@Table(name = "outing_poll_options", uniqueConstraints = @UniqueConstraint(name = "uk_outing_poll_options", columnNames = {"poll_id", "option_date"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OutingPollOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "poll_id", nullable = false)
    private Long pollId;

    @Column(name = "option_date", nullable = false)
    private LocalDate optionDate;

    @Column(name = "day_kind", nullable = false, length = 10)
    private String dayKind;

    @Column(length = 50)
    private String label;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
