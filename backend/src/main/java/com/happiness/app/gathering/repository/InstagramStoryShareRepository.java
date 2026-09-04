package com.happiness.app.gathering.repository;

import com.happiness.app.gathering.entity.InstagramStoryShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InstagramStoryShareRepository extends JpaRepository<InstagramStoryShare, Long> {
    // save() 만 사용. 필요 시 아래를 추가할 수 있으나 현재 슬라이스에서는 불필요.
    // List<InstagramStoryShare> findByGatheringIdAndMemberIdOrderBySharedAtDesc(Long gatheringId, Long memberId);
}
