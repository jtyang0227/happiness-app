package com.happiness.app.series.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "series_photos",
       uniqueConstraints = @UniqueConstraint(columnNames = {"series_id", "photo_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeriesPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "series_id", nullable = false)
    private Long seriesId;

    @Column(name = "photo_id", nullable = false)
    private Long photoId;

    @Column(nullable = false)
    private Integer displayOrder;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.displayOrder == null) this.displayOrder = 0;
    }
}
