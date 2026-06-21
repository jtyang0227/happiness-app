package com.happiness.app.analytics.service;

import com.happiness.app.analytics.dto.*;
import com.happiness.app.analytics.entity.AnalyticsEvent;
import com.happiness.app.analytics.repository.AnalyticsEventRepository;
import com.happiness.app.photo.entity.Photo;
import com.happiness.app.photo.repository.PhotoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final AnalyticsEventRepository analyticsEventRepository;
    private final PhotoRepository photoRepository;

    // in-memory rate limiting: visitorToken -> [count, windowStartEpochSecond]
    private final ConcurrentHashMap<String, long[]> trackRateMap = new ConcurrentHashMap<>();
    private static final int TRACK_RATE_LIMIT = 60; // per minute

    // ── TRACK EVENT ────────────────────────────────────────────────────────────

    @Transactional
    public void trackEvent(TrackEventRequest req) {
        try {
            if (req.getMemberId() == null || req.getEventType() == null || req.getEventType().isBlank()) {
                return;
            }

            // Rate limit by visitorToken
            if (req.getVisitorToken() != null) {
                checkTrackRateLimit(req.getVisitorToken());
            }

            AnalyticsEvent event = AnalyticsEvent.builder()
                    .eventType(req.getEventType())
                    .targetType(req.getTargetType())
                    .targetId(req.getTargetId())
                    .memberId(req.getMemberId())
                    .visitorToken(req.getVisitorToken())
                    .build();
            analyticsEventRepository.save(event);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to track analytics event: {}", e.getMessage());
        }
    }

    // ── KPI SUMMARY ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public KpiSummaryDto getSummary(Long memberId, int period) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime currentStart = now.minusDays(period);
        LocalDateTime prevStart = now.minusDays((long) period * 2);

        long portfolioViews = analyticsEventRepository.countByMemberAndTypeSince(memberId, "PORTFOLIO_VIEW", currentStart);
        long portfolioViewsPrev = analyticsEventRepository.countByMemberAndTypeSince(memberId, "PORTFOLIO_VIEW", prevStart)
                - portfolioViews;

        long totalLikes = photoRepository.sumLikesCountByMemberId(memberId);
        long totalSaves = photoRepository.sumSavesCountByMemberId(memberId);

        long inquiryCount = analyticsEventRepository.countByMemberAndTypeSince(memberId, "INQUIRY_SENT", currentStart);
        long inquiryCountPrev = analyticsEventRepository.countByMemberAndTypeSince(memberId, "INQUIRY_SENT", prevStart)
                - inquiryCount;

        return KpiSummaryDto.builder()
                .portfolioViews(portfolioViews)
                .portfolioViewsPrev(portfolioViewsPrev)
                .portfolioViewsChange(calcChange(portfolioViews, portfolioViewsPrev))
                .totalLikes(totalLikes)
                .totalLikesPrev(0)
                .totalLikesChange(0)
                .totalSaves(totalSaves)
                .totalSavesPrev(0)
                .totalSavesChange(0)
                .inquiryCount(inquiryCount)
                .inquiryCountPrev(inquiryCountPrev)
                .inquiryCountChange(calcChange(inquiryCount, inquiryCountPrev))
                .period(period)
                .build();
    }

    // ── DAILY VIEWS ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DailyViewDto> getDailyViews(Long memberId, int period) {
        LocalDateTime since = LocalDateTime.now().minusDays(period);
        List<Object[]> rows = analyticsEventRepository.dailyViewsByMember(memberId, since);

        return rows.stream().map(row -> {
            int year  = ((Number) row[0]).intValue();
            int month = ((Number) row[1]).intValue();
            int day   = ((Number) row[2]).intValue();
            long cnt  = ((Number) row[3]).longValue();
            String date = String.format("%04d-%02d-%02d", year, month, day);
            return DailyViewDto.builder().date(date).count(cnt).build();
        }).collect(Collectors.toList());
    }

    // ── TOP PHOTOS ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TopPhotoDto> getTopPhotos(Long memberId, String metric, int limit) {
        // Map metric to event type
        String eventType = switch (metric.toLowerCase()) {
            case "likes"  -> "PHOTO_LIKE";
            case "saves"  -> "PHOTO_SAVE";
            default       -> "PHOTO_VIEW";
        };

        List<Object[]> rows = analyticsEventRepository.topPhotosByEvent(
                memberId, eventType, PageRequest.of(0, limit));

        List<Long> photoIds = rows.stream()
                .map(r -> ((Number) r[0]).longValue())
                .collect(Collectors.toList());

        Map<Long, Photo> photoMap = new HashMap<>();
        if (!photoIds.isEmpty()) {
            photoRepository.findAllById(photoIds).forEach(p -> photoMap.put(p.getId(), p));
        }

        return rows.stream().map(row -> {
            Long photoId = ((Number) row[0]).longValue();
            long cnt = ((Number) row[1]).longValue();
            Photo photo = photoMap.get(photoId);
            return TopPhotoDto.builder()
                    .photoId(photoId)
                    .title(photo != null ? photo.getTitle() : null)
                    .thumbnailUrl(photo != null ? photo.getThumbnailUrl() : null)
                    .count(cnt)
                    .metric(metric)
                    .build();
        }).collect(Collectors.toList());
    }

    // ── GENRE DISTRIBUTION ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GenreStatDto> getGenreDistribution(Long memberId) {
        List<Object[]> rows = photoRepository.countByGenre(memberId);
        return rows.stream().map(row -> GenreStatDto.builder()
                .genre(row[0] != null ? row[0].toString() : "UNKNOWN")
                .count(((Number) row[1]).longValue())
                .build())
                .collect(Collectors.toList());
    }

    // ── PRIVATE HELPERS ────────────────────────────────────────────────────────

    private double calcChange(long current, long prev) {
        if (prev == 0) return current > 0 ? 100.0 : 0.0;
        return Math.round(((double)(current - prev) / prev) * 10000.0) / 100.0;
    }

    private void checkTrackRateLimit(String visitorToken) {
        long nowEpoch = System.currentTimeMillis() / 1000;
        long[] state = trackRateMap.compute(visitorToken, (k, v) -> {
            if (v == null || nowEpoch - v[1] > 60) {
                return new long[]{1, nowEpoch};
            }
            v[0]++;
            return v;
        });

        if (state[0] > TRACK_RATE_LIMIT) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.");
        }
    }
}
