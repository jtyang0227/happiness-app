package com.happiness.app.press;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PressFeatureRepository extends JpaRepository<PressFeature, Long> {
    List<PressFeature> findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(Long memberId);
    void deleteByMemberId(Long memberId);
}
