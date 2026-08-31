package com.happiness.app.report.repository;

import com.happiness.app.report.entity.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Long> {

    /** 어드민 목록 — 상태 필터 있을 때 */
    Page<Report> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    /** 어드민 목록 — 전체(필터 없음) */
    Page<Report> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** 신고자 본인 목록 */
    java.util.List<Report> findByReporterIdOrderByCreatedAtDesc(Long reporterId);

    /**
     * 신고자가 아직 확인하지 않은 처리 결과 수.
     * PENDING 상태는 제외 — 아직 아무 처리도 안 됐으므로 '읽지 않은 결과'가 아님.
     */
    long countByReporterIdAndStatusNotAndReporterSeenFalse(Long reporterId, String status);

    /** IDOR-safe 단건 조회 */
    Optional<Report> findByIdAndReporterId(Long id, Long reporterId);
}
