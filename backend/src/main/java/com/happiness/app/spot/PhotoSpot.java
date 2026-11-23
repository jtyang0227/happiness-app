package com.happiness.app.spot;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** 사진 ↔ 출사 스팟 연결 — 사진 1장당 스팟 1개(UNIQUE photo_id). Photo 엔티티는 바꾸지 않는다. */
@Entity
@Table(name = "photo_spots",
        uniqueConstraints = @UniqueConstraint(name = "uk_photo_spots_photo", columnNames = "photo_id"),
        indexes = @Index(name = "idx_photo_spots_spot", columnList = "spot_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhotoSpot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "photo_id", nullable = false)
    private Long photoId;

    @Column(name = "spot_id", nullable = false)
    private Long spotId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
