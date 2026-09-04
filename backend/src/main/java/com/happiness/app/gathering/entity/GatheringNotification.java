package com.happiness.app.gathering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 모임 인앱 알림 — Phase 1 (폴링 기반, FCM 없음).
 *
 * type 값:
 *   PARTICIPATION_CONFIRMED — 대기자 → 참여자 자동 승격 또는 생성자 확정
 *   RECRUITMENT_CLOSED      — 모집 마감 (수동 or 배치 자동)
 *   GATHERING_STARTED       — 모임 시작 (배치 SCHEDULED→ONGOING)
 *   NEW_POST                — 모임 피드에 새 게시물 등록
 *   NEW_COMMENT             — 내 게시물에 댓글
 *   NEW_LIKE                — 내 게시물에 좋아요
 *   GATHERING_ENDED         — 모임 종료 (배치 ONGOING→ENDED)
 */
@Entity
@Table(name = "gathering_notifications", indexes = {
    @Index(name = "idx_gn_member_read", columnList = "member_id, is_read"),
    @Index(name = "idx_gn_created_at",  columnList = "created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GatheringNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 수신자 */
    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "gathering_id", nullable = false)
    private Long gatheringId;

    @Column(nullable = false, length = 30)
    private String type;

    /** 한국어 사전 렌더링 메시지 — 클라이언트에서 재조합 불필요 */
    @Column(nullable = false, length = 300)
    private String message;

    /** NEW_POST / NEW_COMMENT / NEW_LIKE 일 때만 설정 */
    @Column(name = "related_post_id")
    private Long relatedPostId;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
