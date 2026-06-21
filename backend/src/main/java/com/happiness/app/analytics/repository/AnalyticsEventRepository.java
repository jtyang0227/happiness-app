package com.happiness.app.analytics.repository;

import com.happiness.app.analytics.entity.AnalyticsEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, Long> {

    @Query("SELECT COUNT(e) FROM AnalyticsEvent e WHERE e.memberId = :memberId AND e.eventType = :eventType AND e.createdAt >= :since")
    long countByMemberAndTypeSince(
            @Param("memberId") Long memberId,
            @Param("eventType") String eventType,
            @Param("since") LocalDateTime since
    );

    /**
     * 일별 포트폴리오 조회수 — H2/PostgreSQL 모두 호환 JPQL 사용
     * (DATE() 대신 YEAR/MONTH/DAY 함수 조합)
     */
    @Query("""
        SELECT YEAR(e.createdAt), MONTH(e.createdAt), DAY(e.createdAt), COUNT(e)
        FROM AnalyticsEvent e
        WHERE e.memberId = :memberId
          AND e.eventType = 'PORTFOLIO_VIEW'
          AND e.createdAt >= :since
        GROUP BY YEAR(e.createdAt), MONTH(e.createdAt), DAY(e.createdAt)
        ORDER BY YEAR(e.createdAt), MONTH(e.createdAt), DAY(e.createdAt)
        """)
    List<Object[]> dailyViewsByMember(
            @Param("memberId") Long memberId,
            @Param("since") LocalDateTime since
    );

    @Query("""
        SELECT e.targetId, COUNT(e) as cnt
        FROM AnalyticsEvent e
        WHERE e.memberId = :memberId
          AND e.targetType = 'PHOTO'
          AND e.eventType = :eventType
        GROUP BY e.targetId
        ORDER BY cnt DESC
        """)
    List<Object[]> topPhotosByEvent(
            @Param("memberId") Long memberId,
            @Param("eventType") String eventType,
            Pageable pageable
    );

    /** visitorToken 기준 최근 1분 이내 이벤트 수 (rate limiting용) */
    @Query("SELECT COUNT(e) FROM AnalyticsEvent e WHERE e.visitorToken = :token AND e.createdAt >= :since")
    long countByVisitorTokenSince(
            @Param("token") String token,
            @Param("since") LocalDateTime since
    );
}
