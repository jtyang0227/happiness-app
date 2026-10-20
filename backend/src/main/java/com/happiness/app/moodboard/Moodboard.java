package com.happiness.app.moodboard;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** 무드보드 — 이름 붙은 개인 저장 보드(Behance Moodboard 재해석). 비공개(본인만). 기존 "저장"(PhotoSave)과는 별개 목록이다. */
@Entity
@Table(name = "moodboards", indexes = @Index(name = "idx_moodboards_member", columnList = "member_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Moodboard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
