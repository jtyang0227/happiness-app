package com.happiness.app.series.repository;

import com.happiness.app.series.entity.SeriesAppreciation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

@Repository
public interface SeriesAppreciationRepository extends JpaRepository<SeriesAppreciation, Long> {

    boolean existsBySeriesIdAndMemberId(Long seriesId, Long memberId);

    long countBySeriesId(Long seriesId);

    /** [seriesId, count] — 작업 목록 배치 집계용 */
    @Query("SELECT a.seriesId, COUNT(a) FROM SeriesAppreciation a WHERE a.seriesId IN :ids GROUP BY a.seriesId")
    List<Object[]> countBySeriesIds(@Param("ids") Collection<Long> ids);

    @Transactional
    void deleteBySeriesIdAndMemberId(Long seriesId, Long memberId);

    @Transactional
    void deleteBySeriesId(Long seriesId);

    @Transactional
    void deleteByMemberId(Long memberId);
}
