package com.happiness.app.series.repository;

import com.happiness.app.series.entity.Series;
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

    void deleteByMemberId(Long memberId);
}
