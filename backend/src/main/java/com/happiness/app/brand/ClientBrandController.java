package com.happiness.app.brand;

import com.happiness.app.common.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/brands")
@RequiredArgsConstructor
public class ClientBrandController {

    private final ClientBrandRepository repo;

    /* ── 공개: 멤버별 클라이언트 브랜드 ── */
    @GetMapping("/member/{memberId}")
    public ResponseEntity<List<Map<String, Object>>> list(@PathVariable Long memberId) {
        return ResponseEntity.ok(
            repo.findByMemberIdOrderByDisplayOrderAscCreatedAtAsc(memberId)
                .stream().map(this::toMap).collect(Collectors.toList())
        );
    }

    /* ── 인증: 추가 ── */
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        ClientBrand b = ClientBrand.builder()
            .memberId(memberId)
            .name(str(body, "name"))
            .logoUrl(str(body, "logoUrl"))
            .displayOrder(num(body, "displayOrder"))
            .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(repo.save(b)));
    }

    /* ── 인증: 수정 ── */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id,
                                                       @RequestBody Map<String, Object> body) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        ClientBrand b = repo.findById(id)
            .filter(x -> x.getMemberId().equals(memberId))
            .orElseThrow(() -> new RuntimeException("not found"));
        if (body.containsKey("name"))         b.setName(str(body, "name"));
        if (body.containsKey("logoUrl"))      b.setLogoUrl(str(body, "logoUrl"));
        if (body.containsKey("displayOrder")) b.setDisplayOrder(num(body, "displayOrder"));
        return ResponseEntity.ok(toMap(repo.save(b)));
    }

    /* ── 인증: 삭제 ── */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        repo.findById(id).filter(x -> x.getMemberId().equals(memberId)).ifPresent(repo::delete);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toMap(ClientBrand b) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", b.getId()); m.put("name", b.getName());
        m.put("logoUrl", b.getLogoUrl()); m.put("displayOrder", b.getDisplayOrder()); return m;
    }

    private String str(Map<String, Object> m, String key) { Object v = m.get(key); return v == null ? null : v.toString(); }
    private int num(Map<String, Object> m, String key) { Object v = m.get(key); if (v == null) return 0; return v instanceof Number ? ((Number) v).intValue() : Integer.parseInt(v.toString()); }
}
