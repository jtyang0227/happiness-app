package com.happiness.app.portfolio;

import com.happiness.app.member.dto.MemberResponse;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
import com.happiness.app.photo.dto.PhotoResponse;
import com.happiness.app.photo.repository.PhotoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
public class PortfolioController {

    private final MemberRepository memberRepository;
    private final PhotoRepository photoRepository;

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

        Map<String, Object> response = new HashMap<>();
        response.put("member", MemberResponse.fromEntity(member));
        response.put("photos", photos);
        response.put("photoCount", photos.size());

        return ResponseEntity.ok(response);
    }
}
