package com.happiness.app.spot;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PhotoSpotRepository extends JpaRepository<PhotoSpot, Long> {

    Optional<PhotoSpot> findByPhotoId(Long photoId);

    /** 스팟별 공개 사진 수 — [spotId, count]. 비공개 프로필 작가의 사진은 세지 않는다 */
    @Query("SELECT ps.spotId, COUNT(ps) FROM PhotoSpot ps, Photo p, Member m "
            + "WHERE ps.photoId = p.id AND p.memberId = m.id AND m.publicProfile = true AND ps.spotId IN :spotIds "
            + "GROUP BY ps.spotId")
    List<Object[]> countPublicBySpotIds(@Param("spotIds") Collection<Long> spotIds);

    /** 스팟별 공개 사진 id(최신순) — [spotId, photoId]. 미리보기·상세용 */
    @Query("SELECT ps.spotId, p.id FROM PhotoSpot ps, Photo p, Member m "
            + "WHERE ps.photoId = p.id AND p.memberId = m.id AND m.publicProfile = true AND ps.spotId IN :spotIds "
            + "ORDER BY p.createdAt DESC, p.id DESC")
    List<Object[]> findPublicPhotoIdsBySpotIds(@Param("spotIds") Collection<Long> spotIds);

    @Transactional
    void deleteByPhotoId(Long photoId);

    @Transactional
    void deleteBySpotId(Long spotId);

    /** 회원 탈퇴 시 그 회원 사진의 스팟 연결 */
    @Modifying
    @Transactional
    @Query("DELETE FROM PhotoSpot ps WHERE ps.photoId IN (SELECT p.id FROM Photo p WHERE p.memberId = :memberId)")
    void deleteByPhotoOwner(@Param("memberId") Long memberId);
}
