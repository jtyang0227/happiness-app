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
     * pg_trgm 유사도 검색 — 한글·영문 모두 지원 (PostgreSQL + pg_trgm 확장 필요).
     * - LOWER() 적용으로 영문 대소문자 무시
     * - similarity()  : 전체 문자열 유사도 (한글 부분 일치에 효과적)
     * - word_similarity(): 단어 단위 유사도 (영문 "photography" 에서 "photo" 매칭에 효과적)
     * H2 dev 환경에서는 DataAccessException 발생 → controller에서 JPQL fallback 처리.
     */
    @Query(value = """
        SELECT * FROM photos
        WHERE (
            title ILIKE CONCAT('%', :kw, '%') OR
            COALESCE(description, '') ILIKE CONCAT('%', :kw, '%') OR
            (CHAR_LENGTH(:kw) >= 2 AND (
                LOWER(title) % LOWER(:kw) OR
                LOWER(COALESCE(description, '')) % LOWER(:kw) OR
                LOWER(:kw) <% LOWER(title) OR
                LOWER(:kw) <% LOWER(COALESCE(description, ''))
            ))
        )
        AND (:colorMood = '' OR color_mood = :colorMood)
        AND (:memberId IS NULL OR member_id = :memberId)
        AND (:imageRatio = '' OR image_ratio = :imageRatio)
        ORDER BY GREATEST(
            similarity(LOWER(title),                        LOWER(:kw)),
            similarity(LOWER(COALESCE(description, '')),    LOWER(:kw)),
            word_similarity(LOWER(:kw), LOWER(title)),
            word_similarity(LOWER(:kw), LOWER(COALESCE(description, '')))
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

    // ── 통계 집계 ────────────────────────────────────────────

    @Query("SELECT COUNT(p) FROM Photo p WHERE p.memberId = :memberId")
    long countByMemberId(@Param("memberId") Long memberId);

    @Query("SELECT COALESCE(SUM(p.likesCount), 0) FROM Photo p WHERE p.memberId = :memberId")
    long sumLikesCountByMemberId(@Param("memberId") Long memberId);

    @Query("SELECT COALESCE(SUM(p.savesCount), 0) FROM Photo p WHERE p.memberId = :memberId")
    long sumSavesCountByMemberId(@Param("memberId") Long memberId);

    @Query("SELECT COALESCE(SUM(p.sharesCount), 0) FROM Photo p WHERE p.memberId = :memberId")
    long sumSharesCountByMemberId(@Param("memberId") Long memberId);

    @Query("SELECT p.id FROM Photo p WHERE p.memberId = :memberId")
    List<Long> findIdsByMemberId(@Param("memberId") Long memberId);

    void deleteByMemberId(Long memberId);

    /** 피드 — 팔로우한 유저들의 사진 최신순 (Pageable 지원) */
    @Query("SELECT p FROM Photo p WHERE p.memberId IN :memberIds ORDER BY p.createdAt DESC")
    List<Photo> findByMemberIdInOrderByCreatedAtDesc(@Param("memberIds") List<Long> memberIds, Pageable pageable);
}
