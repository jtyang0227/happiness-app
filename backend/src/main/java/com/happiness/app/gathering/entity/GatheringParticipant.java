package com.happiness.app.gathering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 모임 참여자 — 한 모임에 한 회원은 하나의 레코드만 가진다 (unique).
 *
 * status:
 *   - PARTICIPATING  : 참여 확정
 *   - WAITING        : 대기 중 (정원 초과 시 서버가 자동 배정, 클라이언트 직접 설정 불가)
 *   - NOT_PARTICIPATING: 미참여 (reason 필드에 사유 보관, 모임 생성자에게만 공개)
 *   - CANCELLED      : 참여 취소 (클라이언트 → cancelParticipation API)
 */
@Entity
@Table(
    name = "gathering_participants",
    indexes = {
        @Index(name = "idx_gathering_participants_gathering", columnList = "gathering_id, status"),
        @Index(name = "idx_gathering_participants_member",   columnList = "member_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_gathering_member", columnNames = {"gathering_id", "member_id"})
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gathering_id", nullable = false)
    private Long gatheringId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    /**
     * PARTICIPATING | WAITING | NOT_PARTICIPATING | CANCELLED
     */
    @Column(length = 20, nullable = false)
    private String status;

    /**
     * 미참여 사유 — reason=OTHER 포함 자유 텍스트.
     * 모임 생성자에게만 공개 (서비스/DTO 레이어에서 필터링).
     */
    @Column(length = 200)
    private String reason;

    @Column(nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @PrePersist
    protected void onCreate() {
        if (this.joinedAt == null) {
            this.joinedAt = LocalDateTime.now();
        }
    }
}
