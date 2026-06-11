package com.happiness.app.series.repository;

import com.happiness.app.series.entity.SeriesPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface SeriesPhotoRepository extends JpaRepository<SeriesPhoto, Long> {

    List<SeriesPhoto> findBySeriesIdOrderByDisplayOrderAsc(Long seriesId);

    boolean existsBySeriesIdAndPhotoId(Long seriesId, Long photoId);

    @Transactional
    void deleteBySeriesId(Long seriesId);

    @Transactional
    void deleteBySeriesIdAndPhotoId(Long seriesId, Long photoId);

    @Transactional
    void deleteByPhotoId(Long photoId);

    int countBySeriesId(Long seriesId);
}
