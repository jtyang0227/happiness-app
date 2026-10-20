package com.happiness.app.series.repository;

import com.happiness.app.series.entity.SeriesPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

@Repository
public interface SeriesPhotoRepository extends JpaRepository<SeriesPhoto, Long> {

    List<SeriesPhoto> findBySeriesIdOrderByDisplayOrderAsc(Long seriesId);

    /** 작업 탐색 배치 조회용 — 작업별로 묶은 뒤 displayOrder 순 */
    List<SeriesPhoto> findBySeriesIdInOrderBySeriesIdAscDisplayOrderAsc(Collection<Long> seriesIds);

    boolean existsBySeriesIdAndPhotoId(Long seriesId, Long photoId);

    @Transactional
    void deleteBySeriesId(Long seriesId);

    @Transactional
    void deleteBySeriesIdAndPhotoId(Long seriesId, Long photoId);

    @Transactional
    void deleteByPhotoId(Long photoId);

    int countBySeriesId(Long seriesId);
}
