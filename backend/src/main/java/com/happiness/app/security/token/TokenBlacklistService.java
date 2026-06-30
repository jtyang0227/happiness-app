package com.happiness.app.security.token;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private final StringRedisTemplate redisTemplate;
    private static final String PREFIX = "bl:";

    public void blacklist(String jti, long remainingMs) {
        if (remainingMs <= 0) return;
        redisTemplate.opsForValue().set(
            PREFIX + jti,
            "1",
            Duration.ofMillis(remainingMs)
        );
        log.debug("[BLACKLIST] 토큰 블랙리스트 등록 - jti={}, ttl={}ms", jti, remainingMs);
    }

    public boolean isBlacklisted(String jti) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(PREFIX + jti));
        } catch (Exception e) {
            log.debug("[BLACKLIST] Redis 연결 실패, 블랙리스트 검사 스킵: {}", e.getMessage());
            return false;
        }
    }
}
