package com.happiness.app.series.repository;

import com.happiness.app.series.entity.Series;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import java.util.List;

@Repository
public interface SeriesRepository extends JpaRepository<Series, Long> {

    List<Series> findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(Long memberId);

    /** 대표 작업 고정 시 같은 작가의 다른 작업 고정 해제 */
    @Modifying
    @Query("UPDATE Series s SET s.pinned = false WHERE s.memberId = :memberId AND s.id <> :keepId AND s.pinned = true")
    int unpinOthers(@Param("memberId") Long memberId, @Param("keepId") Long keepId);

    /**
     * 작업 탐색 — 공개 포트폴리오 작가의, 초안이 아니고 사진이 1장 이상 있는 작업. 최근 수정순.
     * shootType/location이 null이면 해당 조건을 건너뛴다(location은 작가 위치 부분 일치, 대소문자 무시).
     */
    @Query("SELECT s FROM Series s, Member m WHERE s.memberId = m.id AND m.publicProfile = true " +
           "AND (:shootType IS NULL OR s.shootType = :shootType) " +
           "AND (:location IS NULL OR LOWER(m.location) LIKE CONCAT('%', LOWER(:location), '%')) " +
           "AND (s.draft IS NULL OR s.draft = false) " +
           "AND EXISTS (SELECT 1 FROM SeriesPhoto sp WHERE sp.seriesId = s.id) " +
           "ORDER BY s.updatedAt DESC, s.id DESC")
    Slice<Series> discover(@Param("shootType") String shootType,
                           @Param("location") String location,
                           Pageable pageable);

    /** discover()와 같은 조건, 감상 많은 순 */
    @Query("SELECT s FROM Series s, Member m WHERE s.memberId = m.id AND m.publicProfile = true " +
           "AND (:shootType IS NULL OR s.shootType = :shootType) " +
           "AND (:location IS NULL OR LOWER(m.location) LIKE CONCAT('%', LOWER(:location), '%')) " +
           "AND (s.draft IS NULL OR s.draft = false) " +
           "AND EXISTS (SELECT 1 FROM SeriesPhoto sp WHERE sp.seriesId = s.id) " +
           "ORDER BY (SELECT COUNT(a) FROM SeriesAppreciation a WHERE a.seriesId = s.id) DESC, s.updatedAt DESC, s.id DESC")
    Slice<Series> discoverByAppreciation(@Param("shootType") String shootType,
                                         @Param("location") String location,
                                         Pageable pageable);

    /** discover()와 같은 조건, 작업 노트 조회(WORK_VIEW) 많은 순 */
    @Query("SELECT s FROM Series s, Member m WHERE s.memberId = m.id AND m.publicProfile = true " +
           "AND (:shootType IS NULL OR s.shootType = :shootType) " +
           "AND (:location IS NULL OR LOWER(m.location) LIKE CONCAT('%', LOWER(:location), '%')) " +
           "AND (s.draft IS NULL OR s.draft = false) " +
           "AND EXISTS (SELECT 1 FROM SeriesPhoto sp WHERE sp.seriesId = s.id) " +
           "ORDER BY (SELECT COUNT(e) FROM AnalyticsEvent e WHERE e.eventType = 'WORK_VIEW' " +
           "AND e.targetType = 'SERIES' AND e.targetId = s.id) DESC, s.updatedAt DESC, s.id DESC")
    Slice<Series> discoverByViews(@Param("shootType") String shootType,
                                  @Param("location") String location,
                                  Pageable pageable);

    /** 추천 표시만 바꾼다 — 엔티티 save면 @PreUpdate가 updatedAt을 갱신해 "최근 수정순"이 흔들리므로 bulk UPDATE */
    @Modifying
    @Transactional
    @Query("UPDATE Series s SET s.featuredAt = :at WHERE s.id = :id")
    int updateFeaturedAt(@Param("id") Long id, @Param("at") LocalDateTime at);

    /** 에디터 추천 — 공개·초안 아님·사진 있음 조건은 같고, 추천한 시각 최근순 */
    @Query("SELECT s FROM Series s, Member m WHERE s.memberId = m.id AND m.publicProfile = true " +
           "AND s.featuredAt IS NOT NULL " +
           "AND (s.draft IS NULL OR s.draft = false) " +
           "AND EXISTS (SELECT 1 FROM SeriesPhoto sp WHERE sp.seriesId = s.id) " +
           "ORDER BY s.featuredAt DESC, s.id DESC")
    Slice<Series> discoverFeatured(Pageable pageable);

    void deleteByMemberId(Long memberId);
}
