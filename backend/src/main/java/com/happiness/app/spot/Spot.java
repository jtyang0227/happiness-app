package com.happiness.app.spot;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 출사 스팟 (ANALYSIS_chulsa-app-public-features.md P0) — 작가가 직접 고른 공공 촬영 장소.
 * 사진 EXIF의 GPS는 쓰지 않는다(집·작업실 위치 노출 방지). 좌표는 스팟 단위로만 공개한다.
 */
@Entity
@Table(name = "spots", indexes = {
        @Index(name = "idx_spots_lat_lng", columnList = "lat, lng"),
        @Index(name = "idx_spots_region", columnList = "region"),
        @Index(name = "idx_spots_created_by", columnList = "created_by")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Spot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false)
    private Double lat;

    @Column(nullable = false)
    private Double lng;

    @Column(length = 200)
    private String address;

    /** "서울 성동구" 수준의 지역 이름 — 목록 필터용 */
    @Column(length = 30)
    private String region;

    /** 찍기 좋은 시간 (예: "일몰 30분 전") */
    @Column(name = "best_time", length = 30)
    private String bestTime;

    /** 주차·입장료·포인트 같은 팁 (HTML 태그 제거, 1000자) */
    @Column(columnDefinition = "TEXT")
    private String tips;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
