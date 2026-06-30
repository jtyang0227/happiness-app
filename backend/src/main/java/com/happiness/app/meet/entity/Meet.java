package com.happiness.app.meet.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "meets", indexes = {
    @Index(name = "idx_meets_requester", columnList = "requester_id"),
    @Index(name = "idx_meets_receiver",  columnList = "receiver_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Meet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long requesterId;

    @Column(nullable = false)
    private Long receiverId;

    /** PENDING / NEGOTIATING / CONFIRMED / CANCELLED / COMPLETED */
    @Column(length = 20, nullable = false)
    @Builder.Default
    private String status = "PENDING";

    @Column(length = 200)
    private String locationName;

    @Column(length = 400)
    private String locationAddress;

    private Double locationLat;
    private Double locationLng;

    private LocalDate confirmedDate;

    @Column(length = 10)
    private String confirmedTime;

    @Column(columnDefinition = "TEXT")
    private String initialMessage;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) this.status = "PENDING";
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
