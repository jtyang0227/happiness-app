package com.happiness.app.photo.repository;

import com.happiness.app.photo.entity.Photo;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PhotoRepository extends JpaRepository<Photo, Long> {

    List<Photo> findByMemberIdOrderByCreatedAtDesc(Long memberId);

    /** displayOrder 우선, 동률은 createdAt 역순 */
    List<Photo> findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(Long memberId);

    List<Photo> findByColorMoodOrderByCreatedAtDesc(String colorMood);

    /** 복합 필터 + 동적 정렬 (Sort 파라미터로 ORDER BY 위임) */
    @Query("""
        SELECT p FROM Photo p
        WHERE (:keyword IS NULL OR :keyword = '' OR
               LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
               LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:colorMood IS NULL OR :colorMood = '' OR p.colorMood = :colorMood)
          AND (:memberId IS NULL OR p.memberId = :memberId)
          AND (:imageRatio IS NULL OR :imageRatio = '' OR p.imageRatio = :imageRatio)
        """)
    List<Photo> search(
            @Param("keyword")    String keyword,
            @Param("colorMood")  String colorMood,
            @Param("memberId")   Long memberId,
            @Param("imageRatio") String imageRatio,
            Sort sort
    );

    void deleteByMemberId(Long memberId);
}
