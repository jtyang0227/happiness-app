package com.happiness.app.member.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.persistence.*;
import lombok.Builder.Default;
import java.time.LocalDateTime;

@Entity
@Table(name = "members")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String tel;

    @Column(nullable = false)
    private String name;

    @Column(nullable = true)
    private String password;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private MemberStatus status;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Authority authority;

    @Column(nullable = true)
    private String provider;

    @Column(nullable = true)
    private String providerId;

    /** 포트폴리오 서브도메인 슬러그 (소문자·숫자·하이픈, 3-30자, 고유값) */
    @Column(nullable = true, unique = true, length = 30)
    private String profileName;

    /** 인스타그램 아이디 (@ 제외하여 저장) */
    @Column(nullable = true, length = 50)
    private String instagramId;

    @Column(nullable = true, length = 500)
    private String avatarUrl;

    @Column(nullable = true, length = 500)
    private String coverUrl;

    @Column(columnDefinition = "TEXT", nullable = true)
    private String bio;

    @Column(nullable = true, length = 300)
    private String websiteUrl;

    @Column(nullable = true, length = 100)
    private String location;

    /** 촬영 전문 분야 — 콤마 구분 문자열 (예: "결혼식,인물,풍경") */
    @Column(nullable = true, length = 300)
    private String specialties;

    /** 포트폴리오 공개 여부 (기본값: 공개) */
    @Default
    @Column(nullable = false)
    private boolean publicProfile = true;

    /** 새 문의 이메일 알림 수신 여부 (기본값: 수신) */
    @Default
    @Column(nullable = false)
    private boolean emailNotifications = true;

    /** 포트폴리오 레이아웃 — grid | magazine | slideshow (기본값: grid) */
    @Column(nullable = true, length = 20)
    private String portfolioLayout;

    /** 포트폴리오 커버 사진 ID (null이면 기본 그라디언트 배경) */
    @Column(nullable = true)
    private Long portfolioCoverPhotoId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
