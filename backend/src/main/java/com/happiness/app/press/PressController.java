package com.happiness.app.press;

import com.happiness.app.common.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/press")
@RequiredArgsConstructor
public class PressController {

    private final PressFeatureRepository pressRepo;
    private final AchievementRepository achievementRepo;

    /* ── 공개: 멤버별 언론 목록 ── */
    @GetMapping("/member/{memberId}")
    public ResponseEntity<Map<String, Object>> listPress(@PathVariable Long memberId) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("press", pressRepo.findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(memberId)
            .stream().map(this::pressMap).collect(Collectors.toList()));
        res.put("achievements", achievementRepo.findByMemberIdOrderByYearMonthDescDisplayOrderAsc(memberId)
            .stream().map(this::achieveMap).collect(Collectors.toList()));
        return ResponseEntity.ok(res);
    }

    /* ── 인증: 언론 추가 ── */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createPress(@RequestBody Map<String, Object> body) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        PressFeature p = PressFeature.builder()
            .memberId(memberId)
            .publication(str(body, "publication"))
            .title(str(body, "title"))
            .url(str(body, "url"))
            .publishedDate(str(body, "publishedDate"))
            .logoUrl(str(body, "logoUrl"))
            .displayOrder(num(body, "displayOrder"))
            .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(pressMap(pressRepo.save(p)));
    }

    /* ── 인증: 언론 삭제 ── */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePress(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        pressRepo.findById(id).filter(x -> x.getMemberId().equals(memberId)).ifPresent(pressRepo::delete);
        return ResponseEntity.noContent().build();
    }

    /* ── 인증: 수상/전시 추가 ── */
    @PostMapping("/achievements")
    public ResponseEntity<Map<String, Object>> createAchievement(@RequestBody Map<String, Object> body) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        Achievement a = Achievement.builder()
            .memberId(memberId)
            .type(str(body, "type"))
            .title(str(body, "title"))
            .organizer(str(body, "organizer"))
            .location(str(body, "location"))
            .yearMonth(str(body, "yearMonth"))
            .url(str(body, "url"))
            .displayOrder(num(body, "displayOrder"))
            .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(achieveMap(achievementRepo.save(a)));
    }

    /* ── 인증: 수상/전시 삭제 ── */
    @DeleteMapping("/achievements/{id}")
    public ResponseEntity<Void> deleteAchievement(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        achievementRepo.findById(id).filter(x -> x.getMemberId().equals(memberId)).ifPresent(achievementRepo::delete);
        return ResponseEntity.noContent().build();
    }

    /* ── helpers ── */
    private Map<String, Object> pressMap(PressFeature p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId()); m.put("publication", p.getPublication());
        m.put("title", p.getTitle()); m.put("url", p.getUrl());
        m.put("publishedDate", p.getPublishedDate()); m.put("logoUrl", p.getLogoUrl());
        m.put("displayOrder", p.getDisplayOrder()); return m;
    }

    private Map<String, Object> achieveMap(Achievement a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId()); m.put("type", a.getType());
        m.put("title", a.getTitle()); m.put("organizer", a.getOrganizer());
        m.put("location", a.getLocation()); m.put("yearMonth", a.getYearMonth());
        m.put("url", a.getUrl()); m.put("displayOrder", a.getDisplayOrder()); return m;
    }

    private String str(Map<String, Object> m, String key) { Object v = m.get(key); return v == null ? null : v.toString(); }
    private int num(Map<String, Object> m, String key) { Object v = m.get(key); if (v == null) return 0; return v instanceof Number ? ((Number) v).intValue() : Integer.parseInt(v.toString()); }
}
