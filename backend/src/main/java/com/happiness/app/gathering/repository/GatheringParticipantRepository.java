package com.happiness.app.gathering.repository;

import com.happiness.app.gathering.entity.GatheringParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GatheringParticipantRepository extends JpaRepository<GatheringParticipant, Long> {

    // ── 단건 조회 ─────────────────────────────────────────────────────────────
    Optional<GatheringParticipant> findByGatheringIdAndMemberId(Long gatheringId, Long memberId);

    // ── 카운트 ────────────────────────────────────────────────────────────────
    long countByGatheringIdAndStatus(Long gatheringId, String status);

    // ── 상태별 목록 ───────────────────────────────────────────────────────────
    List<GatheringParticipant> findByGatheringIdAndStatus(Long gatheringId, String status);

    /** 대기자 승격용 — joinedAt 오름차순 1명 */
    Optional<GatheringParticipant> findFirstByGatheringIdAndStatusOrderByJoinedAtAsc(
            Long gatheringId, String status);

    // ── 내 모임 목록용 ────────────────────────────────────────────────────────
    List<GatheringParticipant> findByMemberIdAndStatusIn(Long memberId, List<String> statuses);

    // ── 모임 삭제 시 cascade ─────────────────────────────────────────────────
    void deleteByGatheringId(Long gatheringId);

    // ── 전체 조회 (생성자 화면용 — 모든 상태 포함) ──────────────────────────────
    @Query("SELECT p FROM GatheringParticipant p WHERE p.gatheringId = :gatheringId ORDER BY p.joinedAt ASC")
    List<GatheringParticipant> findAllByGatheringId(@Param("gatheringId") Long gatheringId);
}
