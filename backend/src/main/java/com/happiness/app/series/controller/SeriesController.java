package com.happiness.app.series.controller;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.photo.dto.PhotoResponse;
import com.happiness.app.photo.entity.Photo;
import com.happiness.app.photo.repository.PhotoRepository;
import com.happiness.app.series.dto.SeriesRequest;
import com.happiness.app.series.dto.SeriesResponse;
import com.happiness.app.series.entity.Series;
import com.happiness.app.series.entity.SeriesPhoto;
import com.happiness.app.series.repository.SeriesPhotoRepository;
import com.happiness.app.series.repository.SeriesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/series")
@RequiredArgsConstructor
public class SeriesController {

    private final SeriesRepository seriesRepository;
    private final SeriesPhotoRepository seriesPhotoRepository;
    private final PhotoRepository photoRepository;

    /** 작업 노트 촬영 유형 — InquiryFormPage SHOOT_TYPES의 value와 동일해야 문의 폼 프리필이 동작한다 */
    private static final Set<String> SHOOT_TYPES =
            Set.of("결혼식", "제품촬영", "인물/프로필", "풍경", "행사/이벤트", "가족", "기타");
    private static final int STORY_MAX = 3000;
    private static final int CLIENT_LABEL_MAX = 100;

    /**
     * 작업 노트 필드 반영. null = 변경 없음, 빈 문자열 = 비우기.
     * 잘못된 값은 400(ResponseStatusException → GlobalExceptionHandler)으로 거절한다.
     */
    private void applyWorkNote(Series series, SeriesRequest req) {
        if (req.getShootType() != null) {
            String v = req.getShootType().trim();
            if (!v.isEmpty() && !SHOOT_TYPES.contains(v)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 촬영 유형입니다.");
            }
            series.setShootType(v.isEmpty() ? null : v);
        }
        if (req.getClientLabel() != null) {
            String v = stripTags(req.getClientLabel());
            if (v.length() > CLIENT_LABEL_MAX) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "클라이언트는 100자 이내로 입력해주세요.");
            }
            series.setClientLabel(v.isEmpty() ? null : v);
        }
        if (req.getShotOn() != null) {
            String v = req.getShotOn().trim();
            if (!v.isEmpty() && !v.matches("^\\d{4}\\.(0[1-9]|1[0-2])$")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "작업 시기는 YYYY.MM 형식으로 입력해주세요.");
            }
            series.setShotOn(v.isEmpty() ? null : v);
        }
        if (req.getStory() != null) {
            String v = stripTags(req.getStory());
            if (v.length() > STORY_MAX) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "작업 이야기는 3000자 이내로 입력해주세요.");
            }
            series.setStory(v.isEmpty() ? null : v);
        }
    }

    private static String stripTags(String input) {
        return input.replaceAll("<[^>]*>", "").trim();
    }

    /** 멤버별 시리즈 목록 (공개) */
    @GetMapping
    public ResponseEntity<List<SeriesResponse>> getSeries(
            @RequestParam(required = false) Long memberId) {
        if (memberId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        List<Series> list = seriesRepository.findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(memberId);
        List<SeriesResponse> result = list.stream().map(s -> {
            List<SeriesPhoto> sps = seriesPhotoRepository.findBySeriesIdOrderByDisplayOrderAsc(s.getId());
            String coverUrl = null;
            if (!sps.isEmpty()) {
                coverUrl = photoRepository.findById(sps.get(0).getPhotoId())
                        .map(p -> p.getThumbnailUrl() != null ? p.getThumbnailUrl() : p.getImageUrl())
                        .orElse(null);
            }
            List<String> previewPhotos = sps.stream().limit(3)
                    .map(sp -> photoRepository.findById(sp.getPhotoId())
                            .map(p -> p.getThumbnailUrl() != null ? p.getThumbnailUrl() : p.getImageUrl())
                            .orElse(null))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            return SeriesResponse.summary(s, sps.size(), coverUrl, previewPhotos);
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /** 시리즈 상세 (공개) */
    @GetMapping("/{id}")
    public ResponseEntity<SeriesResponse> getSeriesById(@PathVariable Long id) {
        return seriesRepository.findById(id)
                .map(series -> {
                    List<SeriesPhoto> sps = seriesPhotoRepository.findBySeriesIdOrderByDisplayOrderAsc(id);
                    List<PhotoResponse> photos = sps.stream()
                            .map(sp -> photoRepository.findById(sp.getPhotoId()))
                            .filter(Optional::isPresent)
                            .map(opt -> PhotoResponse.fromEntity(opt.get()))
                            .collect(Collectors.toList());
                    return ResponseEntity.ok(SeriesResponse.fromEntity(series, photos));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** 시리즈 생성 */
    @PostMapping
    public ResponseEntity<SeriesResponse> createSeries(@RequestBody SeriesRequest req) {
        if (req.getTitle() == null || req.getTitle().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        // 요청의 memberId를 그대로 믿지 않는다 — 본인(또는 관리자)만 해당 회원 명의로 생성 가능
        Long requesterId = SecurityUtil.getCurrentMemberId();
        if (req.getMemberId() == null) {
            req.setMemberId(requesterId);
        } else if (!req.getMemberId().equals(requesterId) && !SecurityUtil.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        int nextOrder = seriesRepository
                .findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(req.getMemberId())
                .size();
        Series series = Series.builder()
                .memberId(req.getMemberId())
                .title(req.getTitle().trim())
                .description(req.getDescription())
                .coverImageUrl(req.getCoverImageUrl())
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : nextOrder)
                .build();
        applyWorkNote(series, req);
        Series saved = seriesRepository.save(series);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(SeriesResponse.fromEntity(saved, Collections.emptyList()));
    }

    /** 시리즈 수정 */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<SeriesResponse> updateSeries(
            @PathVariable Long id, @RequestBody SeriesRequest req, Authentication auth) {
        Long requesterId = SecurityUtil.getCurrentMemberId();
        Series series = seriesRepository.findById(id).orElse(null);
        if (series == null) return ResponseEntity.notFound().build();
        if (!series.getMemberId().equals(requesterId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        if (req.getTitle() != null && !req.getTitle().isBlank()) series.setTitle(req.getTitle().trim());
        if (req.getDescription() != null) series.setDescription(req.getDescription());
        if (req.getCoverImageUrl() != null) series.setCoverImageUrl(req.getCoverImageUrl());
        if (req.getDisplayOrder() != null) series.setDisplayOrder(req.getDisplayOrder());
        applyWorkNote(series, req);
        if (req.getPinned() != null) series.setPinned(req.getPinned());
        Series saved = seriesRepository.save(series);
        if (Boolean.TRUE.equals(req.getPinned())) {
            seriesRepository.unpinOthers(saved.getMemberId(), saved.getId());
        }
        List<SeriesPhoto> sps = seriesPhotoRepository.findBySeriesIdOrderByDisplayOrderAsc(id);
        List<PhotoResponse> photos = sps.stream()
                .map(sp -> photoRepository.findById(sp.getPhotoId()))
                .filter(Optional::isPresent)
                .map(opt -> PhotoResponse.fromEntity(opt.get()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(SeriesResponse.fromEntity(saved, photos));
    }

    /** 시리즈 삭제 */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSeries(@PathVariable Long id, Authentication auth) {
        Long requesterId = SecurityUtil.getCurrentMemberId();
        Series series = seriesRepository.findById(id).orElse(null);
        if (series == null) return ResponseEntity.notFound().build();
        if (!series.getMemberId().equals(requesterId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        seriesPhotoRepository.deleteBySeriesId(id);
        seriesRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /** 시리즈에 사진 추가 */
    @PostMapping("/{id}/photos")
    public ResponseEntity<?> addPhoto(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        Long requesterId = SecurityUtil.getCurrentMemberId();
        Long photoId = body.get("photoId") instanceof Number
                ? ((Number) body.get("photoId")).longValue() : null;
        if (photoId == null) return ResponseEntity.badRequest().build();
        Series series = seriesRepository.findById(id).orElse(null);
        if (series == null) return ResponseEntity.notFound().build();
        if (!series.getMemberId().equals(requesterId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        if (!photoRepository.existsById(photoId)) return ResponseEntity.notFound().build();
        if (seriesPhotoRepository.existsBySeriesIdAndPhotoId(id, photoId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "이미 추가된 사진입니다."));
        }
        int nextOrder = seriesPhotoRepository.countBySeriesId(id);
        Integer displayOrder = body.get("displayOrder") instanceof Number
                ? ((Number) body.get("displayOrder")).intValue() : nextOrder;
        SeriesPhoto sp = SeriesPhoto.builder()
                .seriesId(id)
                .photoId(photoId)
                .displayOrder(displayOrder)
                .build();
        seriesPhotoRepository.save(sp);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /** 시리즈에서 사진 제거 */
    @DeleteMapping("/{id}/photos/{photoId}")
    public ResponseEntity<Void> removePhoto(
            @PathVariable Long id, @PathVariable Long photoId, Authentication auth) {
        Long requesterId = SecurityUtil.getCurrentMemberId();
        Series series = seriesRepository.findById(id).orElse(null);
        if (series == null) return ResponseEntity.notFound().build();
        if (!series.getMemberId().equals(requesterId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        seriesPhotoRepository.deleteBySeriesIdAndPhotoId(id, photoId);
        return ResponseEntity.noContent().build();
    }
}
