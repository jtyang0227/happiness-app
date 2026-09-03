package com.happiness.app.gathering.repository;

import com.happiness.app.gathering.entity.Gathering;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
}
