package com.happiness.app.gathering.repository;

import com.happiness.app.gathering.entity.GatheringPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GatheringPhotoRepository extends JpaRepository<GatheringPhoto, Long> {

    // ── N+1 방지 — 피드용 배치 조회 (정렬: sortOrder ASC) ────────────────────
    @Query("SELECT p FROM GatheringPhoto p WHERE p.gatheringPostId IN :postIds ORDER BY p.sortOrder ASC")
    List<GatheringPhoto> findByPostIds(@Param("postIds") List<Long> postIds);

    // ── 단일 게시물 사진 목록 ─────────────────────────────────────────────────
    List<GatheringPhoto> findByGatheringPostIdOrderBySortOrderAsc(Long gatheringPostId);

    // ── 앨범: 모임 전체 게시물의 사진 일괄 조회 (createAt ASC) ─────────────────
    @Query("SELECT p FROM GatheringPhoto p " +
           "WHERE p.gatheringPostId IN " +
           "(SELECT gp.id FROM GatheringPost gp WHERE gp.gatheringId = :gatheringId) " +
           "ORDER BY p.createdAt ASC")
    List<GatheringPhoto> findAllPhotosByGatheringId(@Param("gatheringId") Long gatheringId);

    // ── 게시물 삭제 시 cascade ────────────────────────────────────────────────
    void deleteByGatheringPostId(Long gatheringPostId);
}
