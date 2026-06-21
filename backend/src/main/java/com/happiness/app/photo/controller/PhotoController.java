package com.happiness.app.photo.controller;

import com.happiness.app.common.util.ImageProcessingUtil;
import com.happiness.app.photo.dto.PhotoRequest;
import com.happiness.app.photo.dto.PhotoResponse;
import com.happiness.app.photo.dto.PhotoTagDto;
import com.happiness.app.photo.entity.Photo;
import com.happiness.app.photo.entity.PhotoLike;
import com.happiness.app.photo.entity.PhotoSave;
import com.happiness.app.photo.entity.PhotoShare;
import com.happiness.app.photo.entity.PhotoTag;
import com.happiness.app.photo.repository.PhotoLikeRepository;
import com.happiness.app.photo.repository.PhotoRepository;
import com.happiness.app.photo.repository.PhotoSaveRepository;
import com.happiness.app.photo.repository.PhotoShareRepository;
import com.happiness.app.photo.repository.PhotoTagRepository;
import com.happiness.app.photo.service.AutoTagService;
import com.happiness.app.security.auth.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/photos")
@RequiredArgsConstructor
public class PhotoController {

    private final PhotoRepository photoRepository;
    private final PhotoTagRepository photoTagRepository;
    private final PhotoLikeRepository photoLikeRepository;
    private final PhotoShareRepository photoShareRepository;
    private final PhotoSaveRepository photoSaveRepository;
    private final ImageProcessingUtil imageProcessingUtil;
    private final AutoTagService autoTagService;

    // ── 사진 조회 ─────────────────────────────────────────────────────

    private static final Set<String> SORT_WHITELIST = Set.of(
            "createdAt", "likesCount", "savesCount", "sharesCount", "displayOrder", "title"
    );

