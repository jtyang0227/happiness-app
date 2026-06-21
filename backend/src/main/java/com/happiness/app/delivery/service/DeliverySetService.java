package com.happiness.app.delivery.service;

import com.happiness.app.delivery.dto.*;
import com.happiness.app.delivery.entity.DeliverySet;
import com.happiness.app.delivery.entity.DeliverySetPhoto;
import com.happiness.app.delivery.entity.DeliverySetPhotoId;
import com.happiness.app.delivery.repository.DeliverySetPhotoRepository;
import com.happiness.app.delivery.repository.DeliverySetRepository;
import com.happiness.app.photo.entity.Photo;
import com.happiness.app.photo.repository.PhotoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliverySetService {

    private final DeliverySetRepository deliverySetRepository;
    private final DeliverySetPhotoRepository deliverySetPhotoRepository;
    private final PhotoRepository photoRepository;
    private final PasswordEncoder passwordEncoder;

    // in-memory rate limiting: token -> [attemptCount, blockedUntilEpochSecond]
    private final ConcurrentHashMap<String, long[]> passwordAttempts = new ConcurrentHashMap<>();

    private static final int MAX_PASSWORD_ATTEMPTS = 5;
    private static final long BLOCK_DURATION_SECONDS = 15 * 60L; // 15 minutes

    // ── CREATE ────────────────────────────────────────────────────────────────

    @Transactional
    public DeliverySetResponse create(Long memberId, CreateDeliveryRequest req) {
        int days = Math.max(1, Math.min(90, req.getExpiresInDays()));

        String token = UUID.randomUUID().toString().replace("-", "");
        String passwordHash = (req.getPassword() != null && !req.getPassword().isBlank())
                ? passwordEncoder.encode(req.getPassword())
                : null;

        DeliverySet set = DeliverySet.builder()
                .memberId(memberId)
                .token(token)
                .title(req.getTitle())
                .clientName(req.getClientName())
                .status("PENDING")
                .passwordHash(passwordHash)
                .expiresAt(LocalDateTime.now().plusDays(days))
                .build();

        set = deliverySetRepository.save(set);

        if (req.getPhotoIds() != null && !req.getPhotoIds().isEmpty()) {
            final Long setId = set.getId();
            List<DeliverySetPhoto> photos = new ArrayList<>();
            int order = 0;
            for (Long photoId : req.getPhotoIds()) {
                photos.add(DeliverySetPhoto.builder()
                        .id(new DeliverySetPhotoId(setId, photoId))
                        .sortOrder(order++)
                        .liked(false)
                        .build());
            }
            deliverySetPhotoRepository.saveAll(photos);
        }

        long photoCount = req.getPhotoIds() != null ? req.getPhotoIds().size() : 0;
        return toResponse(set, photoCount);
    }

    // ── LIST FOR MEMBER ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DeliverySetResponse> getSummariesForMember(Long memberId) {
        return deliverySetRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                .map(set -> {
                    long count = deliverySetPhotoRepository.countByIdDeliverySetId(set.getId());
                    return toResponse(set, count);
                })
                .collect(Collectors.toList());
    }

    // ── GET DETAIL FOR CLIENT ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public DeliverySetDetail getDetailForClient(String token, String password) {
        DeliverySet set = deliverySetRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "배달 세트를 찾을 수 없습니다"));

        if (set.isExpired()) {
            throw new ResponseStatusException(HttpStatus.GONE, "링크가 만료되었습니다");
        }

        if (set.getPasswordHash() != null) {
            checkRateLimit(token);
            if (password == null || !passwordEncoder.matches(password, set.getPasswordHash())) {
                incrementAttempt(token);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "비밀번호가 올바르지 않습니다");
            }
            resetAttempts(token);
        }

        List<DeliverySetPhoto> setPhotos = deliverySetPhotoRepository
                .findByIdDeliverySetIdOrderBySortOrder(set.getId());

        List<Long> photoIds = setPhotos.stream()
                .map(sp -> sp.getId().getPhotoId())
                .collect(Collectors.toList());

        Map<Long, Photo> photoMap = new HashMap<>();
        if (!photoIds.isEmpty()) {
            photoRepository.findAllById(photoIds).forEach(p -> photoMap.put(p.getId(), p));
        }

        List<DeliverySetDetail.DeliveryPhotoItem> items = setPhotos.stream()
                .map(sp -> {
                    Photo photo = photoMap.get(sp.getId().getPhotoId());
                    return DeliverySetDetail.DeliveryPhotoItem.builder()
                            .id(sp.getId().getPhotoId())
                            .imageUrl(photo != null ? photo.getImageUrl() : null)
                            .thumbnailUrl(photo != null ? photo.getThumbnailUrl() : null)
                            .title(photo != null ? photo.getTitle() : null)
                            .liked(sp.isLiked())
                            .sortOrder(sp.getSortOrder())
                            .build();
                })
                .collect(Collectors.toList());

        return DeliverySetDetail.builder()
                .id(set.getId())
                .token(set.getToken())
                .title(set.getTitle())
                .clientName(set.getClientName())
                .status(set.getStatus())
                .feedback(set.getFeedback())
                .expiresAt(set.getExpiresAt())
                .photos(items)
                .build();
    }

    // ── MARK VIEWED ────────────────────────────────────────────────────────────

    @Transactional
    public void markViewed(String token) {
        deliverySetRepository.findByToken(token).ifPresent(set -> {
            if (set.getViewedAt() == null) {
                set.setViewedAt(LocalDateTime.now());
                deliverySetRepository.save(set);
            }
        });
    }

    // ── CLIENT APPROVE ─────────────────────────────────────────────────────────

    @Transactional
    public void approve(String token, ClientActionRequest req) {
        DeliverySet set = deliverySetRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "배달 세트를 찾을 수 없습니다"));

        if (set.isExpired()) {
            throw new ResponseStatusException(HttpStatus.GONE, "링크가 만료되었습니다");
        }

        // Update liked photos
        if (req.getLikedPhotoIds() != null && !req.getLikedPhotoIds().isEmpty()) {
            List<DeliverySetPhoto> setPhotos = deliverySetPhotoRepository
                    .findByIdDeliverySetIdOrderBySortOrder(set.getId());
            Set<Long> likedIds = new HashSet<>(req.getLikedPhotoIds());
            for (DeliverySetPhoto sp : setPhotos) {
                sp.setLiked(likedIds.contains(sp.getId().getPhotoId()));
            }
            deliverySetPhotoRepository.saveAll(setPhotos);
        }

        set.setStatus("APPROVED");
        set.setApprovedAt(LocalDateTime.now());
        set.setFeedback(req.getFeedback());
        deliverySetRepository.save(set);
    }

    // ── CLIENT REJECT ──────────────────────────────────────────────────────────

    @Transactional
    public void reject(String token, ClientActionRequest req) {
        DeliverySet set = deliverySetRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "배달 세트를 찾을 수 없습니다"));

        if (set.isExpired()) {
            throw new ResponseStatusException(HttpStatus.GONE, "링크가 만료되었습니다");
        }

        set.setStatus("REJECTED");
        set.setFeedback(req.getFeedback());
        deliverySetRepository.save(set);
    }

    // ── DELETE SET ─────────────────────────────────────────────────────────────

    @Transactional
    public void deleteSet(Long memberId, Long id) {
        DeliverySet set = deliverySetRepository.findByMemberIdAndId(memberId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 권한이 없습니다"));

        deliverySetPhotoRepository.deleteByDeliverySetId(set.getId());
        deliverySetRepository.delete(set);
    }

    // ── SCHEDULED CLEANUP ─────────────────────────────────────────────────────

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void cleanupExpiredSets() {
        log.info("Cleaning up expired delivery sets...");
        deliverySetRepository.deleteByExpiresAtBefore(LocalDateTime.now());
    }

    // ── PRIVATE HELPERS ────────────────────────────────────────────────────────

    private DeliverySetResponse toResponse(DeliverySet set, long photoCount) {
        return DeliverySetResponse.builder()
                .id(set.getId())
                .token(set.getToken())
                .title(set.getTitle())
                .clientName(set.getClientName())
                .status(set.getStatus())
                .expiresAt(set.getExpiresAt())
                .createdAt(set.getCreatedAt())
                .photoCount(photoCount)
                .viewedAt(set.getViewedAt())
                .approvedAt(set.getApprovedAt())
                .hasPassword(set.getPasswordHash() != null)
                .build();
    }

    private void checkRateLimit(String token) {
        long[] state = passwordAttempts.get(token);
        if (state != null && state[0] >= MAX_PASSWORD_ATTEMPTS) {
            long blockedUntil = state[1];
            if (Instant.now().getEpochSecond() < blockedUntil) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "너무 많은 시도로 잠시 차단되었습니다. 15분 후 다시 시도해주세요.");
            } else {
                // Block period expired, reset
                passwordAttempts.remove(token);
            }
        }
    }

    private void incrementAttempt(String token) {
        long[] state = passwordAttempts.computeIfAbsent(token, k -> new long[]{0, 0});
        state[0]++;
        if (state[0] >= MAX_PASSWORD_ATTEMPTS) {
            state[1] = Instant.now().getEpochSecond() + BLOCK_DURATION_SECONDS;
        }
    }

    private void resetAttempts(String token) {
        passwordAttempts.remove(token);
    }
}
