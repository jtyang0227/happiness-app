package com.happiness.app.block;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface MemberBlockRepository extends JpaRepository<MemberBlock, Long> {

    List<MemberBlock> findByBlockerIdOrderByCreatedAtDesc(Long blockerId);

    boolean existsByBlockerIdAndBlockedId(Long blockerId, Long blockedId);

    @Transactional
    void deleteByBlockerIdAndBlockedId(Long blockerId, Long blockedId);

    /** 회원 탈퇴 — 내가 차단한 기록과 나를 차단한 기록 모두 */
    @Transactional
    @Modifying
    @Query("DELETE FROM MemberBlock b WHERE b.blockerId = :memberId OR b.blockedId = :memberId")
    void deleteAllInvolving(@Param("memberId") Long memberId);
}
