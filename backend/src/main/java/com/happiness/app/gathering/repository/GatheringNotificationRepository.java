package com.happiness.app.gathering.repository;

import com.happiness.app.gathering.entity.GatheringNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface GatheringNotificationRepository extends JpaRepository<GatheringNotification, Long> {

    /** 내 알림 목록 — 최신순 */
    Page<GatheringNotification> findByMemberIdOrderByCreatedAtDesc(Long memberId, Pageable pageable);

    /** 읽지 않은 알림 수 */
    long countByMemberIdAndIsReadFalse(Long memberId);

    /** 내 알림 전체 읽음 처리 — MeetRepository / GatheringRepository 와 동일하게 clearAutomatically 적용 */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE GatheringNotification n SET n.isRead = true WHERE n.memberId = :memberId AND n.isRead = false")
    int markAllReadByMemberId(@Param("memberId") Long memberId);
}
