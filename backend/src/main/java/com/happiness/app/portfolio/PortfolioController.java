package com.happiness.app.portfolio;

import com.happiness.app.brand.ClientBrand;
import com.happiness.app.brand.ClientBrandRepository;
import com.happiness.app.follow.FollowRepository;
import com.happiness.app.member.dto.MemberResponse;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
import com.happiness.app.photo.dto.PhotoResponse;
import com.happiness.app.photo.repository.PhotoRepository;
import com.happiness.app.press.Achievement;
import com.happiness.app.press.AchievementRepository;
import com.happiness.app.press.PressFeature;
import com.happiness.app.press.PressFeatureRepository;
import com.happiness.app.pricing.PricingPackage;
import com.happiness.app.pricing.PricingPackageRepository;
import com.happiness.app.series.dto.SeriesResponse;
import com.happiness.app.series.entity.Series;
import com.happiness.app.series.entity.SeriesPhoto;
import com.happiness.app.series.repository.SeriesPhotoRepository;
import com.happiness.app.series.repository.SeriesRepository;
import com.happiness.app.testimonial.Testimonial;
import com.happiness.app.testimonial.TestimonialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    private final TestimonialRepository testimonialRepository;
    private final PressFeatureRepository pressFeatureRepository;
    private final AchievementRepository achievementRepository;
    private final PricingPackageRepository pricingPackageRepository;
    private final ClientBrandRepository clientBrandRepository;

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

        // 추천사
        List<Map<String, Object>> testimonials = testimonialRepository
            .findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(member.getId())
            .stream().map(t -> {
                Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("id", t.getId()); m.put("clientName", t.getClientName());
                m.put("clientRole", t.getClientRole()); m.put("content", t.getContent());
                m.put("shootDate", t.getShootDate()); m.put("featured", t.isFeatured());
                return m;
            }).collect(Collectors.toList());

        // 언론
        List<Map<String, Object>> press = pressFeatureRepository
            .findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(member.getId())
            .stream().map(p -> {
                Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("id", p.getId()); m.put("publication", p.getPublication());
                m.put("title", p.getTitle()); m.put("url", p.getUrl());
                m.put("publishedDate", p.getPublishedDate()); m.put("logoUrl", p.getLogoUrl());
                return m;
            }).collect(Collectors.toList());

        // 수상/전시
        List<Map<String, Object>> achievements = achievementRepository
            .findByMemberIdOrderByYearMonthDescDisplayOrderAsc(member.getId())
            .stream().map(a -> {
                Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("id", a.getId()); m.put("type", a.getType());
                m.put("title", a.getTitle()); m.put("organizer", a.getOrganizer());
                m.put("location", a.getLocation()); m.put("yearMonth", a.getYearMonth());
                m.put("url", a.getUrl());
                return m;
            }).collect(Collectors.toList());

        // 가격 패키지 (공개용 — 활성만)
        List<Map<String, Object>> pricing = pricingPackageRepository
            .findByMemberIdAndActiveTrueOrderByDisplayOrderAsc(member.getId())
            .stream().map(p -> {
                Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("id", p.getId()); m.put("name", p.getName());
                m.put("price", p.getPrice()); m.put("priceLabel", p.getPriceLabel());
                m.put("description", p.getDescription()); m.put("features", p.getFeatures());
                m.put("featured", p.isFeatured());
                return m;
            }).collect(Collectors.toList());

        // 클라이언트 브랜드
        List<Map<String, Object>> brands = clientBrandRepository
            .findByMemberIdOrderByDisplayOrderAscCreatedAtAsc(member.getId())
            .stream().map(b -> {
                Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("id", b.getId()); m.put("name", b.getName()); m.put("logoUrl", b.getLogoUrl());
                return m;
            }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("member",         MemberResponse.fromEntity(member));
        response.put("photos",         photos);
        response.put("photoCount",     photos.size());
        response.put("series",         series);
        response.put("followerCount",  followerCount);
        response.put("followingCount", followingCount);
        response.put("totalLikes",     totalLikes);
        response.put("testimonials",   testimonials);
        response.put("press",          press);
        response.put("achievements",   achievements);
        response.put("pricing",        pricing);
        response.put("brands",         brands);

        return ResponseEntity.ok(response);
    }
}