    /**
     * GET /api/photos?keyword=&colorMood=&memberId=&imageRatio=&sortBy=createdAt&order=desc&tags=이름1,이름2
     * 모든 파라미터 선택적 — 없으면 전체 반환
     */
    @GetMapping
    public ResponseEntity<?> getAllPhotos(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String colorMood,
            @RequestParam(required = false) Long memberId,
            @RequestParam(required = false) String imageRatio,
            @RequestParam(required = false) String genre,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String order,
            @RequestParam(required = false) String tags
    ) {
        String field = SORT_WHITELIST.contains(sortBy) ? sortBy : "createdAt";
        Sort.Direction direction = "asc".equalsIgnoreCase(order) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Sort sort = Sort.by(Sort.Order.by(field).with(direction).nullsLast());

        // tags 파라미터: 콤마 구분 이름 목록 → 해당 태그가 있는 photoId 목록 선 추출
        Set<Long> taggedPhotoIds = null;
        if (tags != null && !tags.isBlank()) {
            List<String> tagNames = Arrays.stream(tags.split(","))
                    .map(String::trim).map(String::toLowerCase)
                    .filter(s -> !s.isEmpty()).collect(Collectors.toList());
            if (!tagNames.isEmpty()) {
                taggedPhotoIds = new HashSet<>(photoTagRepository.findPhotoIdsByMemberNamesIn(tagNames));
            }
        }

        List<PhotoResponse> photos;
        boolean hasKeyword = keyword != null && !keyword.isBlank();

        if (hasKeyword) {
            try {
                String cm = colorMood != null ? colorMood : "";
                String ir = imageRatio != null ? imageRatio : "";
                String gn = genre != null ? genre : "";
                photos = photoRepository.searchFuzzy(keyword, cm, memberId, ir, gn)
                        .stream().map(PhotoResponse::fromEntity).collect(Collectors.toList());
            } catch (DataAccessException e) {
                photos = photoRepository.search(keyword, colorMood, memberId, imageRatio, genre, sort)
                        .stream().map(PhotoResponse::fromEntity).collect(Collectors.toList());
            }
        } else {
            photos = photoRepository.search(null, colorMood, memberId, imageRatio, genre, sort)
                    .stream().map(PhotoResponse::fromEntity).collect(Collectors.toList());
        }

        // tags 필터 적용
        if (taggedPhotoIds != null) {
            final Set<Long> ids = taggedPhotoIds;
            photos = photos.stream().filter(p -> ids.contains(p.getId())).collect(Collectors.toList());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("data", photos);
        return ResponseEntity.ok(result);
    }

    /** GET /api/photos/suggestions?q=검색어 — 자동완성용 제목 목록 (최대 5건) */
    @GetMapping("/suggestions")
    public ResponseEntity<?> getSuggestions(
            @RequestParam(required = false, defaultValue = "") String q
    ) {
        if (q.isBlank()) {
            return ResponseEntity.ok(Map.of("status", "success", "data", List.of()));
        }
        List<String> suggestions = photoRepository.findTitleSuggestions(q, PageRequest.of(0, 5));
        return ResponseEntity.ok(Map.of("status", "success", "data", suggestions));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPhoto(@PathVariable Long id) {
        return photoRepository.findById(id)
                .map(photo -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("status", "success");
                    result.put("data", PhotoResponse.fromEntity(photo));
                    return ResponseEntity.ok(result);
                })
                .orElseGet(() -> errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다."));
    }

    // ── 사진 생성 ─────────────────────────────────────────────────────

    @PostMapping("/upload")
    public ResponseEntity<?> uploadPhoto(
            @RequestParam Long memberId,
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String imageRatio,
            @RequestParam(required = false, defaultValue = "6") Integer gridColSpan,
            @RequestParam(required = false) String colorMood,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String subGenres,
            @RequestParam MultipartFile file) {
        try {
            ImageProcessingUtil.ImageUploadResult upload = imageProcessingUtil.uploadAndResizeImage(file, imageRatio);

            int colSpan = (gridColSpan >= 1 && gridColSpan <= 12) ? gridColSpan : 6;
            String mood = (colorMood != null && !colorMood.isBlank()) ? colorMood : upload.colorMood();

            Photo photo = Photo.builder()
                    .memberId(memberId)
                    .title(title)
                    .imageUrl(upload.imageUrl())
                    .thumbnailUrl(upload.thumbnailUrl())
                    .description(description)
                    .imageRatio(imageRatio != null ? imageRatio : "1:1")
                    .gridColSpan(colSpan)
                    .dominantColor(upload.dominantColor())
                    .colorMood(mood)
                    .colorPalette(upload.colorPalette())
                    .genre(genre)
                    .subGenres(subGenres)
                    .likesCount(0)
                    .savesCount(0)
                    .sharesCount(0)
                    .build();

            Photo saved = photoRepository.save(photo);
            Map<String, Object> result = new HashMap<>();
            result.put("status", "success");
            result.put("message", "사진이 업로드되었습니다.");
            result.put("data", PhotoResponse.fromEntity(saved));
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IOException e) {
            return errorResponse(HttpStatus.BAD_REQUEST, "파일 처리 중 오류: " + e.getMessage());
        } catch (Exception e) {
            return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "사진 업로드 중 오류: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> createPhoto(@RequestBody PhotoRequest request) {
        if (request.getMemberId() == null) {
            return errorResponse(HttpStatus.BAD_REQUEST, "memberId는 필수입니다.");
        }
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            return errorResponse(HttpStatus.BAD_REQUEST, "사진 제목은 필수입니다.");
        }
        if (request.getImageUrl() == null || request.getImageUrl().isBlank()) {
            return errorResponse(HttpStatus.BAD_REQUEST, "이미지 URL은 필수입니다.");
        }

        int colSpan = (request.getGridColSpan() != null &&
                       request.getGridColSpan() >= 1 &&
                       request.getGridColSpan() <= 12)
                ? request.getGridColSpan() : 6;

        Photo photo = Photo.builder()
                .memberId(request.getMemberId())
                .title(request.getTitle())
                .imageUrl(request.getImageUrl())
                .description(request.getDescription())
                .imageRatio(request.getImageRatio() != null ? request.getImageRatio() : "1:1")
                .gridColSpan(colSpan)
                .colorMood(request.getColorMood())
                .genre(request.getGenre())
                .subGenres(request.getSubGenres())
                .cameraModel(request.getCameraModel())
                .lensModel(request.getLensModel())
                .aperture(request.getAperture())
                .shutterSpeed(request.getShutterSpeed())
                .iso(request.getIso())
                .focalLength(request.getFocalLength())
                .likesCount(0)
                .savesCount(0)
                .sharesCount(0)
                .build();
        Photo saved = photoRepository.save(photo);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("message", "사진이 등록되었습니다.");
        result.put("data", PhotoResponse.fromEntity(saved));
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    // ── 사진 수정 ─────────────────────────────────────────────────────

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePhoto(@PathVariable Long id, @RequestBody PhotoRequest request) {
        return photoRepository.findById(id)
                .map(photo -> {
                    if (request.getTitle() != null && !request.getTitle().isBlank()) {
                        photo.setTitle(request.getTitle());
                    }
                    if (request.getDescription() != null) {
                        photo.setDescription(request.getDescription());
                    }
                    if (request.getImageRatio() != null) {
                        photo.setImageRatio(request.getImageRatio());
                    }
                    if (request.getGridColSpan() != null &&
                        request.getGridColSpan() >= 1 &&
                        request.getGridColSpan() <= 12) {
                        photo.setGridColSpan(request.getGridColSpan());
                    }
                    if (request.getColorMood() != null && !request.getColorMood().isBlank()) {
                        photo.setColorMood(request.getColorMood());
                    }
                    if (request.getGenre() != null) {
                        photo.setGenre(request.getGenre().isBlank() ? null : request.getGenre());
                    }
                    if (request.getSubGenres() != null) {
                        photo.setSubGenres(request.getSubGenres().isBlank() ? null : request.getSubGenres());
                    }
                    if (request.getCameraModel() != null) photo.setCameraModel(request.getCameraModel());
                    if (request.getLensModel()   != null) photo.setLensModel(request.getLensModel());
                    if (request.getAperture()    != null) photo.setAperture(request.getAperture());
                    if (request.getShutterSpeed()!= null) photo.setShutterSpeed(request.getShutterSpeed());
                    if (request.getIso()         != null) photo.setIso(request.getIso());
                    if (request.getFocalLength() != null) photo.setFocalLength(request.getFocalLength());
                    Photo updated = photoRepository.save(photo);
                    Map<String, Object> result = new HashMap<>();
                    result.put("status", "success");
                    result.put("message", "사진이 수정되었습니다.");
                    result.put("data", PhotoResponse.fromEntity(updated));
                    return ResponseEntity.ok(result);
                })
                .orElseGet(() -> errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다."));
    }

    // ── 사진 삭제 ─────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePhoto(@PathVariable Long id) {
        return photoRepository.findById(id)
                .map(photo -> {
                    // 연관 레코드 먼저 삭제 (cascade)
                    photoLikeRepository.deleteByPhotoId(id);
                    photoSaveRepository.deleteByPhotoId(id);
                    photoShareRepository.deleteByPhotoId(id);
                    photoTagRepository.deleteByPhotoId(id);

                    imageProcessingUtil.deleteImage(photo.getImageUrl());
                    photoRepository.delete(photo);

                    Map<String, Object> result = new HashMap<>();
                    result.put("status", "success");
                    result.put("message", "사진이 삭제되었습니다.");
                    return ResponseEntity.ok(result);
                })
                .orElseGet(() -> errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다."));
    }

    // ── 태그 기능 ─────────────────────────────────────────────────────

    @PostMapping("/{photoId}/tags")
    public ResponseEntity<?> addTag(
            @PathVariable Long photoId,
            @RequestParam Long memberId,
            @RequestParam String memberName,
            @RequestParam(required = false) Double positionX,
            @RequestParam(required = false) Double positionY) {

        if (!photoRepository.existsById(photoId)) {
            return errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다.");
        }
        if (photoTagRepository.existsByPhotoIdAndMemberId(photoId, memberId)) {
            return errorResponse(HttpStatus.BAD_REQUEST, "이미 태그된 사용자입니다.");
        }

        PhotoTag tag = PhotoTag.builder()
                .photoId(photoId)
                .memberId(memberId)
                .memberName(memberName)
                .positionX(positionX)
                .positionY(positionY)
                .build();
        photoTagRepository.save(tag);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("message", "사용자가 태그되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/{photoId}/tags")
    public ResponseEntity<?> getTags(@PathVariable Long photoId) {
        List<PhotoTagDto> tags = photoTagRepository.findByPhotoId(photoId).stream()
                .map(tag -> PhotoTagDto.builder()
                        .id(tag.getId())
                        .memberId(tag.getMemberId())
                        .memberName(tag.getMemberName())
                        .positionX(tag.getPositionX())
                        .positionY(tag.getPositionY())
                        .createdAt(tag.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("data", tags);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{photoId}/tags/{tagId}")
    public ResponseEntity<?> removeTag(@PathVariable Long photoId, @PathVariable Long tagId) {
        return photoTagRepository.findById(tagId)
                .map(tag -> {
                    photoTagRepository.delete(tag);
                    Map<String, Object> result = new HashMap<>();
                    result.put("status", "success");
                    result.put("message", "태그가 제거되었습니다.");
                    return ResponseEntity.ok(result);
                })
                .orElseGet(() -> errorResponse(HttpStatus.NOT_FOUND, "태그를 찾을 수 없습니다."));
    }

    // ── 좋아요 기능 ───────────────────────────────────────────────────

    @PostMapping("/{photoId}/likes")
    public ResponseEntity<?> likePhoto(@PathVariable Long photoId, @RequestParam Long memberId) {
        Photo photo = photoRepository.findById(photoId).orElse(null);
        if (photo == null) return errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다.");
        if (photoLikeRepository.existsByPhotoIdAndMemberId(photoId, memberId)) {
            return errorResponse(HttpStatus.BAD_REQUEST, "이미 좋아요한 사진입니다.");
        }

        photoLikeRepository.save(PhotoLike.builder().photoId(photoId).memberId(memberId).build());
        photo.setLikesCount(photo.getLikesCount() + 1);
        photoRepository.save(photo);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("message", "좋아요가 추가되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @DeleteMapping("/{photoId}/likes")
    public ResponseEntity<?> unlikePhoto(@PathVariable Long photoId, @RequestParam Long memberId) {
        Photo photo = photoRepository.findById(photoId).orElse(null);
        if (photo == null) return errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다.");
        if (!photoLikeRepository.existsByPhotoIdAndMemberId(photoId, memberId)) {
            return errorResponse(HttpStatus.BAD_REQUEST, "좋아요 기록이 없습니다.");
        }

        photoLikeRepository.deleteByPhotoIdAndMemberId(photoId, memberId);
        photo.setLikesCount(Math.max(0, photo.getLikesCount() - 1));
        photoRepository.save(photo);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("message", "좋아요가 취소되었습니다.");
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{photoId}/likes")
    public ResponseEntity<?> getLikes(@PathVariable Long photoId) {
        List<PhotoLike> likes = photoLikeRepository.findByPhotoId(photoId);
        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("count", likes.size());
        result.put("data", likes);
        return ResponseEntity.ok(result);
    }

    // ── 공유 기능 ─────────────────────────────────────────────────────

    @PostMapping("/{photoId}/shares")
    public ResponseEntity<?> sharePhoto(
            @PathVariable Long photoId,
            @RequestParam Long memberId,
            @RequestParam String platform) {

        Photo photo = photoRepository.findById(photoId).orElse(null);
        if (photo == null) return errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다.");

        photoShareRepository.save(PhotoShare.builder().photoId(photoId).memberId(memberId).platform(platform).build());
        photo.setSharesCount(photo.getSharesCount() + 1);
        photoRepository.save(photo);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("message", "사진이 공유되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/{photoId}/shares")
    public ResponseEntity<?> getShares(@PathVariable Long photoId) {
        List<PhotoShare> shares = photoShareRepository.findByPhotoId(photoId);
        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("count", shares.size());
        result.put("data", shares);
        return ResponseEntity.ok(result);
    }

    // ── 저장(북마크) 기능 ──────────────────────────────────────────────

    @PostMapping("/{photoId}/saves")
    public ResponseEntity<?> savePhoto(@PathVariable Long photoId, @RequestParam Long memberId) {
        Photo photo = photoRepository.findById(photoId).orElse(null);
        if (photo == null) return errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다.");
        if (photoSaveRepository.existsByPhotoIdAndMemberId(photoId, memberId)) {
            return errorResponse(HttpStatus.BAD_REQUEST, "이미 저장한 사진입니다.");
        }

        photoSaveRepository.save(PhotoSave.builder().photoId(photoId).memberId(memberId).build());
        photo.setSavesCount(photo.getSavesCount() + 1);
        photoRepository.save(photo);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("message", "사진이 저장되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @DeleteMapping("/{photoId}/saves")
    public ResponseEntity<?> unsavePhoto(@PathVariable Long photoId, @RequestParam Long memberId) {
        Photo photo = photoRepository.findById(photoId).orElse(null);
        if (photo == null) return errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다.");
        if (!photoSaveRepository.existsByPhotoIdAndMemberId(photoId, memberId)) {
            return errorResponse(HttpStatus.BAD_REQUEST, "저장 기록이 없습니다.");
        }

        photoSaveRepository.deleteByPhotoIdAndMemberId(photoId, memberId);
        photo.setSavesCount(Math.max(0, photo.getSavesCount() - 1));
        photoRepository.save(photo);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("message", "저장이 취소되었습니다.");
        return ResponseEntity.ok(result);
    }

    @GetMapping("/saves/{memberId}")
    public ResponseEntity<?> getSavedPhotos(@PathVariable Long memberId) {
        List<PhotoResponse> savedPhotos = photoSaveRepository.findByMemberId(memberId).stream()
                .map(save -> photoRepository.findById(save.getPhotoId()).orElse(null))
                .filter(Objects::nonNull)
                .map(PhotoResponse::fromEntity)
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("data", savedPhotos);
        return ResponseEntity.ok(result);
    }

    // ── 순서 변경 ─────────────────────────────────────────────────────

    /**
     * PUT /api/photos/reorder
     * Body: [{"id": 1, "displayOrder": 0}, {"id": 2, "displayOrder": 1}, ...]
     * IDOR guard: only WM/SA admins may reorder others' photos.
     */
    @PutMapping("/reorder")
    public ResponseEntity<?> reorderPhotos(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody List<Map<String, Object>> orders) {

        if (userDetails == null) {
            return errorResponse(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        boolean isAdmin = "WM".equals(userDetails.getRole()) || "SA".equals(userDetails.getRole());

        for (Map<String, Object> item : orders) {
            try {
                Long id = ((Number) item.get("id")).longValue();
                Integer order = ((Number) item.get("displayOrder")).intValue();
                photoRepository.findById(id).ifPresent(photo -> {
                    if (isAdmin || userDetails.getId().equals(photo.getMemberId())) {
                        photo.setDisplayOrder(order);
                        photoRepository.save(photo);
                    }
                });
            } catch (Exception ignored) {}
        }
        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("message", "순서가 저장되었습니다.");
        return ResponseEntity.ok(result);
    }

    // ── 장르 통계 ──────────────────────────────────────────────────────

    /** GET /api/photos/genres/stats — 전체 장르별 사진 수 통계 */
    @GetMapping("/genres/stats")
    public ResponseEntity<?> getGenreStats(
            @RequestParam(required = false) Long memberId) {
        List<Object[]> rows = memberId != null
                ? photoRepository.countByGenreForMember(memberId)
                : photoRepository.countByGenre();
        List<Map<String, Object>> stats = rows.stream().map(row -> {
            Map<String, Object> m = new HashMap<>();
            m.put("genre", row[0]);
            m.put("count", row[1]);
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("status", "success", "data", stats));
    }

    // ── AI 자동 태그 추천 ──────────────────────────────────────────────

    /** POST /api/photos/{id}/auto-tags — 제목·설명·색상무드 기반 태그 자동 추천 (최대 10개) */
    @PostMapping("/{id}/auto-tags")
    public ResponseEntity<?> autoTagSuggestions(@PathVariable Long id) {
        return photoRepository.findById(id)
                .map(photo -> {
                    List<String> suggestions = autoTagService.suggest(
                            photo.getTitle(), photo.getDescription(), photo.getColorMood());
                    Map<String, Object> result = new HashMap<>();
                    result.put("status", "success");
                    result.put("data", suggestions);
                    return ResponseEntity.ok(result);
                })
                .orElseGet(() -> errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다."));
    }

    // ── 유틸리티 ──────────────────────────────────────────────────────

    private ResponseEntity<Map<String, Object>> errorResponse(HttpStatus status, String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("status", "error");
        error.put("message", message);
        return ResponseEntity.status(status).body(error);
    }
}
