package com.happiness.app.pricing;

import com.happiness.app.common.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/pricing")
@RequiredArgsConstructor
public class PricingController {

    private final PricingPackageRepository repo;

    /* ── 공개: 활성 패키지 목록 ── */
    @GetMapping("/member/{memberId}")
    public ResponseEntity<List<Map<String, Object>>> list(@PathVariable Long memberId) {
        return ResponseEntity.ok(
            repo.findByMemberIdAndActiveTrueOrderByDisplayOrderAsc(memberId)
                .stream().map(this::toMap).collect(Collectors.toList())
        );
    }

    /* ── 인증: 내 패키지 전체 (비활성 포함) ── */
    @GetMapping("/my")
    public ResponseEntity<List<Map<String, Object>>> myList() {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(
            repo.findByMemberIdOrderByDisplayOrderAsc(memberId)
                .stream().map(this::toMap).collect(Collectors.toList())
        );
    }

    /* ── 인증: 추가 ── */
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        PricingPackage p = PricingPackage.builder()
            .memberId(memberId)
            .name(str(body, "name"))
            .price(body.get("price") != null ? num(body, "price") : null)
            .priceLabel(str(body, "priceLabel"))
            .description(str(body, "description"))
            .features(str(body, "features"))
            .featured(Boolean.TRUE.equals(body.get("featured")))
            .displayOrder(num(body, "displayOrder"))
            .active(body.get("active") == null || Boolean.TRUE.equals(body.get("active")))
            .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(repo.save(p)));
    }

    /* ── 인증: 수정 ── */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id,
                                                       @RequestBody Map<String, Object> body) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        PricingPackage p = repo.findById(id)
            .filter(x -> x.getMemberId().equals(memberId))
            .orElseThrow(() -> new RuntimeException("not found"));
        if (body.containsKey("name"))         p.setName(str(body, "name"));
        if (body.containsKey("price"))        p.setPrice(body.get("price") != null ? num(body, "price") : null);
        if (body.containsKey("priceLabel"))   p.setPriceLabel(str(body, "priceLabel"));
        if (body.containsKey("description"))  p.setDescription(str(body, "description"));
        if (body.containsKey("features"))     p.setFeatures(str(body, "features"));
        if (body.containsKey("featured"))     p.setFeatured(Boolean.TRUE.equals(body.get("featured")));
        if (body.containsKey("displayOrder")) p.setDisplayOrder(num(body, "displayOrder"));
        if (body.containsKey("active"))       p.setActive(Boolean.TRUE.equals(body.get("active")));
        return ResponseEntity.ok(toMap(repo.save(p)));
    }

    /* ── 인증: 삭제 ── */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        repo.findById(id).filter(x -> x.getMemberId().equals(memberId)).ifPresent(repo::delete);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toMap(PricingPackage p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId()); m.put("name", p.getName());
        m.put("price", p.getPrice()); m.put("priceLabel", p.getPriceLabel());
        m.put("description", p.getDescription()); m.put("features", p.getFeatures());
        m.put("featured", p.isFeatured()); m.put("displayOrder", p.getDisplayOrder());
        m.put("active", p.isActive()); return m;
    }

    private String str(Map<String, Object> m, String key) { Object v = m.get(key); return v == null ? null : v.toString(); }
    private int num(Map<String, Object> m, String key) { Object v = m.get(key); if (v == null) return 0; return v instanceof Number ? ((Number) v).intValue() : Integer.parseInt(v.toString()); }
}
