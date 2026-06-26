package com.happiness.app.testimonial;

import com.happiness.app.common.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/testimonials")
@RequiredArgsConstructor
public class TestimonialController {

    private final TestimonialRepository repo;

    /* ── 공개: 멤버별 추천사 목록 ── */
    @GetMapping("/member/{memberId}")
    public ResponseEntity<List<Map<String, Object>>> list(@PathVariable Long memberId) {
        return ResponseEntity.ok(
            repo.findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(memberId)
                .stream().map(this::toMap).collect(Collectors.toList())
        );
    }

    /* ── 인증: 내 추천사 추가 ── */
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        Testimonial t = Testimonial.builder()
            .memberId(memberId)
            .clientName(str(body, "clientName"))
            .clientRole(str(body, "clientRole"))
            .content(str(body, "content"))
            .shootDate(str(body, "shootDate"))
            .featured(Boolean.TRUE.equals(body.get("featured")))
            .displayOrder(num(body, "displayOrder"))
            .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(repo.save(t)));
    }

    /* ── 인증: 수정 ── */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id,
                                                       @RequestBody Map<String, Object> body) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        Testimonial t = repo.findById(id)
            .filter(x -> x.getMemberId().equals(memberId))
            .orElseThrow(() -> new RuntimeException("not found"));
        if (body.containsKey("clientName"))  t.setClientName(str(body, "clientName"));
        if (body.containsKey("clientRole"))  t.setClientRole(str(body, "clientRole"));
        if (body.containsKey("content"))     t.setContent(str(body, "content"));
        if (body.containsKey("shootDate"))   t.setShootDate(str(body, "shootDate"));
        if (body.containsKey("featured"))    t.setFeatured(Boolean.TRUE.equals(body.get("featured")));
        if (body.containsKey("displayOrder")) t.setDisplayOrder(num(body, "displayOrder"));
        return ResponseEntity.ok(toMap(repo.save(t)));
    }

    /* ── 인증: 삭제 ── */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        repo.findById(id).filter(x -> x.getMemberId().equals(memberId))
            .ifPresent(repo::delete);
        return ResponseEntity.noContent().build();
    }

    /* ── helpers ── */
    private Map<String, Object> toMap(Testimonial t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("clientName", t.getClientName());
        m.put("clientRole", t.getClientRole());
        m.put("content", t.getContent());
        m.put("shootDate", t.getShootDate());
        m.put("featured", t.isFeatured());
        m.put("displayOrder", t.getDisplayOrder());
        m.put("createdAt", t.getCreatedAt());
        return m;
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v == null ? null : v.toString();
    }

    private int num(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v == null) return 0;
        return v instanceof Number ? ((Number) v).intValue() : Integer.parseInt(v.toString());
    }
}
