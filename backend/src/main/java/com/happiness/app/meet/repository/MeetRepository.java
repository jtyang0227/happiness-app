package com.happiness.app.meet.repository;

import com.happiness.app.meet.entity.Meet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
}
