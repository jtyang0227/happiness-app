package com.happiness.app.series.controller;

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

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/series")
@RequiredArgsConstructor
public class SeriesController {

    private final SeriesRepository seriesRepository;
    private final SeriesPhotoRepository seriesPhotoRepository;
    private final PhotoRepository photoRepository;

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
            return SeriesResponse.summary(s, sps.size(), coverUrl);
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
        Series saved = seriesRepository.save(series);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(SeriesResponse.fromEntity(saved, Collections.emptyList()));
    }

    /** 시리즈 수정 */
    @PutMapping("/{id}")
    public ResponseEntity<SeriesResponse> updateSeries(
            @PathVariable Long id, @RequestBody SeriesRequest req, Authentication auth) {
        Long requesterId = Long.parseLong(auth.getName());
        Series series = seriesRepository.findById(id).orElse(null);
        if (series == null) return ResponseEntity.notFound().build();
        if (!series.getMemberId().equals(requesterId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        if (req.getTitle() != null && !req.getTitle().isBlank()) series.setTitle(req.getTitle().trim());
        if (req.getDescription() != null) series.setDescription(req.getDescription());
        if (req.getCoverImageUrl() != null) series.setCoverImageUrl(req.getCoverImageUrl());
        if (req.getDisplayOrder() != null) series.setDisplayOrder(req.getDisplayOrder());
        Series saved = seriesRepository.save(series);
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
        Long requesterId = Long.parseLong(auth.getName());
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
        Long requesterId = Long.parseLong(auth.getName());
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
        Long requesterId = Long.parseLong(auth.getName());
        Series series = seriesRepository.findById(id).orElse(null);
        if (series == null) return ResponseEntity.notFound().build();
        if (!series.getMemberId().equals(requesterId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        seriesPhotoRepository.deleteBySeriesIdAndPhotoId(id, photoId);
        return ResponseEntity.noContent().build();
    }
}
