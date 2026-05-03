package com.happiness.app.photo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "photo_saves", uniqueConstraints = @UniqueConstraint(columnNames = {"photoId", "memberId"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhotoSave {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long photoId;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
