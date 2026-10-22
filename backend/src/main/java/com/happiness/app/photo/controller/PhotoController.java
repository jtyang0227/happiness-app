package com.happiness.app.photo.controller;

import com.happiness.app.analytics.repository.AnalyticsEventRepository;
import com.happiness.app.moodboard.MoodboardItemRepository;
import com.happiness.app.common.SecurityUtil;
import com.happiness.app.common.util.ImageProcessingUtil;
import com.happiness.app.common.util.ImageVariantUtil;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
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
import com.happiness.app.storage.SupabaseStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
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
    private final AnalyticsEventRepository analyticsEventRepository;
    private final MoodboardItemRepository moodboardItemRepository;
    private final PhotoTagRepository photoTagRepository;
    private final PhotoLikeRepository photoLikeRepository;
    private final PhotoShareRepository photoShareRepository;
    private final PhotoSaveRepository photoSaveRepository;
    private final ImageProcessingUtil imageProcessingUtil;
    private final ImageVariantUtil imageVariantUtil;
    private final SupabaseStorageService supabaseStorageService;
    private final AutoTagService autoTagService;
    private final MemberRepository memberRepository;

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
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) Integer page,
            @RequestParam(defaultValue = "30") int size
    ) {
        // "views"(조회 순)는 컬럼이 아니라 PHOTO_VIEW 이벤트 집계 — 페이지 경로는 서브쿼리 정렬, 그 외는 메모리 정렬
        boolean byViews = "views".equals(sortBy);
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
        // page 파라미터를 보낸 요청만 페이지 단위로 자른다. 미지정 시엔 기존처럼 전체 목록 —
        // 어드민/프로필/포트폴리오 등 전체 목록이 필요한 소비처가 조용히 잘리지 않도록.
        boolean paged = page != null;
        int pageNo = paged ? Math.max(page, 0) : 0;
        int pageSize = Math.min(Math.max(size, 1), 100);
        Boolean hasNext = null;

        if (paged && !hasKeyword && taggedPhotoIds == null) {
            Slice<Photo> slice = byViews
                    ? photoRepository.searchPageByViews(colorMood, memberId, imageRatio, genre, PageRequest.of(pageNo, pageSize))
                    : photoRepository.searchPage(
                            null, colorMood, memberId, imageRatio, genre, PageRequest.of(pageNo, pageSize, sort));
            photos = slice.getContent().stream().map(PhotoResponse::fromEntity).collect(Collectors.toList());
            hasNext = slice.hasNext();
        } else {
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

            if (byViews && !photos.isEmpty()) {
                Map<Long, Long> views = new HashMap<>();
                for (Object[] r : analyticsEventRepository.countPhotoViews(
                        photos.stream().map(PhotoResponse::getId).collect(Collectors.toList()))) {
                    views.put(((Number) r[0]).longValue(), ((Number) r[1]).longValue());
                }
                // 안정 정렬 — 조회수가 같으면 기존(최신순) 순서 유지
                photos = photos.stream()
                        .sorted(Comparator.comparingLong((PhotoResponse p) -> views.getOrDefault(p.getId(), 0L)).reversed())
                        .collect(Collectors.toList());
            }

            // 키워드·태그 검색은 결과가 이미 필터링된 목록이라 메모리에서 페이지를 자른다
            if (paged) {
                int from = Math.min(pageNo * pageSize, photos.size());
                int to = Math.min(from + pageSize, photos.size());
                hasNext = to < photos.size();
                photos = new ArrayList<>(photos.subList(from, to));
            }
        }

        attachMemberInfo(photos);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("data", photos);
        if (paged) {
            result.put("page", pageNo);
            result.put("size", pageSize);
            result.put("hasNext", hasNext);
        }
        return ResponseEntity.ok(result);
    }

    /** 목록에 등장하는 memberId를 배치 조회해 작성자 이름/아바타를 채운다 (N+1 방지) */
    private void attachMemberInfo(List<PhotoResponse> photos) {
        Set<Long> memberIds = photos.stream().map(PhotoResponse::getMemberId).collect(Collectors.toSet());
        if (memberIds.isEmpty()) return;
        Map<Long, Member> memberMap = memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::getId, m -> m));
        PhotoResponse.attachMembers(photos, memberMap);
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
                    PhotoResponse response = PhotoResponse.fromEntity(photo);
                    memberRepository.findById(photo.getMemberId())
                            .ifPresent(m -> PhotoResponse.attachMember(response, m));
                    Map<String, Object> result = new HashMap<>();
                    result.put("status", "success");
                    result.put("data", response);
                    return ResponseEntity.ok(result);
                })
                .orElseGet(() -> errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다."));
    }

    /**
     * 비슷한 사진 (PLANNING_inside-menus-upgrade.md P0-A, Cosmos "비슷한 요소" 재해석, 공개).
     * 이미지 임베딩이 아니라 메타데이터 점수다: 장르 3 + 색 분위기 2 + 서브장르 겹침 1씩 + 대표색 거리(최대 2) + 같은 비율 0.5.
     * 후보는 같은 장르 또는 같은 색 분위기 최근 300장. 같은 작가는 최대 4장(다양성), 점수 0은 제외, 동점은 최신순.
     */
    @GetMapping("/{id}/similar")
    public ResponseEntity<?> getSimilarPhotos(@PathVariable Long id, @RequestParam(defaultValue = "12") int size) {
        Photo base = photoRepository.findById(id).orElse(null);
        if (base == null) return errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다.");
        int limit = Math.min(Math.max(size, 1), 24);
        PageRequest pool = PageRequest.of(0, SIMILAR_POOL);
        List<Photo> candidates = (base.getGenre() == null && base.getColorMood() == null)
                ? photoRepository.findRecentExcept(id, pool)
                : photoRepository.findSimilarCandidates(id, base.getGenre(), base.getColorMood(), pool);

        Set<String> baseSubs = splitGenres(base.getSubGenres());
        int[] baseRgb = parseHex(base.getDominantColor());
        record Scored(Photo photo, double score) {}
        List<Scored> ranked = candidates.stream()
                .map(p -> {
                    double s = 0;
                    if (base.getGenre() != null && base.getGenre().equals(p.getGenre())) s += 3;
                    if (base.getColorMood() != null && base.getColorMood().equals(p.getColorMood())) s += 2;
                    for (String sub : splitGenres(p.getSubGenres())) if (baseSubs.contains(sub)) s += 1;
                    int[] rgb = parseHex(p.getDominantColor());
                    if (baseRgb != null && rgb != null) {
                        double dist = Math.sqrt(Math.pow(baseRgb[0] - rgb[0], 2) + Math.pow(baseRgb[1] - rgb[1], 2)
                                + Math.pow(baseRgb[2] - rgb[2], 2));
                        s += 2 * Math.max(0, 1 - dist / 220.0);   // 220 ≈ 확연히 다른 색으로 느껴지는 거리
                    }
                    if (s > 0 && base.getImageRatio() != null && base.getImageRatio().equals(p.getImageRatio())) s += 0.5;
                    return new Scored(p, s);
                })
                .filter(sc -> sc.score() > 0)
                .sorted(Comparator.comparingDouble(Scored::score).reversed())   // 안정 정렬 — 동점은 후보 순서(최신순) 유지
                .collect(Collectors.toList());

        Map<Long, Integer> perAuthor = new HashMap<>();
        List<PhotoResponse> result = new ArrayList<>();
        for (Scored sc : ranked) {
            if (result.size() >= limit) break;
            int n = perAuthor.merge(sc.photo().getMemberId(), 1, Integer::sum);
            if (n > SIMILAR_PER_AUTHOR) continue;
            result.add(PhotoResponse.fromEntity(sc.photo()));
        }
        attachMemberInfo(result);
        return ResponseEntity.ok(Map.of("status", "success", "data", result));
    }

    private static final int SIMILAR_POOL = 300;
    private static final int SIMILAR_PER_AUTHOR = 4;

    /** subGenres는 '["FASHION","LIFESTYLE"]' 같은 JSON 배열 문자열이다(콤마 구분도 허용) */
    private static Set<String> splitGenres(String raw) {
        if (raw == null || raw.isBlank()) return Set.of();
        return Arrays.stream(raw.replaceAll("[\\[\\]\"\\s]", "").split(","))
                .filter(s -> !s.isEmpty()).collect(Collectors.toSet());
    }

    private static int[] parseHex(String hex) {
        if (hex == null || !hex.matches("#?[0-9a-fA-F]{6}")) return null;
        String h = hex.startsWith("#") ? hex.substring(1) : hex;
        return new int[]{Integer.parseInt(h.substring(0, 2), 16), Integer.parseInt(h.substring(2, 4), 16),
                Integer.parseInt(h.substring(4, 6), 16)};
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
        if (!isSelfOrAdmin(memberId)) {
            return errorResponse(HttpStatus.FORBIDDEN, "본인 명의로만 사진을 등록할 수 있습니다.");
        }
        try {
            // 1024/512/256/128 4단계 변형 생성 후 Supabase Storage에 업로드
            // (DB에는 1024=imageUrl, 256=thumbnailUrl만 저장 — 36_MULTI_RESOLUTION_IMAGES.md 참조)
            ImageVariantUtil.VariantPrep prep = imageVariantUtil.prepare(file);
            String uid = UUID.randomUUID().toString();
            Map<Integer, String> variantUrls = new HashMap<>();
            for (int size : ImageVariantUtil.SIZES) {
                String objectKey = ImageVariantUtil.objectKey("photos", uid, size, prep.ext());
                variantUrls.put(size, supabaseStorageService.uploadBytes(
                        prep.variants().get(size), objectKey, prep.contentType()));
            }

            int colSpan = (gridColSpan >= 1 && gridColSpan <= 12) ? gridColSpan : 6;
            String mood = (colorMood != null && !colorMood.isBlank()) ? colorMood : prep.colorMood();

            Photo photo = Photo.builder()
                    .memberId(memberId)
                    .title(title)
                    .imageUrl(variantUrls.get(1024))
                    .thumbnailUrl(variantUrls.get(256))
                    .description(description)
                    .imageRatio(imageRatio != null ? imageRatio : "1:1")
                    .gridColSpan(colSpan)
                    .dominantColor(prep.dominantColor())
                    .colorMood(mood)
                    .colorPalette(prep.colorPalette())
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
        if (!isSelfOrAdmin(request.getMemberId())) {
            return errorResponse(HttpStatus.FORBIDDEN, "본인 명의로만 사진을 등록할 수 있습니다.");
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
                .genre(request.getGenre())
                .subGenres(request.getSubGenres())
                .panType(request.getPanType() != null ? request.getPanType() : "EDITORIAL")
                .magazineCaption(request.getMagazineCaption())
                .imageRight(request.getImageRight() != null ? request.getImageRight() : false)
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
                    if (!isSelfOrAdmin(photo.getMemberId())) {
                        return errorResponse(HttpStatus.FORBIDDEN, "본인 사진만 수정할 수 있습니다.");
                    }
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
                    if (request.getPanType() != null && !request.getPanType().isBlank()) {
                        photo.setPanType(request.getPanType());
                    }
                    if (request.getMagazineCaption() != null) {
                        photo.setMagazineCaption(request.getMagazineCaption());
                    }
                    if (request.getImageRight() != null) {
                        photo.setImageRight(request.getImageRight());
                    }
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
                    if (!isSelfOrAdmin(photo.getMemberId())) {
                        return errorResponse(HttpStatus.FORBIDDEN, "본인 사진만 삭제할 수 있습니다.");
                    }
                    // 연관 레코드 먼저 삭제 (cascade)
                    photoLikeRepository.deleteByPhotoId(id);
                    photoSaveRepository.deleteByPhotoId(id);
                    moodboardItemRepository.deleteByPhotoId(id);
                    photoShareRepository.deleteByPhotoId(id);
                    photoTagRepository.deleteByPhotoId(id);

                    // 신규 파이프라인(Supabase 4단계 변형) 삭제 시도, 레거시 로컬 파일도 안전하게 폴백 정리
                    supabaseStorageService.deletePhotoVariants(photo.getImageUrl());
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
            @RequestParam(required = false) String memberName,   // 무시 — 서버가 회원 이름을 채운다
            @RequestParam(required = false) Double positionX,
            @RequestParam(required = false) Double positionY) {

        Photo tagged = photoRepository.findById(photoId).orElse(null);
        if (tagged == null) {
            return errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다.");
        }
        // 태그는 사진 주인(또는 관리자)만 — 예전엔 누구나 남의 사진에 아무 이름으로 태그를 달 수 있었다
        if (!isSelfOrAdmin(tagged.getMemberId())) {
            return errorResponse(HttpStatus.FORBIDDEN, "내 사진에만 태그할 수 있습니다.");
        }
        Member taggedMember = memberRepository.findById(memberId).orElse(null);
        if (taggedMember == null) {
            return errorResponse(HttpStatus.NOT_FOUND, "태그할 회원을 찾을 수 없습니다.");
        }
        memberName = taggedMember.getName();   // 요청의 이름은 믿지 않는다
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
        Photo photo = photoRepository.findById(photoId).orElse(null);
        return photoTagRepository.findById(tagId)
                .filter(tag -> photo != null && tag.getPhotoId().equals(photoId))
                .map(tag -> {
                    // 사진 주인·태그된 본인·관리자만 — 예전엔 로그인한 누구나 아무 태그를 지울 수 있었다
                    Long me = SecurityUtil.getCurrentMemberId();
                    if (!me.equals(photo.getMemberId()) && !me.equals(tag.getMemberId()) && !SecurityUtil.isAdmin()) {
                        return errorResponse(HttpStatus.FORBIDDEN, "이 태그를 지울 권한이 없습니다.");
                    }
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
        // 요청 파라미터의 memberId를 그대로 믿지 않는다 — 남의 이름으로 좋아요/저장 방지
        if (!isSelfOrAdmin(memberId)) return errorResponse(HttpStatus.FORBIDDEN, "본인 계정으로만 할 수 있습니다.");
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
        // 요청 파라미터의 memberId를 그대로 믿지 않는다 — 남의 이름으로 좋아요/저장 방지
        if (!isSelfOrAdmin(memberId)) return errorResponse(HttpStatus.FORBIDDEN, "본인 계정으로만 할 수 있습니다.");
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

        if (!isSelfOrAdmin(memberId)) return errorResponse(HttpStatus.FORBIDDEN, "본인 계정으로만 할 수 있습니다.");
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
        // 요청 파라미터의 memberId를 그대로 믿지 않는다 — 남의 이름으로 좋아요/저장 방지
        if (!isSelfOrAdmin(memberId)) return errorResponse(HttpStatus.FORBIDDEN, "본인 계정으로만 할 수 있습니다.");
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
        // 요청 파라미터의 memberId를 그대로 믿지 않는다 — 남의 이름으로 좋아요/저장 방지
        if (!isSelfOrAdmin(memberId)) return errorResponse(HttpStatus.FORBIDDEN, "본인 계정으로만 할 수 있습니다.");
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
                    // 외부 AI(비전) 호출 비용이 드는 기능이라 사진 주인·관리자만
                    if (!isSelfOrAdmin(photo.getMemberId())) {
                        return errorResponse(HttpStatus.FORBIDDEN, "내 사진에만 쓸 수 있습니다.");
                    }
                    List<String> suggestions = autoTagService.suggestWithVision(
                            photo.getTitle(), photo.getDescription(), photo.getColorMood(), photo.getImageUrl());
                    Map<String, Object> result = new HashMap<>();
                    result.put("status", "success");
                    result.put("data", suggestions);
                    return ResponseEntity.ok(result);
                })
                .orElseGet(() -> errorResponse(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다."));
    }

    // ── 유틸리티 ──────────────────────────────────────────────────────

    private boolean isSelfOrAdmin(Long ownerId) {
        return SecurityUtil.getCurrentMemberId().equals(ownerId) || SecurityUtil.isAdmin();
    }

    private ResponseEntity<Map<String, Object>> errorResponse(HttpStatus status, String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("status", "error");
        error.put("message", message);
        return ResponseEntity.status(status).body(error);
    }
}
