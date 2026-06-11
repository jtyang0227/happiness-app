package com.happiness.app.photo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "photos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Photo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String imageUrl;

    private String thumbnailUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String imageRatio;

    @Column(nullable = false)
    private Integer likesCount;

    @Column(nullable = false)
    private Integer savesCount;

    @Column(nullable = false)
    private Integer sharesCount;

    /** 12컬럼 그리드에서 차지하는 열 수 (1–12, 기본 6 = 반폭) */
    @Column(nullable = false)
    private Integer gridColSpan;

    /** 색체학 분석: 주요 색상 HEX (예: #FF5733) */
    private String dominantColor;

    /** 색체학 분석: 분위기 무드 (WARM/COOL/NATURAL/VIBRANT/MUTED/ROMANTIC/DRAMATIC/ENERGETIC/SERENE/CLEAN/MONOCHROME) */
    private String colorMood;

    /** 색체학 분석: 상위 5개 팔레트 색상 (JSON 배열 문자열) */
    @Column(columnDefinition = "TEXT")
    private String colorPalette;

    /** 갤러리 표시 순서 (0 = 최신순, 작을수록 앞에 표시) */
    @Column(nullable = true)
    private Integer displayOrder;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.likesCount == null)  this.likesCount  = 0;
        if (this.savesCount == null)  this.savesCount  = 0;
        if (this.sharesCount == null) this.sharesCount = 0;
        if (this.imageRatio == null) this.imageRatio = "1:1";
        if (this.gridColSpan == null || this.gridColSpan < 1 || this.gridColSpan > 12) this.gridColSpan = 6;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
