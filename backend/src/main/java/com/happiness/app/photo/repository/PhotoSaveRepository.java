package com.happiness.app.photo.repository;

import com.happiness.app.photo.entity.PhotoSave;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface PhotoSaveRepository extends JpaRepository<PhotoSave, Long> {
    List<PhotoSave> findByMemberId(Long memberId);
    boolean existsByPhotoIdAndMemberId(Long photoId, Long memberId);

    @Transactional
    void deleteByPhotoIdAndMemberId(Long photoId, Long memberId);
}
