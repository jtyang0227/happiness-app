package com.happiness.app.moodboard;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "moodboard_items",
       uniqueConstraints = @UniqueConstraint(columnNames = {"moodboard_id", "photo_id"}),
       indexes = @Index(name = "idx_moodboard_items_photo", columnList = "photo_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MoodboardItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "moodboard_id", nullable = false)
    private Long moodboardId;

    @Column(name = "photo_id", nullable = false)
    private Long photoId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
