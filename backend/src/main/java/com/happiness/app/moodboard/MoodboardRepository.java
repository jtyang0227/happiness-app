package com.happiness.app.moodboard;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface MoodboardRepository extends JpaRepository<Moodboard, Long> {

    List<Moodboard> findByMemberIdOrderByUpdatedAtDesc(Long memberId);

    Optional<Moodboard> findByIdAndMemberId(Long id, Long memberId);

    long countByMemberId(Long memberId);

    @Transactional
    void deleteByMemberId(Long memberId);
}
