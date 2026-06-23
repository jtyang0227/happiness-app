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

    // ── EXIF 메타데이터 ─────────────────────────────────
    @Column(nullable = true, length = 100) private String cameraModel;
    @Column(nullable = true, length = 100) private String lensModel;
    @Column(nullable = true, length = 20)  private String aperture;
    @Column(nullable = true, length = 20)  private String shutterSpeed;
    @Column(nullable = true)               private Integer iso;
    @Column(nullable = true, length = 20)  private String focalLength;

    // ── Feature 26 — 장르 분류 ──────────────────────────
    /** 주 장르 (PORTRAIT/WEDDING/LANDSCAPE/NATURE/STREET/ARCHITECTURE/FOOD/TRAVEL/FASHION/LIFESTYLE/COMMERCIAL/FINE_ART) */
    @Column(name = "genre", length = 20)
    private String genre;

    /** 서브 장르 목록 (JSON 배열 문자열, 최대 2개, 예: '["FASHION","LIFESTYLE"]') */
    @Column(name = "sub_genres", length = 60)
    private String subGenres;

    // ── Feature 25 — 매거진 판 타입 ──────────────────────
    /** 판 레이아웃 타입 (FULL_BLEED/SPLIT/EDITORIAL/TRIPTYCH/FEATURE/PORTRAIT_FOCUS/FILM_STRIP) */
    @Column(name = "pan_type", length = 20)
    private String panType;

    /** 매거진 전용 에디토리얼 캡션 (기존 description과 별도) */
    @Column(name = "magazine_caption", columnDefinition = "TEXT")
    private String magazineCaption;

    /** 2분할판(SPLIT): 이미지를 우측에 배치 여부 */
    @Column(name = "image_right")
    private Boolean imageRight;

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
        if (this.panType == null) this.panType = "EDITORIAL";
        if (this.imageRight == null) this.imageRight = false;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
