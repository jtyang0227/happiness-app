package com.happiness.app.gathering.repository;

import com.happiness.app.gathering.entity.GatheringPlaceOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface GatheringPlaceOptionRepository extends JpaRepository<GatheringPlaceOption, Long> {
    List<GatheringPlaceOption> findByGatheringIdOrderByIdAsc(Long gatheringId);

    @Transactional
    void deleteByGatheringId(Long gatheringId);
}
