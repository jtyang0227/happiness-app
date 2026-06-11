package com.happiness.app.series.repository;

import com.happiness.app.series.entity.Series;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeriesRepository extends JpaRepository<Series, Long> {

    List<Series> findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(Long memberId);

    void deleteByMemberId(Long memberId);
}
