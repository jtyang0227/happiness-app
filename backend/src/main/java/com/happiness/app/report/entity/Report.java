package com.happiness.app.report.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reports", indexes = {
    @Index(name = "idx_reports_photo_id",    columnList = "photo_id"),
    @Index(name = "idx_reports_reporter_id", columnList = "reporter_id"),
    @Index(name = "idx_reports_status",      columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 신고된 사진 ID (cross-aggregate plain Long, FK 제약 없음 — 이 프로젝트 관례) */
    @Column(name = "photo_id", nullable = false)
    private Long photoId;

    /** 신고자 회원 ID (JWT principal 에서 추출) */
    @Column(name = "reporter_id", nullable = false)
    private Long reporterId;

    /** COPYRIGHT / INAPPROPRIATE / PRIVACY / SPAM / OTHER */
    @Column(length = 30, nullable = false)
    private String reason;

    /** 상세 설명 (reason=OTHER 일 때 필수) */
    @Column(columnDefinition = "TEXT")
    private String detail;

    /** 증거 스크린샷 URL (업로드 엔드포인트 통해 얻은 URL) */
    @Column(name = "evidence_url", length = 500)
    private String evidenceUrl;

    /** PENDING / RESOLVED / DISMISSED */
    @Column(length = 20, nullable = false)
    @Builder.Default
    private String status = "PENDING";

    /** 어드민이 처리 시 남기는 짧은 메모 (신고자에게 표시) */
    @Column(name = "resolution_note", length = 300)
    private String resolutionNote;

    /** 신고자가 처리 결과를 확인했는지 여부 */
    @Column(name = "reporter_seen", nullable = false)
    @Builder.Default
    private boolean reporterSeen = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** status 가 PENDING 에서 벗어난 시점 */
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = "PENDING";
    }
}
