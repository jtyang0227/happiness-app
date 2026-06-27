package com.happiness.app.newsletter;

import com.happiness.app.common.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/newsletter")
@RequiredArgsConstructor
public class NewsletterController {

    private final NewsletterRepository repo;

    /* rate limit: IP → (count, windowStart) */
    private final ConcurrentHashMap<String, long[]> rateLimitMap = new ConcurrentHashMap<>();

    /* ── 공개: 구독 (rate limit 5req/min/IP) ── */
    @PostMapping("/subscribe/{memberId}")
    public ResponseEntity<Map<String, Object>> subscribe(
            @PathVariable Long memberId,
            @RequestBody Map<String, Object> body,
            jakarta.servlet.http.HttpServletRequest req) {

        String ip = Optional.ofNullable(req.getHeader("X-Forwarded-For"))
            .map(h -> h.split(",")[0].trim()).orElse(req.getRemoteAddr());

        if (!checkRateLimit(ip)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("error", "잠시 후 다시 시도해주세요."));
        }

        String email = Objects.toString(body.get("email"), "").trim().toLowerCase();
        if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            return ResponseEntity.badRequest().body(Map.of("error", "이메일 형식이 올바르지 않습니다."));
        }

        Optional<NewsletterSubscriber> existing = repo.findByMemberIdAndEmail(memberId, email);
        if (existing.isPresent()) {
            NewsletterSubscriber s = existing.get();
            if (s.getUnsubscribedAt() != null) {
                s.setUnsubscribedAt(null);
                repo.save(s);
                return ResponseEntity.ok(Map.of("status", "resubscribed"));
            }
            return ResponseEntity.ok(Map.of("status", "already_subscribed"));
        }

        NewsletterSubscriber s = NewsletterSubscriber.builder()
            .memberId(memberId).email(email).build();
        repo.save(s);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("status", "subscribed"));
    }

    /* ── 공개: 구독 취소 (토큰 기반) ── */
    @GetMapping("/unsubscribe/{token}")
    public ResponseEntity<Map<String, Object>> unsubscribe(@PathVariable String token) {
        Optional<NewsletterSubscriber> found = repo.findByToken(token);
        if (found.isEmpty()) return ResponseEntity.notFound().build();
        NewsletterSubscriber s = found.get();
        s.setUnsubscribedAt(LocalDateTime.now());
        repo.save(s);
        return ResponseEntity.ok(Map.of("status", "unsubscribed"));
    }

    /* ── 인증: 구독자 목록 ── */
    @GetMapping("/subscribers")
    public ResponseEntity<Map<String, Object>> mySubscribers() {
        Long memberId = SecurityUtil.getCurrentMemberId();
        long count = repo.countByMemberIdAndUnsubscribedAtIsNull(memberId);
        List<Map<String, Object>> list = repo
            .findByMemberIdAndUnsubscribedAtIsNullOrderBySubscribedAtDesc(memberId)
            .stream().map(s -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", s.getId()); m.put("email", s.getEmail());
                m.put("subscribedAt", s.getSubscribedAt()); return m;
            }).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("count", count, "subscribers", list));
    }

    /* ── rate limit: 5 req / 60s / IP ── */
    private boolean checkRateLimit(String ip) {
        long now = System.currentTimeMillis();
        rateLimitMap.compute(ip, (k, v) -> {
            if (v == null || now - v[1] > 60_000) return new long[]{1L, now};
            v[0]++; return v;
        });
        return rateLimitMap.get(ip)[0] <= 5;
    }
}
