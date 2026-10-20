package com.happiness.app.series.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** 작업 감상(Behance "Appreciate" 재해석) — 회원당 작업 1회. 사진 좋아요(PhotoLike)와 별개로 작업 단위 반응을 센다. */
@Entity
@Table(name = "series_appreciations",
       uniqueConstraints = @UniqueConstraint(columnNames = {"series_id", "member_id"}),
       indexes = @Index(name = "idx_series_appreciations_member", columnList = "member_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeriesAppreciation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "series_id", nullable = false)
    private Long seriesId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
