package com.happiness.app.testimonial;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "testimonials", indexes = @Index(name = "idx_testimonials_member_id", columnList = "member_id"))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Testimonial {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 100)
    private String clientName;

    @Column(length = 100)
    private String clientRole;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(length = 20)
    private String shootDate;

    /** 연결된 작업(시리즈) — 작업 노트 페이지에 이 후기를 함께 보여준다 (PLANNING_portfolio-work-notes-concept.md P2) */
    private Long seriesId;

    @Column(nullable = false)
    private boolean featured = false;

    @Column(nullable = false)
    private int displayOrder = 0;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }
}
