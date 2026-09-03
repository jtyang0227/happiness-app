package com.happiness.app.gathering.repository;

import com.happiness.app.gathering.entity.GatheringPostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GatheringPostLikeRepository extends JpaRepository<GatheringPostLike, Long> {

    // ── 좋아요 여부 확인 및 단건 조회 ────────────────────────────────────────
    Optional<GatheringPostLike> findByGatheringPostIdAndMemberId(Long gatheringPostId, Long memberId);

    boolean existsByGatheringPostIdAndMemberId(Long gatheringPostId, Long memberId);

    // ── 게시물별 좋아요 수 ────────────────────────────────────────────────────
    long countByGatheringPostId(Long gatheringPostId);

    // ── N+1 방지 — 피드용 배치 조회 ──────────────────────────────────────────
    @Query("SELECT l FROM GatheringPostLike l WHERE l.gatheringPostId IN :postIds")
    List<GatheringPostLike> findByPostIds(@Param("postIds") List<Long> postIds);

    // ── 게시물 삭제 시 cascade ────────────────────────────────────────────────
    void deleteByGatheringPostId(Long gatheringPostId);
}
