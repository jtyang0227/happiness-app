package com.happiness.app.series.repository;

import com.happiness.app.series.entity.Series;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeriesRepository extends JpaRepository<Series, Long> {

    List<Series> findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(Long memberId);

    /** 대표 작업 고정 시 같은 작가의 다른 작업 고정 해제 */
    @Modifying
    @Query("UPDATE Series s SET s.pinned = false WHERE s.memberId = :memberId AND s.id <> :keepId AND s.pinned = true")
    int unpinOthers(@Param("memberId") Long memberId, @Param("keepId") Long keepId);

    /**
     * 작업 탐색 — 공개 포트폴리오 작가의, 사진이 1장 이상 있는 작업. 최근 수정순.
     * shootType/location이 null이면 해당 조건을 건너뛴다(location은 작가 위치 부분 일치, 대소문자 무시).
     */
    @Query("SELECT s FROM Series s, Member m WHERE s.memberId = m.id AND m.publicProfile = true " +
           "AND (:shootType IS NULL OR s.shootType = :shootType) " +
           "AND (:location IS NULL OR LOWER(m.location) LIKE CONCAT('%', LOWER(:location), '%')) " +
           "AND EXISTS (SELECT 1 FROM SeriesPhoto sp WHERE sp.seriesId = s.id) " +
           "ORDER BY s.updatedAt DESC, s.id DESC")
    Slice<Series> discover(@Param("shootType") String shootType,
                           @Param("location") String location,
                           Pageable pageable);

    void deleteByMemberId(Long memberId);
}
