package com.happiness.app.gathering.repository;

import com.happiness.app.gathering.entity.GatheringPlaceVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface GatheringPlaceVoteRepository extends JpaRepository<GatheringPlaceVote, Long> {
    Optional<GatheringPlaceVote> findByGatheringIdAndMemberId(Long gatheringId, Long memberId);

    long countByGatheringId(Long gatheringId);

    /** 후보별 득표 — [optionId, count] */
    @Query("SELECT v.optionId, COUNT(v) FROM GatheringPlaceVote v WHERE v.gatheringId = :gid GROUP BY v.optionId")
    List<Object[]> countByOption(@Param("gid") Long gatheringId);

    @Transactional
    void deleteByGatheringId(Long gatheringId);
}
