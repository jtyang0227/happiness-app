package com.happiness.app.spot;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
import com.happiness.app.photo.dto.PhotoResponse;
import com.happiness.app.photo.entity.Photo;
import com.happiness.app.photo.repository.PhotoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 출사 스팟 (ANALYSIS_chulsa-app-public-features.md P0).
 * 조회(목록·상세·중복 후보·사진의 스팟)는 공개, 생성은 로그인, 수정·삭제는 만든 사람/관리자, 사진 연결은 사진 주인만.
 * 응답은 무드보드와 같이 래퍼 없는 JSON, 오류는 ResponseStatusException → GlobalExceptionHandler.
 */
@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SpotController {

    static final double DUPLICATE_RADIUS_M = 200;
    static final double SAME_PLACE_RADIUS_M = 50;
    private static final int DAILY_CREATE_LIMIT = 20;
    private static final int PREVIEW_COUNT = 3;

    private final SpotRepository spotRepository;
    private final PhotoSpotRepository photoSpotRepository;
    private final PhotoRepository photoRepository;
    private final MemberRepository memberRepository;

    // ── 입력 정리 ─────────────────────────────────────────────────────

    private static String clean(Object raw, int max, String label, boolean required) {
        String v = raw == null ? "" : raw.toString().replaceAll("<[^>]*>", "").trim();
        if (v.isEmpty()) {
            if (required) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "을(를) 입력해 주세요.");
            return null;
        }
        if (v.length() > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "은(는) " + max + "자 이내로 입력해 주세요.");
        }
        return v;
    }

    private static double coord(Object raw, double min, double max, String label) {
        if (raw == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " 좌표가 필요합니다.");
        double v;
        try {
            v = raw instanceof Number n ? n.doubleValue() : Double.parseDouble(raw.toString());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " 좌표가 올바르지 않습니다.");
        }
        if (Double.isNaN(v) || v < min || v > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " 좌표가 범위를 벗어났습니다.");
        }
        return v;
    }

    /** 두 좌표 사이 거리(m) — 하버사인 */
    static double distanceM(double lat1, double lng1, double lat2, double lng2) {
        double r = 6_371_000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    private static String norm(String s) {
        return s == null ? "" : s.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
    }

    private static String lowerOrNull(String s) {
        if (s == null || s.isBlank()) return null;
        String t = s.trim().toLowerCase(Locale.ROOT);
        return t.length() > 30 ? t.substring(0, 30) : t;
    }

    private Spot findSpot(Long id) {
        return spotRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "스팟을 찾을 수 없습니다."));
    }

    private static boolean canEdit(Spot s) {
        if (!SecurityUtil.isAuthenticated()) return false;
        return SecurityUtil.isAdmin() || s.getCreatedBy().equals(SecurityUtil.getCurrentMemberId());
    }

    private static String thumb(Photo p) {
        return p.getThumbnailUrl() != null ? p.getThumbnailUrl() : p.getImageUrl();
    }

    private Map<String, Object> summary(Spot s, long photoCount, List<String> previews) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("name", s.getName());
        m.put("lat", s.getLat());
        m.put("lng", s.getLng());
        m.put("address", s.getAddress());
        m.put("region", s.getRegion());
        m.put("bestTime", s.getBestTime());
        m.put("photoCount", photoCount);
        m.put("previewPhotos", previews);
        return m;
    }

    // ── 공개 조회 ─────────────────────────────────────────────────────

    /** 목록·지도 범위 조회. 범위 4개를 모두 주면 지도 모드, 아니면 전체(지역·검색어 필터). 사진 수·미리보기는 배치 조회 */
    @GetMapping("/spots")
    public ResponseEntity<Map<String, Object>> list(@RequestParam(required = false) Double minLat,
                                                    @RequestParam(required = false) Double maxLat,
                                                    @RequestParam(required = false) Double minLng,
                                                    @RequestParam(required = false) Double maxLng,
                                                    @RequestParam(required = false) String region,
                                                    @RequestParam(required = false) String q,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "30") int size) {
        boolean bounded = minLat != null && maxLat != null && minLng != null && maxLng != null;
        int safeSize = Math.max(1, Math.min(size, 100));
        Slice<Spot> slice = spotRepository.search(
                bounded ? minLat : null, bounded ? maxLat : null, bounded ? minLng : null, bounded ? maxLng : null,
                lowerOrNull(region), lowerOrNull(q), PageRequest.of(Math.max(page, 0), safeSize));
        List<Spot> spots = slice.getContent();

        Map<Long, Long> counts = new HashMap<>();
        Map<Long, List<Long>> previewIds = new HashMap<>();
        if (!spots.isEmpty()) {
            List<Long> ids = spots.stream().map(Spot::getId).collect(Collectors.toList());
            for (Object[] row : photoSpotRepository.countPublicBySpotIds(ids)) {
                counts.put((Long) row[0], ((Number) row[1]).longValue());
            }
            for (Object[] row : photoSpotRepository.findPublicPhotoIdsBySpotIds(ids)) {
                List<Long> list = previewIds.computeIfAbsent((Long) row[0], k -> new ArrayList<>());
                if (list.size() < PREVIEW_COUNT) list.add((Long) row[1]);
            }
        }
        Map<Long, String> thumbs = photoRepository.findAllById(
                        previewIds.values().stream().flatMap(List::stream).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Photo::getId, SpotController::thumb));

        List<Map<String, Object>> data = spots.stream().map(s -> summary(s, counts.getOrDefault(s.getId(), 0L),
                previewIds.getOrDefault(s.getId(), List.of()).stream().map(thumbs::get)
                        .filter(Objects::nonNull).collect(Collectors.toList()))).collect(Collectors.toList());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("data", data);
        body.put("page", slice.getNumber());
        body.put("size", safeSize);
        body.put("hasNext", slice.hasNext());
        return ResponseEntity.ok(body);
    }

    /** 스팟 상세 — 공개 프로필 작가의 사진만(최신순), 작성자 정보 배치 첨부 */
    @GetMapping("/spots/{id}")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable Long id) {
        Spot spot = findSpot(id);
        List<Long> photoIds = photoSpotRepository.findPublicPhotoIdsBySpotIds(List.of(id)).stream()
                .map(r -> (Long) r[1]).collect(Collectors.toList());
        Map<Long, Photo> byId = photoRepository.findAllById(photoIds).stream()
                .collect(Collectors.toMap(Photo::getId, Function.identity()));
        List<PhotoResponse> photos = photoIds.stream().map(byId::get).filter(Objects::nonNull)
                .map(PhotoResponse::fromEntity).collect(Collectors.toList());
        Set<Long> memberIds = photos.stream().map(PhotoResponse::getMemberId).collect(Collectors.toSet());
        memberIds.add(spot.getCreatedBy());
        Map<Long, Member> members = memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
        PhotoResponse.attachMembers(photos, members);

        Map<String, Object> body = summary(spot, photos.size(),
                photos.stream().limit(5).map(p -> p.getThumbnailUrl() != null ? p.getThumbnailUrl() : p.getImageUrl())
                        .collect(Collectors.toList()));
        body.put("tips", spot.getTips());
        body.put("createdBy", spot.getCreatedBy());
        Member creator = members.get(spot.getCreatedBy());
        body.put("createdByName", creator != null ? creator.getName() : null);
        body.put("canEdit", canEdit(spot));
        body.put("photos", photos);
        body.put("updatedAt", spot.getUpdatedAt());
        return ResponseEntity.ok(body);
    }

    /**
     * 중복 제안 — 50m 이내는 이름과 무관하게, 200m 이내는 이름이 겹칠 때(공백·대소문자 무시, 한쪽이 다른 쪽을 포함) 후보.
     * 가까운 순 최대 5개.
     */
    @GetMapping("/spots/nearby-duplicate")
    public ResponseEntity<List<Map<String, Object>>> nearbyDuplicate(@RequestParam(required = false) String name,
                                                                     @RequestParam Double lat,
                                                                     @RequestParam Double lng) {
        double la = coord(lat, -90, 90, "위도");
        double ln = coord(lng, -180, 180, "경도");
        return ResponseEntity.ok(duplicates(name, la, ln, null));
    }

    List<Map<String, Object>> duplicates(String name, double lat, double lng, Long excludeId) {
        double dLat = DUPLICATE_RADIUS_M / 111_000.0;
        double dLng = DUPLICATE_RADIUS_M / (111_000.0 * Math.max(0.01, Math.cos(Math.toRadians(lat))));
        String n = norm(name);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Spot s : spotRepository.findInBox(lat - dLat, lat + dLat, lng - dLng, lng + dLng)) {
            if (s.getId().equals(excludeId)) continue;
            double d = distanceM(lat, lng, s.getLat(), s.getLng());
            String sn = norm(s.getName());
            boolean nameOverlap = !n.isEmpty() && (sn.contains(n) || n.contains(sn));
            if (d <= SAME_PLACE_RADIUS_M || (d <= DUPLICATE_RADIUS_M && nameOverlap)) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", s.getId());
                m.put("name", s.getName());
                m.put("region", s.getRegion());
                m.put("distanceM", Math.round(d));
                out.add(m);
            }
        }
        out.sort(Comparator.comparingLong(m -> (Long) m.get("distanceM")));
        return out.size() > 5 ? out.subList(0, 5) : out;
    }

    /** 사진에 연결된 스팟 (공개) — 없으면 data null */
    @GetMapping("/photos/{photoId}/spot")
    public ResponseEntity<Map<String, Object>> photoSpot(@PathVariable Long photoId) {
        Map<String, Object> body = new HashMap<>();
        body.put("data", photoSpotRepository.findByPhotoId(photoId)
                .flatMap(ps -> spotRepository.findById(ps.getSpotId()))
                .map(s -> summary(s, 0, List.of())).orElse(null));
        return ResponseEntity.ok(body);
    }

    // ── 인증 필요 ─────────────────────────────────────────────────────

    private void apply(Spot s, Map<String, Object> body, boolean creating) {
        if (creating || body.containsKey("name")) s.setName(clean(body.get("name"), 50, "스팟 이름", true));
        if (creating || body.containsKey("lat")) s.setLat(coord(body.get("lat"), -90, 90, "위도"));
        if (creating || body.containsKey("lng")) s.setLng(coord(body.get("lng"), -180, 180, "경도"));
        if (body.containsKey("address")) s.setAddress(clean(body.get("address"), 200, "주소", false));
        if (body.containsKey("region")) s.setRegion(clean(body.get("region"), 30, "지역", false));
        if (body.containsKey("bestTime")) s.setBestTime(clean(body.get("bestTime"), 30, "찍기 좋은 시간", false));
        if (body.containsKey("tips")) s.setTips(clean(body.get("tips"), 1000, "팁", false));
    }

    @PostMapping("/spots")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        Long me = SecurityUtil.getCurrentMemberId();
        if (spotRepository.countByCreatedByAndCreatedAtAfter(me, LocalDateTime.now().minusDays(1)) >= DAILY_CREATE_LIMIT) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "스팟은 하루 20개까지 만들 수 있어요.");
        }
        Spot spot = new Spot();
        spot.setCreatedBy(me);
        apply(spot, body, true);
        Spot saved = spotRepository.save(spot);
        log.info("[spot] created id={} by member={}", saved.getId(), me);
        return ResponseEntity.status(HttpStatus.CREATED).body(summary(saved, 0, List.of()));
    }

    @PutMapping("/spots/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Spot spot = findSpot(id);
        if (!canEdit(spot)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "스팟을 만든 사람만 수정할 수 있어요.");
        apply(spot, body, false);
        return ResponseEntity.ok(summary(spotRepository.save(spot), 0, List.of()));
    }

    @DeleteMapping("/spots/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Spot spot = findSpot(id);
        if (!canEdit(spot)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "스팟을 만든 사람만 삭제할 수 있어요.");
        photoSpotRepository.deleteBySpotId(id);
        spotRepository.delete(spot);
        log.info("[spot] deleted id={} by member={}", id, SecurityUtil.getCurrentMemberId());
        return ResponseEntity.noContent().build();
    }

    /** 사진에 스팟 연결/해제 — {"spotId": 3} 또는 {"spotId": null}. 사진 주인(또는 관리자)만 */
    @PutMapping("/photos/{photoId}/spot")
    @Transactional
    public ResponseEntity<Map<String, Object>> setPhotoSpot(@PathVariable Long photoId, @RequestBody Map<String, Object> body) {
        Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다."));
        if (!SecurityUtil.isAdmin() && !photo.getMemberId().equals(SecurityUtil.getCurrentMemberId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 사진에만 스팟을 연결할 수 있어요.");
        }
        Object raw = body.get("spotId");
        Map<String, Object> res = new HashMap<>();
        if (raw == null || raw.toString().isBlank()) {
            photoSpotRepository.deleteByPhotoId(photoId);
            res.put("data", null);
            return ResponseEntity.ok(res);
        }
        long spotId;
        try {
            spotId = raw instanceof Number n ? n.longValue() : Long.parseLong(raw.toString());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "스팟 id가 올바르지 않습니다.");
        }
        Spot spot = findSpot(spotId);
        PhotoSpot link = photoSpotRepository.findByPhotoId(photoId)
                .orElseGet(() -> PhotoSpot.builder().photoId(photoId).build());
        link.setSpotId(spot.getId());
        photoSpotRepository.save(link);
        res.put("data", summary(spot, 0, List.of()));
        return ResponseEntity.ok(res);
    }
}
