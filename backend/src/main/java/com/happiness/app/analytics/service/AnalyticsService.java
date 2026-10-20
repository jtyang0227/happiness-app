package com.happiness.app.analytics.service;

import com.happiness.app.analytics.dto.TopWorkDto;
import com.happiness.app.inquiry.repository.InquiryRepository;
import com.happiness.app.series.entity.Series;
import com.happiness.app.series.repository.SeriesRepository;
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
    private final SeriesRepository seriesRepository;
    private final InquiryRepository inquiryRepository;

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

            // 작업·사진 조회는 그 콘텐츠의 실제 작가에게만 기록한다 — 남의 조회수를 부풀리는 요청은 버린다
            if ("SERIES".equals(req.getTargetType())) {
                boolean owned = req.getTargetId() != null && seriesRepository.findById(req.getTargetId())
                        .map(s -> s.getMemberId().equals(req.getMemberId())).orElse(false);
                if (!owned) return;
            }
            if ("PHOTO".equals(req.getTargetType())) {
                boolean owned = req.getTargetId() != null && photoRepository.findById(req.getTargetId())
                        .map(p -> req.getMemberId().equals(p.getMemberId())).orElse(false);
                if (!owned) return;
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

        long photoViews = analyticsEventRepository.countByMemberAndTypeSince(memberId, "PHOTO_VIEW", currentStart);
        long photoViewsPrev = analyticsEventRepository.countByMemberAndTypeSince(memberId, "PHOTO_VIEW", prevStart)
                - photoViews;

        long totalLikes = photoRepository.sumLikesCountByMemberId(memberId);
        long totalSaves = photoRepository.sumSavesCountByMemberId(memberId);

        long inquiryCount = analyticsEventRepository.countByMemberAndTypeSince(memberId, "INQUIRY_SENT", currentStart);
        long inquiryCountPrev = analyticsEventRepository.countByMemberAndTypeSince(memberId, "INQUIRY_SENT", prevStart)
                - inquiryCount;

        return KpiSummaryDto.builder()
                .portfolioViews(portfolioViews)
                .portfolioViewsPrev(portfolioViewsPrev)
                .portfolioViewsChange(calcChange(portfolioViews, portfolioViewsPrev))
                .photoViews(photoViews)
                .photoViewsPrev(photoViewsPrev)
                .photoViewsChange(calcChange(photoViews, photoViewsPrev))
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
        String m = metric == null ? "views" : metric.toLowerCase();

        // 좋아요/저장/공유는 사진 엔티티의 카운터가 원천이다. 예전에는 PHOTO_LIKE/PHOTO_SAVE 이벤트를 집계했지만
        // 그 이벤트를 기록하는 곳이 없어 카드가 항상 비어 있었고, "shares"는 조회 이벤트로 잘못 매핑돼 있었다.
        if (!"views".equals(m)) {
            String field = switch (m) {
                case "saves"  -> "savesCount";
                case "shares" -> "sharesCount";
                default       -> "likesCount";
            };
            return photoRepository.findByMemberId(memberId,
                            PageRequest.of(0, limit, org.springframework.data.domain.Sort.by(
                                    org.springframework.data.domain.Sort.Direction.DESC, field, "createdAt")))
                    .stream()
                    .map(p -> toTopPhoto(p, m, switch (field) {
                        case "savesCount"  -> nz(p.getSavesCount());
                        case "sharesCount" -> nz(p.getSharesCount());
                        default            -> nz(p.getLikesCount());
                    }))
                    .filter(dto -> dto.getCount() > 0)
                    .collect(Collectors.toList());
        }

        // 조회수는 PHOTO_VIEW 이벤트(사진 상세·모달 진입 시 기록)
        List<Object[]> rows = analyticsEventRepository.topPhotosByEvent(
                memberId, "PHOTO_VIEW", PageRequest.of(0, limit));
        List<Long> photoIds = rows.stream().map(r -> ((Number) r[0]).longValue()).collect(Collectors.toList());
        Map<Long, Photo> photoMap = new HashMap<>();
        if (!photoIds.isEmpty()) {
            photoRepository.findAllById(photoIds).forEach(p -> photoMap.put(p.getId(), p));
        }
        return rows.stream()
                .filter(r -> photoMap.containsKey(((Number) r[0]).longValue()))   // 삭제된 사진 제외
                .map(r -> toTopPhoto(photoMap.get(((Number) r[0]).longValue()), "views", ((Number) r[1]).longValue()))
                .collect(Collectors.toList());
    }

    private static long nz(Integer v) { return v == null ? 0 : v; }

    private static TopPhotoDto toTopPhoto(Photo p, String metric, long count) {
        return TopPhotoDto.builder()
                .photoId(p.getId())
                .title(p.getTitle())
                .thumbnailUrl(p.getThumbnailUrl() != null ? p.getThumbnailUrl() : p.getImageUrl())
                .count(count)
                .metric(metric)
                .likesCount(p.getLikesCount())
                .savesCount(p.getSavesCount())
                .sharesCount(p.getSharesCount())
                .build();
    }

    // ── TOP WORKS (작업 노트 P2) ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TopWorkDto> getTopWorks(Long memberId, int period, int limit) {
        LocalDateTime since = LocalDateTime.now().minusDays(period);
        List<Object[]> rows = analyticsEventRepository.topTargetsSince(
                memberId, "WORK_VIEW", "SERIES", since, PageRequest.of(0, limit));
        List<Long> seriesIds = rows.stream().map(r -> ((Number) r[0]).longValue()).collect(Collectors.toList());
        if (seriesIds.isEmpty()) return List.of();

        Map<Long, Series> seriesMap = new HashMap<>();
        seriesRepository.findAllById(seriesIds).forEach(s -> seriesMap.put(s.getId(), s));
        Map<Long, Long> inquiryMap = new HashMap<>();
        inquiryRepository.countBySourceSeriesSince(memberId, seriesIds, since)
                .forEach(r -> inquiryMap.put(((Number) r[0]).longValue(), ((Number) r[1]).longValue()));

        return rows.stream()
                .map(r -> ((Number) r[0]).longValue())
                .filter(seriesMap::containsKey)          // 삭제된 작업은 제외
                .map(id -> {
                    Series s = seriesMap.get(id);
                    long views = rows.stream().filter(r -> ((Number) r[0]).longValue() == id)
                            .findFirst().map(r -> ((Number) r[1]).longValue()).orElse(0L);
                    return TopWorkDto.builder()
                            .seriesId(id).title(s.getTitle()).coverImageUrl(s.getCoverImageUrl())
                            .views(views).inquiries(inquiryMap.getOrDefault(id, 0L))
                            .build();
                })
                .collect(Collectors.toList());
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
