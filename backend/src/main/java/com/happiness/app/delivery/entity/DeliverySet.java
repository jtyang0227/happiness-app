package com.happiness.app.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_sets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliverySet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(length = 64, unique = true, nullable = false)
    private String token;

    @Column(length = 200, nullable = false)
    private String title;

    @Column(length = 100)
    private String clientName;

    /** PENDING / APPROVED / REJECTED */
    @Column(length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(length = 255)
    private String passwordHash;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    private LocalDateTime approvedAt;
    private LocalDateTime viewedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = "PENDING";
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiresAt);
    }
}
