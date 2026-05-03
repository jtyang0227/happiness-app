package com.happiness.mobileapp.photo.repository;

import com.happiness.mobileapp.photo.entity.PhotoShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PhotoShareRepository extends JpaRepository<PhotoShare, Long> {
    List<PhotoShare> findByPhotoId(Long photoId);
}
