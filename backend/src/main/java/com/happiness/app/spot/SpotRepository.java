package com.happiness.app.spot;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SpotRepository extends JpaRepository<Spot, Long> {

    /**
     * 지도 범위·지역·검색어 조회. 범위 값이 null이면 그 조건은 무시한다(목록 모드).
     * region·q는 소문자로 넘긴다(부분 일치, 대소문자 무시).
     */
    @Query("SELECT s FROM Spot s WHERE "
            + "(:minLat IS NULL OR s.lat >= :minLat) AND (:maxLat IS NULL OR s.lat <= :maxLat) AND "
            + "(:minLng IS NULL OR s.lng >= :minLng) AND (:maxLng IS NULL OR s.lng <= :maxLng) AND "
            + "(CAST(:region AS String) IS NULL OR LOWER(s.region) LIKE CONCAT('%', CAST(:region AS String), '%') OR LOWER(s.address) LIKE CONCAT('%', CAST(:region AS String), '%')) AND "
            + "(CAST(:q AS String) IS NULL OR LOWER(s.name) LIKE CONCAT('%', CAST(:q AS String), '%')) "
            + "ORDER BY s.updatedAt DESC, s.id DESC")
    Slice<Spot> search(@Param("minLat") Double minLat, @Param("maxLat") Double maxLat,
                       @Param("minLng") Double minLng, @Param("maxLng") Double maxLng,
                       @Param("region") String region, @Param("q") String q, Pageable pageable);

    /** 중복 제안용 — 대략적인 사각 범위 후보(정확한 거리는 서비스에서 계산) */
    @Query("SELECT s FROM Spot s WHERE s.lat BETWEEN :minLat AND :maxLat AND s.lng BETWEEN :minLng AND :maxLng")
    List<Spot> findInBox(@Param("minLat") double minLat, @Param("maxLat") double maxLat,
                         @Param("minLng") double minLng, @Param("maxLng") double maxLng);

    long countByCreatedByAndCreatedAtAfter(Long createdBy, LocalDateTime after);
}
