package com.happiness.app.photo.repository;

import com.happiness.app.photo.entity.Photo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PhotoRepository extends JpaRepository<Photo, Long> {

    List<Photo> findByMemberIdOrderByCreatedAtDesc(Long memberId);

    List<Photo> findByColorMoodOrderByCreatedAtDesc(String colorMood);

    @Query("""
        SELECT p FROM Photo p
        WHERE (:keyword IS NULL OR :keyword = '' OR
               LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
               LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:colorMood IS NULL OR :colorMood = '' OR p.colorMood = :colorMood)
          AND (:memberId IS NULL OR p.memberId = :memberId)
        ORDER BY p.createdAt DESC
        """)
    List<Photo> search(
            @Param("keyword")   String keyword,
            @Param("colorMood") String colorMood,
            @Param("memberId")  Long memberId
    );

    void deleteByMemberId(Long memberId);
}
