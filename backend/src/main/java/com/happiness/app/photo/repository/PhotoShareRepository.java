package com.happiness.app.photo.repository;

import com.happiness.app.photo.entity.PhotoShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface PhotoShareRepository extends JpaRepository<PhotoShare, Long> {
    List<PhotoShare> findByPhotoId(Long photoId);

    @Transactional
    void deleteByPhotoId(Long photoId);
}
