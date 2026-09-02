package com.happiness.app.assistant.controller;

import com.happiness.app.assistant.AssistantException;
import com.happiness.app.assistant.dto.ChatRequest;
import com.happiness.app.assistant.service.AssistantService;
import com.happiness.app.common.SecurityUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@RestController
@RequestMapping("/api/assistant")
@RequiredArgsConstructor
public class AssistantController {

    private final AssistantService assistantService;

    /* rate limit: key → [count, windowStart] */
    private final ConcurrentHashMap<String, long[]> ipRateLimit = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, long[]> memberRateLimit = new ConcurrentHashMap<>();

    /* ── 공개: 포트폴리오 방문객용 챗봇 (IP 기준 10req/min) ── */
    @PostMapping("/chat")
    public ResponseEntity<?> chatPublic(@RequestBody ChatRequest request, HttpServletRequest req) {
        String ip = clientIp(req);
        if (!checkRateLimit(ipRateLimit, ip, 10)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "잠시 후 다시 시도해주세요."));
        }
        try {
            return ResponseEntity.ok(assistantService.chatPublic(request));
        } catch (AssistantException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", e.getMessage()));
        }
    }

    /* ── 인증: 로그인 회원용 앱 사용법 어시스턴트 (회원 기준 20req/min) ── */
    @PostMapping("/chat/workspace")
    public ResponseEntity<?> chatWorkspace(@RequestBody ChatRequest request) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        if (!checkRateLimit(memberRateLimit, memberId, 20)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "잠시 후 다시 시도해주세요."));
        }
        try {
            return ResponseEntity.ok(assistantService.chatWorkspace(request));
        } catch (AssistantException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", e.getMessage()));
        }
    }

    private String clientIp(HttpServletRequest req) {
        return Optional.ofNullable(req.getHeader("X-Forwarded-For"))
                .map(h -> h.split(",")[0].trim())
                .orElse(req.getRemoteAddr());
    }

    private <K> boolean checkRateLimit(ConcurrentHashMap<K, long[]> map, K key, int limit) {
        long now = System.currentTimeMillis();
        map.compute(key, (k, v) -> {
            if (v == null || now - v[1] > 60_000) return new long[]{1L, now};
            v[0]++;
            return v;
        });
        return map.get(key)[0] <= limit;
    }
}
