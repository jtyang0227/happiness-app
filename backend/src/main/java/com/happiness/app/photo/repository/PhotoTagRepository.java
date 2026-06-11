package com.happiness.app.photo.repository;

import com.happiness.app.photo.entity.PhotoTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface PhotoTagRepository extends JpaRepository<PhotoTag, Long> {
    List<PhotoTag> findByPhotoId(Long photoId);
    boolean existsByPhotoIdAndMemberId(Long photoId, Long memberId);

    @Transactional
    void deleteByPhotoId(Long photoId);
}
