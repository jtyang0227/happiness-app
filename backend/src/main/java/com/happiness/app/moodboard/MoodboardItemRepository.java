package com.happiness.app.moodboard;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

public interface MoodboardItemRepository extends JpaRepository<MoodboardItem, Long> {

    List<MoodboardItem> findByMoodboardIdOrderByCreatedAtDesc(Long moodboardId);

    /** 보드 목록 배치 조회용 — 보드별 최신순 */
    List<MoodboardItem> findByMoodboardIdInOrderByCreatedAtDesc(Collection<Long> moodboardIds);

    boolean existsByMoodboardIdAndPhotoId(Long moodboardId, Long photoId);

    long countByMoodboardId(Long moodboardId);

    @Transactional
    void deleteByMoodboardIdAndPhotoId(Long moodboardId, Long photoId);

    @Transactional
    void deleteByMoodboardId(Long moodboardId);

    @Transactional
    void deleteByPhotoId(Long photoId);

    /** 회원 탈퇴 시 그 회원의 모든 보드 항목 */
    @Modifying
    @Transactional
    @Query("DELETE FROM MoodboardItem i WHERE i.moodboardId IN (SELECT b.id FROM Moodboard b WHERE b.memberId = :memberId)")
    void deleteByOwner(@Param("memberId") Long memberId);
}
