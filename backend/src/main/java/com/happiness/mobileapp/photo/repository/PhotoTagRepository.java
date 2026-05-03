package com.happiness.mobileapp.photo.repository;

import com.happiness.mobileapp.photo.entity.PhotoTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PhotoTagRepository extends JpaRepository<PhotoTag, Long> {
    List<PhotoTag> findByPhotoId(Long photoId);
    boolean existsByPhotoIdAndMemberId(Long photoId, Long memberId);
}
