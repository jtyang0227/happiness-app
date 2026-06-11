package com.happiness.app.photo.repository;

import com.happiness.app.photo.entity.Photo;
import org.springframework.data.domain.Pageable;
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

    /**
     * pg_trgm 유사도 검색 (PostgreSQL + pg_trgm 확장 필요).
     * H2 dev 환경에서는 DataAccessException 발생 → controller에서 JPQL fallback 처리.
     */
    @Query(value = """
        SELECT * FROM photos
        WHERE (
            title ILIKE CONCAT('%', :kw, '%') OR
            COALESCE(description, '') ILIKE CONCAT('%', :kw, '%') OR
            (CHAR_LENGTH(:kw) >= 2 AND (title % :kw OR COALESCE(description, '') % :kw))
        )
        AND (:colorMood = '' OR color_mood = :colorMood)
        AND (:memberId IS NULL OR member_id = :memberId)
        AND (:imageRatio = '' OR image_ratio = :imageRatio)
        ORDER BY GREATEST(
            similarity(title, :kw),
            similarity(COALESCE(description, ''), :kw)
        ) DESC, created_at DESC
        """, nativeQuery = true)
    List<Photo> searchFuzzy(
            @Param("kw")         String keyword,
            @Param("colorMood")  String colorMood,
            @Param("memberId")   Long memberId,
            @Param("imageRatio") String imageRatio
    );

    /** 자동완성 — 제목 부분 일치 (최대 5건, JPQL로 H2·PostgreSQL 모두 동작) */
    @Query("SELECT p.title FROM Photo p WHERE LOWER(p.title) LIKE LOWER(CONCAT('%', :q, '%')) ORDER BY p.title")
    List<String> findTitleSuggestions(@Param("q") String q, Pageable pageable);

    void deleteByMemberId(Long memberId);
}
