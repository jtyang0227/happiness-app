package com.happiness.app.gathering.repository;

import com.happiness.app.gathering.entity.Gathering;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface GatheringRepository extends JpaRepository<Gathering, Long> {

    // ── IDOR 방지 — 생성자 소유권 동시 검증 ──────────────────────────────────────
    Optional<Gathering> findByIdAndCreatedBy(Long id, Long createdBy);

    // ── 공개 목록 (상태 필터, 최신순) ────────────────────────────────────────────
    Page<Gathering> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    Page<Gathering> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // ── 내 모임 — 직접 생성한 모임 ───────────────────────────────────────────────
    List<Gathering> findByCreatedByOrderByCreatedAtDesc(Long createdBy);

    // ── 내 모임 — 참여/대기 중인 모임 ID 목록으로 일괄 조회 ─────────────────────
    @Query("SELECT g FROM Gathering g WHERE g.id IN :ids ORDER BY g.createdAt DESC")
    List<Gathering> findByIdInOrderByCreatedAtDesc(@Param("ids") List<Long> ids);

    // ── 배치: 모집 마감시간이 지난 RECRUITING 모임 → RECRUITMENT_CLOSED 일괄 전환 ──
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Gathering g SET g.status = 'RECRUITMENT_CLOSED' WHERE g.status = 'RECRUITING' AND g.recruitmentEndDateTime < :now")
    int closeExpiredRecruitments(@Param("now") LocalDateTime now);

    // ── 배치: 모집 마감된 모임 → 모임예정(SCHEDULED)으로 전환 (마감 후 대기 상태) ──
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Gathering g SET g.status = 'SCHEDULED' WHERE g.status = 'RECRUITMENT_CLOSED'")
    int promoteClosedToScheduled();

    // ── 배치: 시작시간이 지난 SCHEDULED 모임 → ONGOING 일괄 전환 ──────────────────
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Gathering g SET g.status = 'ONGOING' WHERE g.status = 'SCHEDULED' AND g.startDateTime < :now")
    int startDueGatherings(@Param("now") LocalDateTime now);

    // ── 배치: 종료시간이 지난 ONGOING 모임 → ENDED 일괄 전환 ──────────────────────
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Gathering g SET g.status = 'ENDED' WHERE g.status = 'ONGOING' AND g.endDateTime < :now")
    int endDueGatherings(@Param("now") LocalDateTime now);
}
