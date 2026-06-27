package com.happiness.app.portfolio;

import com.happiness.app.follow.FollowRepository;
import com.happiness.app.member.dto.MemberResponse;
import com.happiness.app.member.entity.Authority;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
import com.happiness.app.photo.dto.PhotoResponse;
import com.happiness.app.photo.repository.PhotoRepository;
import com.happiness.app.portfolio.dto.PortfolioConfigResponse;
import com.happiness.app.security.auth.CustomUserDetails;
import com.happiness.app.series.dto.SeriesResponse;
import com.happiness.app.series.entity.Series;
import com.happiness.app.series.entity.SeriesPhoto;
import com.happiness.app.series.repository.SeriesPhotoRepository;
import com.happiness.app.series.repository.SeriesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
public class PortfolioController {

    private final MemberRepository memberRepository;
    private final PhotoRepository photoRepository;
    private final SeriesRepository seriesRepository;
    private final SeriesPhotoRepository seriesPhotoRepository;
    private final FollowRepository followRepository;

    @GetMapping("/{profileName}")
    public ResponseEntity<?> getPortfolio(@PathVariable String profileName) {
        Member member = memberRepository.findByProfileName(profileName)
                .orElse(null);

        if (member == null) {
            return ResponseEntity.notFound().build();
        }

        // 비공개 포트폴리오 처리
        if (!member.isPublicProfile()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("status", "private", "message", "비공개 포트폴리오입니다."));
        }

        List<PhotoResponse> photos = photoRepository
                .findByMemberIdOrderByCreatedAtDesc(member.getId())
                .stream()
                .map(PhotoResponse::fromEntity)
                .collect(Collectors.toList());

        // 총 좋아요 수 집계
        long totalLikes = photos.stream()
                .mapToLong(p -> p.getLikesCount() != null ? p.getLikesCount() : 0)
                .sum();

        // 팔로워 / 팔로잉 수
        long followerCount  = followRepository.countByFollowingId(member.getId());
        long followingCount = followRepository.countByFollowerId(member.getId());

        // 시리즈 목록 (커버 이미지 포함)
        List<Series> seriesList = seriesRepository
                .findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(member.getId());
        List<SeriesResponse> series = seriesList.stream().map(s -> {
            List<SeriesPhoto> sps = seriesPhotoRepository.findBySeriesIdOrderByDisplayOrderAsc(s.getId());
            String coverUrl = null;
            if (!sps.isEmpty()) {
                coverUrl = photoRepository.findById(sps.get(0).getPhotoId())
                        .map(p -> p.getThumbnailUrl() != null ? p.getThumbnailUrl() : p.getImageUrl())
                        .orElse(null);
            }
            return SeriesResponse.summary(s, sps.size(), coverUrl);
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("member",         MemberResponse.fromEntity(member));
        response.put("photos",         photos);
        response.put("photoCount",     photos.size());
        response.put("series",         series);
        response.put("followerCount",  followerCount);
        response.put("followingCount", followingCount);
        response.put("totalLikes",     totalLikes);

        return ResponseEntity.ok(response);
    }

    /* ── GET /api/portfolio/{profileName}/config  ── 공개, 인증 불필요 */
    @GetMapping("/{profileName}/config")
    public ResponseEntity<PortfolioConfigResponse> getPortfolioConfig(@PathVariable String profileName) {
        Member member = memberRepository.findByProfileName(profileName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "포트폴리오를 찾을 수 없습니다."));

        PortfolioConfigResponse config = PortfolioConfigResponse.builder()
                .template(member.getPortfolioTemplate() != null ? member.getPortfolioTemplate() : "EDITORIAL")
                .styleJson(member.getPortfolioStyleJson())
                .sectionsJson(member.getPortfolioSectionsJson())
                .build();

        return ResponseEntity.ok(config);
    }

    /* ── PUT /api/portfolio/{profileName}/template  ── 본인 또는 ADMIN 만 */
    @PutMapping("/{profileName}/template")
    public ResponseEntity<?> updatePortfolioTemplate(
            @PathVariable String profileName,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> body) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Member member = memberRepository.findByProfileName(profileName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "포트폴리오를 찾을 수 없습니다."));

        // IDOR 방지: 본인 또는 ADMIN(WM/SA) 만 수정 가능
        boolean isAdmin = Authority.WM.name().equals(userDetails.getRole())
                || Authority.SA.name().equals(userDetails.getRole());
        if (!isAdmin && !member.getId().equals(userDetails.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "본인의 포트폴리오만 수정할 수 있습니다."));
        }

        // 템플릿 화이트리스트 검증
        String template = (String) body.get("template");
        if (template != null) {
            List<String> allowed = List.of("SCRL", "EDITORIAL", "FILM", "SPLIT", "MOSAIC", "MAGAZINE", "MINIMAL", "DARK_ROOM");
            if (!allowed.contains(template)) {
                return ResponseEntity.badRequest().body(Map.of("message", "유효하지 않은 템플릿입니다."));
            }
            member.setPortfolioTemplate(template);
        }

        if (body.containsKey("styleJson")) {
            member.setPortfolioStyleJson((String) body.get("styleJson"));
        }
        if (body.containsKey("sectionsJson")) {
            member.setPortfolioSectionsJson((String) body.get("sectionsJson"));
        }

        memberRepository.save(member);
        return ResponseEntity.ok(Map.of("status", "success", "template", member.getPortfolioTemplate()));
    }
}
