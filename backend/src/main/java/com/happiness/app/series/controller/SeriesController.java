package com.happiness.app.series.controller;

import com.happiness.app.analytics.repository.AnalyticsEventRepository;
import com.happiness.app.booking.entity.BookingAvailability;
import com.happiness.app.booking.repository.BookingAvailabilityRepository;
import com.happiness.app.common.SecurityUtil;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
import com.happiness.app.photo.dto.PhotoResponse;
import com.happiness.app.photo.entity.Photo;
import com.happiness.app.photo.repository.PhotoRepository;
import com.happiness.app.series.dto.CreditDto;
import com.happiness.app.series.dto.CreditsJson;
import com.happiness.app.series.dto.DiscoverWorkResponse;
import com.happiness.app.series.dto.SeriesRequest;
import com.happiness.app.series.dto.SeriesResponse;
import com.happiness.app.series.entity.Series;
import com.happiness.app.series.entity.SeriesAppreciation;
import com.happiness.app.series.entity.SeriesPhoto;
import com.happiness.app.series.repository.SeriesAppreciationRepository;
import com.happiness.app.series.repository.SeriesPhotoRepository;
import com.happiness.app.series.repository.SeriesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
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
    private final MemberRepository memberRepository;
    private final BookingAvailabilityRepository bookingAvailabilityRepository;
    private final SeriesAppreciationRepository seriesAppreciationRepository;
    private final AnalyticsEventRepository analyticsEventRepository;

    /** [id, count] 집계 결과를 Map으로 */
    private static Map<Long, Long> toCountMap(List<Object[]> rows) {
        Map<Long, Long> m = new HashMap<>();
        for (Object[] r : rows) m.put(((Number) r[0]).longValue(), ((Number) r[1]).longValue());
        return m;
    }

    private Map<Long, Long> appreciationCounts(Collection<Long> seriesIds) {
        return seriesIds.isEmpty() ? Map.of() : toCountMap(seriesAppreciationRepository.countBySeriesIds(seriesIds));
    }

    private Map<Long, Long> viewCounts(Collection<Long> seriesIds) {
        return seriesIds.isEmpty() ? Map.of() : toCountMap(analyticsEventRepository.countWorkViews(seriesIds));
    }

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
        if (req.getDraft() != null) {
            series.setDraft(req.getDraft() ? Boolean.TRUE : null);   // 공개는 null로 둔다(기존 행과 같은 표현)
        }
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

    private static final int CREDITS_MAX = 20;

    /**
     * 함께한 사람 반영. null = 변경 없음, [] = 비우기. 역할·이름은 필수(역할 20자, 이름 40자), @프로필명은 선택.
     * 프로필명은 존재 여부를 여기서 강제하지 않는다 — 나중에 가입하는 협업자도 있어, 링크 여부는 조회 시점에 판단한다.
     */
    private void applyCredits(Series series, SeriesRequest req) {
        if (req.getCredits() == null) return;
        if (req.getCredits().size() > CREDITS_MAX) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "함께한 사람은 20명까지 적을 수 있어요.");
        }
        List<CreditDto> clean = new ArrayList<>();
        for (CreditDto c : req.getCredits()) {
            String role = c.getRole() == null ? "" : stripTags(c.getRole());
            String name = c.getName() == null ? "" : stripTags(c.getName());
            String profile = c.getProfileName() == null ? "" : c.getProfileName().trim().replaceFirst("^@", "");
            if (role.isEmpty() && name.isEmpty() && profile.isEmpty()) continue;   // 빈 줄은 무시
            if (role.isEmpty() || name.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "함께한 사람은 역할과 이름을 모두 적어 주세요.");
            }
            if (role.length() > 20 || name.length() > 40) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "역할은 20자, 이름은 40자 이내로 적어 주세요.");
            }
            if (!profile.isEmpty() && !profile.matches("^[A-Za-z0-9_.-]{1,30}$")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "프로필명 형식이 올바르지 않아요.");
            }
            clean.add(CreditDto.builder().role(role).name(name).profileName(profile.isEmpty() ? null : profile).build());
        }
        series.setCreditsJson(CreditsJson.write(clean));
    }

    /** 상세 응답용 — 프로필명이 실제 공개 회원이면 linked=true (한 번에 조회) */
    private List<CreditDto> withLinks(List<CreditDto> credits) {
        Set<String> names = credits.stream().map(CreditDto::getProfileName).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<String> publicNames = names.isEmpty() ? Set.of() : memberRepository.findByProfileNameIn(names).stream()
                .filter(Member::isPublicProfile).map(Member::getProfileName).collect(Collectors.toSet());
        return credits.stream().map(c -> CreditDto.builder().role(c.getRole()).name(c.getName())
                .profileName(c.getProfileName()).linked(publicNames.contains(c.getProfileName())).build())
                .collect(Collectors.toList());
    }

    private static String stripTags(String input) {
        return input.replaceAll("<[^>]*>", "").trim();
    }

    /** 멤버별 시리즈 목록 (공개) — 초안은 빠진다. 작가 본인은 GET /mine으로 초안까지 받는다 */
    @GetMapping
    public ResponseEntity<List<SeriesResponse>> getSeries(
            @RequestParam(required = false) Long memberId) {
        if (memberId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(summaries(seriesRepository.findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(memberId)
                .stream().filter(s -> !Boolean.TRUE.equals(s.getDraft())).collect(Collectors.toList())));
    }

    /**
     * 내 작업 목록 (인증, 초안 포함). 공개 목록에 "본인이면 초안 포함" 분기를 두지 않은 이유: 웹은 새로고침 직후
     * 공개 GET에 토큰을 싣지 않아(메모리 보관) 본인도 익명으로 보인다 — 인증 경로여야 401 → 재발급을 탄다.
     */
    @GetMapping("/mine")
    public ResponseEntity<List<SeriesResponse>> mySeries() {
        return ResponseEntity.ok(summaries(
                seriesRepository.findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(SecurityUtil.getCurrentMemberId())));
    }

    /** 초안은 작가 본인·관리자만 볼 수 있다 — 그 외에는 없는 작업처럼 404 */
    private boolean visibleToRequester(Series s) {
        if (!Boolean.TRUE.equals(s.getDraft())) return true;
        return SecurityUtil.isAuthenticated()
                && (s.getMemberId().equals(SecurityUtil.getCurrentMemberId()) || SecurityUtil.isAdmin());
    }

    private List<SeriesResponse> summaries(List<Series> list) {
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
        return result;
    }

    /**
     * 작업 탐색 (공개) — 작가를 가로질러 작업 노트를 둘러본다.
     * 잘못된 shootType은 400이 아니라 "전체"로 처리한다(공유 링크가 깨지지 않도록).
     * 작업 1페이지를 가져온 뒤 작가·가용 설정·작업-사진·사진을 각각 한 번씩 배치 조회한다(N+1 없음).
     */
    @GetMapping("/discover")
    public ResponseEntity<Map<String, Object>> discover(
            @RequestParam(required = false) String shootType,
            @RequestParam(required = false) String location,
            @RequestParam(defaultValue = "recent") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        String type = shootType != null && SHOOT_TYPES.contains(shootType.trim()) ? shootType.trim() : null;
        String loc = location == null ? null : location.trim();
        if (loc != null && loc.isEmpty()) loc = null;
        if (loc != null && loc.length() > 50) loc = loc.substring(0, 50);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 60);

        PageRequest pr = PageRequest.of(safePage, safeSize);
        // sort: recent(기본, 최근 수정순) | appreciated(감상 많은 순) | viewed(조회 많은 순). 모르는 값은 recent
        Slice<Series> slice = switch (sort) {
            case "appreciated" -> seriesRepository.discoverByAppreciation(type, loc, pr);
            case "viewed" -> seriesRepository.discoverByViews(type, loc, pr);
            default -> seriesRepository.discover(type, loc, pr);
        };
        List<Series> works = slice.getContent();

        Set<Long> memberIds = works.stream().map(Series::getMemberId).collect(Collectors.toSet());
        Map<Long, Member> members = memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::getId, m -> m));
        Set<Long> accepting = bookingAvailabilityRepository.findByMemberIdIn(memberIds).stream()
                .filter(BookingAvailability::isActive)
                .map(BookingAvailability::getMemberId)
                .collect(Collectors.toSet());

        List<Long> seriesIds = works.stream().map(Series::getId).collect(Collectors.toList());
        Map<Long, List<Long>> photoIdsBySeries = new HashMap<>();
        if (!seriesIds.isEmpty()) {
            for (SeriesPhoto sp : seriesPhotoRepository.findBySeriesIdInOrderBySeriesIdAscDisplayOrderAsc(seriesIds)) {
                photoIdsBySeries.computeIfAbsent(sp.getSeriesId(), k -> new ArrayList<>()).add(sp.getPhotoId());
            }
        }
        Set<Long> previewIds = photoIdsBySeries.values().stream()
                .flatMap(ids -> ids.stream().limit(3))
                .collect(Collectors.toSet());
        Map<Long, Long> appreciations = appreciationCounts(seriesIds);
        Map<Long, Long> views = viewCounts(seriesIds);
        Map<Long, String> thumbById = photoRepository.findAllById(previewIds).stream()
                .collect(Collectors.toMap(Photo::getId,
                        p -> p.getThumbnailUrl() != null ? p.getThumbnailUrl() : p.getImageUrl()));

        List<DiscoverWorkResponse> data = works.stream().map(s -> {
            List<Long> photoIds = photoIdsBySeries.getOrDefault(s.getId(), List.of());
            List<String> previews = photoIds.stream().limit(3)
                    .map(thumbById::get).filter(Objects::nonNull).collect(Collectors.toList());
            Member m = members.get(s.getMemberId());
            return DiscoverWorkResponse.builder()
                    .id(s.getId())
                    .title(s.getTitle())
                    .coverImageUrl(s.getCoverImageUrl() != null ? s.getCoverImageUrl()
                            : (previews.isEmpty() ? null : previews.get(0)))
                    .shootType(s.getShootType())
                    .clientLabel(s.getClientLabel())
                    .shotOn(s.getShotOn())
                    .photoCount(photoIds.size())
                    .previewPhotos(previews)
                    .updatedAt(s.getUpdatedAt())
                    .memberId(s.getMemberId())
                    .memberName(m != null ? m.getName() : null)
                    .memberProfileName(m != null ? m.getProfileName() : null)
                    .memberAvatarUrl(m != null ? m.getAvatarUrl() : null)
                    .memberLocation(m != null ? m.getLocation() : null)
                    .acceptingBookings(accepting.contains(s.getMemberId()))
                    .appreciationCount(appreciations.getOrDefault(s.getId(), 0L))
                    .viewCount(views.getOrDefault(s.getId(), 0L))
                    .build();
        }).collect(Collectors.toList());

        Map<String, Object> body = new HashMap<>();
        body.put("data", data);
        body.put("page", safePage);
        body.put("size", safeSize);
        body.put("hasNext", slice.hasNext());
        return ResponseEntity.ok(body);
    }

    /** 시리즈 상세 (공개) */
    @GetMapping("/{id}")
    public ResponseEntity<SeriesResponse> getSeriesById(@PathVariable Long id) {
        return seriesRepository.findById(id)
                .filter(this::visibleToRequester)
                .map(series -> {
                    List<SeriesPhoto> sps = seriesPhotoRepository.findBySeriesIdOrderByDisplayOrderAsc(id);
                    List<PhotoResponse> photos = sps.stream()
                            .map(sp -> photoRepository.findById(sp.getPhotoId()))
                            .filter(Optional::isPresent)
                            .map(opt -> PhotoResponse.fromEntity(opt.get()))
                            .collect(Collectors.toList());
                    SeriesResponse body = SeriesResponse.fromEntity(series, photos);
                    body.setAppreciationCount(seriesAppreciationRepository.countBySeriesId(id));
                    body.setCredits(withLinks(body.getCredits()));
                    body.setViewCount(viewCounts(List.of(id)).getOrDefault(id, 0L));
                    body.setAppreciatedByMe(SecurityUtil.isAuthenticated()
                            && seriesAppreciationRepository.existsBySeriesIdAndMemberId(id, SecurityUtil.getCurrentMemberId()));
                    return ResponseEntity.ok(body);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 작업 감상 — 회원당 1회(중복 요청은 그대로 성공, 멱등). 본인 작업에는 감상할 수 없다.
     * 응답: { appreciationCount, appreciatedByMe }
     */
    @PostMapping("/{id}/appreciation")
    public ResponseEntity<Map<String, Object>> appreciate(@PathVariable Long id) {
        Long me = SecurityUtil.getCurrentMemberId();
        Series series = seriesRepository.findById(id).filter(this::visibleToRequester)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "작업을 찾을 수 없습니다."));
        if (series.getMemberId().equals(me)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본인 작업에는 감상할 수 없어요.");
        }
        if (!seriesAppreciationRepository.existsBySeriesIdAndMemberId(id, me)) {
            try {
                seriesAppreciationRepository.save(SeriesAppreciation.builder().seriesId(id).memberId(me).build());
            } catch (org.springframework.dao.DataIntegrityViolationException dup) {
                // 동시 요청으로 유니크 제약에 걸린 경우 — 이미 감상한 상태라 결과는 같다
            }
        }
        return ResponseEntity.ok(Map.of("appreciationCount", seriesAppreciationRepository.countBySeriesId(id),
                "appreciatedByMe", true));
    }

    /**
     * 내 감상 여부 (인증 필요). 웹은 access token을 메모리에만 두므로 새로고침 직후 공개 상세 조회에는 토큰이 없어
     * appreciatedByMe가 항상 false로 온다. 이 경로는 인증이 필요해 401 → 토큰 재발급 → 재시도를 타므로 정확한 값을 준다.
     */
    @GetMapping("/{id}/appreciation")
    public ResponseEntity<Map<String, Object>> myAppreciation(@PathVariable Long id) {
        Long me = SecurityUtil.getCurrentMemberId();
        if (!seriesRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "작업을 찾을 수 없습니다.");
        }
        return ResponseEntity.ok(Map.of("appreciationCount", seriesAppreciationRepository.countBySeriesId(id),
                "appreciatedByMe", seriesAppreciationRepository.existsBySeriesIdAndMemberId(id, me)));
    }

    @DeleteMapping("/{id}/appreciation")
    public ResponseEntity<Map<String, Object>> unappreciate(@PathVariable Long id) {
        Long me = SecurityUtil.getCurrentMemberId();
        if (!seriesRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "작업을 찾을 수 없습니다.");
        }
        seriesAppreciationRepository.deleteBySeriesIdAndMemberId(id, me);
        return ResponseEntity.ok(Map.of("appreciationCount", seriesAppreciationRepository.countBySeriesId(id),
                "appreciatedByMe", false));
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
        applyCredits(series, req);
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
        applyCredits(series, req);
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
        seriesAppreciationRepository.deleteBySeriesId(id);
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
