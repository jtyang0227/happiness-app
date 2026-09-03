package com.happiness.app.gathering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 모임 게시물에 첨부된 사진 (0~N장, sortOrder로 순서 관리).
 * EXIF/takenAt 필드는 이번 슬라이스에서 의도적으로 제외 — 차기 슬라이스에서 추가.
 */
@Entity
@Table(
    name = "gathering_photos",
    indexes = {
        @Index(name = "idx_gathering_photos_post_id", columnList = "gathering_post_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gathering_post_id", nullable = false)
    private Long gatheringPostId;

    @Column(length = 500, nullable = false)
    private String imageUrl;

    @Column(nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(columnDefinition = "TEXT")
    private String caption;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
