package com.happiness.app.photo.repository;

import com.happiness.app.photo.entity.PhotoLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface PhotoLikeRepository extends JpaRepository<PhotoLike, Long> {
    List<PhotoLike> findByPhotoId(Long photoId);
    boolean existsByPhotoIdAndMemberId(Long photoId, Long memberId);

    @Transactional
    void deleteByPhotoIdAndMemberId(Long photoId, Long memberId);

    @Transactional
    void deleteByPhotoId(Long photoId);
}
