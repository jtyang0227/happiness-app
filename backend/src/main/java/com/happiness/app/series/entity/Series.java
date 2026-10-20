package com.happiness.app.series.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "series", indexes = @Index(name = "idx_series_member_id", columnList = "member_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Series {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String coverImageUrl;

    // ── 작업 노트 (PLANNING_portfolio-work-notes-concept.md) — 모두 선택 입력 ──
    /** 촬영 유형 — 문의 폼(InquiryFormPage)과 같은 어휘: 결혼식/제품촬영/인물/프로필/풍경/행사/이벤트/가족/기타 */
    @Column(length = 30)
    private String shootType;

    /** 클라이언트 표기 — 예: "OO 브랜드", "개인 의뢰" */
    @Column(length = 100)
    private String clientLabel;

    /** 작업 시기 — "YYYY.MM" */
    @Column(length = 7)
    private String shotOn;

    /** 작업 이야기 — 평문(HTML 태그 제거), 최대 3000자 */
    @Column(columnDefinition = "TEXT")
    private String story;

    /** 대표 작업 — 작가당 최대 1건. 기존 행 호환을 위해 nullable(null = false) */
    private Boolean pinned;

    /**
     * 함께한 사람(공동 작업자 크레딧, WORK_QUEUE 6) — [{"role","name","profileName"}] JSON 배열.
     * 예약 체크리스트(checklistJson)처럼 작업에 딸린 짧은 목록이라 별도 테이블 없이 둔다. profileName은 선택(회원 포트폴리오 링크).
     */
    @Column(columnDefinition = "TEXT")
    private String creditsJson;

    /** 초안(WORK_QUEUE 7) — true면 작가 본인만 본다(탐색·포트폴리오·공개 상세에서 제외). 기존 행 호환을 위해 nullable(null = 공개) */
    private Boolean draft;

    @Column(nullable = false)
    private Integer displayOrder;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.displayOrder == null) this.displayOrder = 0;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
