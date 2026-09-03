package com.happiness.app.gathering.repository;

import com.happiness.app.gathering.entity.GatheringPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GatheringPostRepository extends JpaRepository<GatheringPost, Long> {

    // ── IDOR 방지 — 작성자 소유권 동시 검증 ──────────────────────────────────────
    Optional<GatheringPost> findByIdAndMemberId(Long id, Long memberId);

    // ── 모임별 피드 (최신순) ──────────────────────────────────────────────────
    Page<GatheringPost> findByGatheringIdOrderByCreatedAtDesc(Long gatheringId, Pageable pageable);

    // ── 모임 삭제 시 cascade ─────────────────────────────────────────────────
    void deleteByGatheringId(Long gatheringId);

    // ── 앨범용: 모임의 게시물 ID 목록 ──────────────────────────────────────────
    long countByGatheringId(Long gatheringId);
}
