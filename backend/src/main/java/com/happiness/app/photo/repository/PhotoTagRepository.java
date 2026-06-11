package com.happiness.app.photo.repository;

import com.happiness.app.photo.entity.PhotoTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface PhotoTagRepository extends JpaRepository<PhotoTag, Long> {
    List<PhotoTag> findByPhotoId(Long photoId);
    boolean existsByPhotoIdAndMemberId(Long photoId, Long memberId);

    /** 태그된 이름 목록으로 photoId 조회 — 태그 검색에 사용 */
    @Query("SELECT DISTINCT t.photoId FROM PhotoTag t WHERE LOWER(t.memberName) IN :names")
    List<Long> findPhotoIdsByMemberNamesIn(@Param("names") List<String> names);

    @Transactional
    void deleteByPhotoId(Long photoId);
}
