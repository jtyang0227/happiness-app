package com.happiness.app.meet.repository;

import com.happiness.app.meet.entity.Meet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MeetRepository extends JpaRepository<Meet, Long> {

    @Query("SELECT m FROM Meet m WHERE m.requesterId = :id OR m.receiverId = :id ORDER BY m.updatedAt DESC")
    List<Meet> findByMemberIdOrderByUpdatedAtDesc(@Param("id") Long memberId);

    @Query("SELECT m FROM Meet m WHERE m.id = :id AND (m.requesterId = :memberId OR m.receiverId = :memberId)")
    Optional<Meet> findByIdAndMemberId(@Param("id") Long id, @Param("memberId") Long memberId);

    @Query("SELECT COUNT(m) FROM Meet m WHERE (m.requesterId = :id OR m.receiverId = :id) AND m.status = 'PENDING' AND m.receiverId = :id")
    long countPendingForReceiver(@Param("id") Long memberId);

    /** 배치: confirmedDate가 지난 CONFIRMED 약속을 COMPLETED로 일괄 전환 */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Meet m SET m.status = 'COMPLETED' WHERE m.status = 'CONFIRMED' AND m.confirmedDate < :today")
    int completeExpiredConfirmedMeets(@Param("today") LocalDate today);
}
