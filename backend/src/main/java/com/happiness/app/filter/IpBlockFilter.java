package com.happiness.app.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happiness.app.exception.ApiResponse;
import com.happiness.app.exception.ErrorCode;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class IpBlockFilter implements Filter {

    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    // 하드코딩 대신 Redis key로 관리
    private static final String BLOCK_KEY_PREFIX = "ipblock:";
    // 메모리 캐시 (Redis 부하 분산: 10초 캐시)
    private final ConcurrentHashMap<String, Long> localCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 10_000;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        String ip = getClientIp(req);

        if (isBlocked(ip)) {
            log.warn("[IP_BLOCK] 차단된 IP 접근 - ip={}, URI={}", ip, req.getRequestURI());
            HttpServletResponse res = (HttpServletResponse) response;
            res.setStatus(HttpServletResponse.SC_FORBIDDEN);
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.setCharacterEncoding(StandardCharsets.UTF_8.name());
            objectMapper.writeValue(res.getWriter(), ApiResponse.fail(ErrorCode.FORBIDDEN));
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean isBlocked(String ip) {
        Long cachedUntil = localCache.get(ip);
        if (cachedUntil != null) {
            if (System.currentTimeMillis() < cachedUntil) {
                return true; // 캐시 히트: 차단
            }
            localCache.remove(ip);
        }
        // Redis 조회
        Boolean blocked = redisTemplate.hasKey(BLOCK_KEY_PREFIX + ip);
        if (Boolean.TRUE.equals(blocked)) {
            localCache.put(ip, System.currentTimeMillis() + CACHE_TTL_MS);
            return true;
        }
        return false;
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        return (ip != null && !ip.isBlank()) ? ip.split(",")[0].trim() : request.getRemoteAddr();
    }
}
