package com.happiness.app.portfolio;

import com.happiness.app.member.dto.MemberResponse;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
import com.happiness.app.photo.dto.PhotoResponse;
import com.happiness.app.photo.repository.PhotoRepository;
import com.happiness.app.series.dto.SeriesResponse;
import com.happiness.app.series.entity.Series;
import com.happiness.app.series.entity.SeriesPhoto;
import com.happiness.app.series.repository.SeriesPhotoRepository;
import com.happiness.app.series.repository.SeriesRepository;
import lombok.RequiredArgsConstructor;
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

    @GetMapping("/{profileName}")
    public ResponseEntity<?> getPortfolio(@PathVariable String profileName) {
        Member member = memberRepository.findByProfileName(profileName)
                .orElse(null);

        if (member == null) {
            return ResponseEntity.notFound().build();
        }

        List<PhotoResponse> photos = photoRepository
                .findByMemberIdOrderByCreatedAtDesc(member.getId())
                .stream()
                .map(PhotoResponse::fromEntity)
                .collect(Collectors.toList());

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
        response.put("member", MemberResponse.fromEntity(member));
        response.put("photos", photos);
        response.put("photoCount", photos.size());
        response.put("series", series);

        return ResponseEntity.ok(response);
    }
}
