package com.happiness.app.press;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AchievementRepository extends JpaRepository<Achievement, Long> {
    List<Achievement> findByMemberIdOrderByYearMonthDescDisplayOrderAsc(Long memberId);
    void deleteByMemberId(Long memberId);
}
