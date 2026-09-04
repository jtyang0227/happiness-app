package com.happiness.app.gathering.service;

import com.happiness.app.gathering.dto.GatheringNotificationResponse;
import com.happiness.app.gathering.entity.GatheringNotification;
import com.happiness.app.gathering.repository.GatheringNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 모임 인앱 알림 서비스 — Phase 1.
 * polling 기반(unread-count 배지) — FCM/APNs 없음.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class GatheringNotificationService {

    private final GatheringNotificationRepository notificationRepository;

    // ── 알림 생성 (내부 헬퍼, 다른 서비스에서 호출) ─────────────────────────────

    /**
     * 알림 1건 저장. 실패 시 호출자가 try/catch 처리해야 함.
     */
    public void notify(Long recipientMemberId, Long gatheringId,
                       String type, String message, Long relatedPostId) {
        GatheringNotification notification = GatheringNotification.builder()
                .memberId(recipientMemberId)
                .gatheringId(gatheringId)
                .type(type)
                .message(message)
                .relatedPostId(relatedPostId)
                .build();
        notificationRepository.save(notification);
        log.debug("[GATHERING_NOTIFICATION] type={}, recipient={}, gatheringId={}",
                type, recipientMemberId, gatheringId);
    }

    // ── 조회 ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<GatheringNotificationResponse> getMyNotifications(Long memberId, Pageable pageable) {
        return notificationRepository
                .findByMemberIdOrderByCreatedAtDesc(memberId, pageable)
                .map(GatheringNotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long memberId) {
        return notificationRepository.countByMemberIdAndIsReadFalse(memberId);
    }

    // ── 읽음 처리 ─────────────────────────────────────────────────────────────

    /**
     * 단건 읽음 처리 — IDOR: 수신자 본인만 가능.
     */
    public void markRead(Long id, Long memberId) {
        GatheringNotification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "알림을 찾을 수 없습니다."));

        if (!notification.getMemberId().equals(memberId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "본인의 알림만 읽음 처리할 수 있습니다.");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    /**
     * 전체 읽음 처리 — 현재 회원의 모든 미읽음 알림.
     */
    public void markAllRead(Long memberId) {
        int updated = notificationRepository.markAllReadByMemberId(memberId);
        log.debug("[GATHERING_NOTIFICATION] markAllRead: memberId={}, updated={}", memberId, updated);
    }
}
