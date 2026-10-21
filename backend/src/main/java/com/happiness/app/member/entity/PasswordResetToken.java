package com.happiness.app.member.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 비밀번호 재설정 토큰 — 원문은 메일 링크에만 있고 DB에는 SHA-256 해시만 둔다(DB가 새도 링크를 만들 수 없다).
 * 30분 만료, 1회용(usedAt), 새 요청 시 이전 미사용 토큰은 사용 처리된다. 기획: PLANNING_account-recovery.md
 */
@Entity
@Table(name = "password_reset_tokens",
       indexes = @Index(name = "idx_password_reset_tokens_member", columnList = "member_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public boolean isUsable(LocalDateTime now) {
        return usedAt == null && expiresAt.isAfter(now);
    }
}
