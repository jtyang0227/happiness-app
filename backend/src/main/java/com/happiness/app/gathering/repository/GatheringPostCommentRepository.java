package com.happiness.app.gathering.repository;

import com.happiness.app.gathering.entity.GatheringPostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GatheringPostCommentRepository extends JpaRepository<GatheringPostComment, Long> {

    // ── 단일 게시물 댓글 (작성순) ─────────────────────────────────────────────
    List<GatheringPostComment> findByGatheringPostIdOrderByCreatedAtAsc(Long gatheringPostId);

    // ── N+1 방지 — 피드용 배치 조회 ──────────────────────────────────────────
    @Query("SELECT c FROM GatheringPostComment c WHERE c.gatheringPostId IN :postIds ORDER BY c.createdAt ASC")
    List<GatheringPostComment> findByPostIds(@Param("postIds") List<Long> postIds);

    // ── 댓글 수 ──────────────────────────────────────────────────────────────
    long countByGatheringPostId(Long gatheringPostId);

    // ── 게시물 삭제 시 cascade ────────────────────────────────────────────────
    void deleteByGatheringPostId(Long gatheringPostId);
}
