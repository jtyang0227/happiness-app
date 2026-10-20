package com.happiness.app.inquiry.repository;

import com.happiness.app.inquiry.entity.Inquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    List<Inquiry> findByReceiverMemberIdOrderByCreatedAtDesc(Long memberId);

    long countByReceiverMemberId(Long memberId);

    long countByReceiverMemberIdAndIsReadFalse(Long memberId);

    void deleteByReceiverMemberId(Long memberId);

    /** 작업(시리즈)별 기간 내 문의 수 — 분석 대시보드 "많이 본 작업"의 문의 전환 집계 */
    @org.springframework.data.jpa.repository.Query("""
        SELECT i.sourceSeriesId, COUNT(i) FROM Inquiry i
        WHERE i.receiverMemberId = :memberId
          AND i.sourceSeriesId IN :seriesIds
          AND i.createdAt >= :since
        GROUP BY i.sourceSeriesId
        """)
    List<Object[]> countBySourceSeriesSince(
            @org.springframework.data.repository.query.Param("memberId") Long memberId,
            @org.springframework.data.repository.query.Param("seriesIds") java.util.Collection<Long> seriesIds,
            @org.springframework.data.repository.query.Param("since") java.time.LocalDateTime since
    );
}
