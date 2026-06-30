package com.happiness.app.security.token;

import com.happiness.app.security.jwt.JwtProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class RefreshTokenStore {

    private final StringRedisTemplate redisTemplate;
    private final JwtProperties jwtProperties;

    private static final String PREFIX = "rt:";

    public void save(Long memberId, String deviceId, String token) {
        try {
            redisTemplate.opsForValue().set(
                key(memberId, deviceId),
                token,
                Duration.ofMillis(jwtProperties.getRefreshTokenExpiryMs())
            );
        } catch (Exception e) {
            log.debug("[RT_STORE] Redis 연결 실패, 리프레시 토큰 저장 스킵: {}", e.getMessage());
        }
    }

    public Optional<String> find(Long memberId, String deviceId) {
        try {
            return Optional.ofNullable(redisTemplate.opsForValue().get(key(memberId, deviceId)));
        } catch (Exception e) {
            log.debug("[RT_STORE] Redis 연결 실패, 리프레시 토큰 조회 스킵: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public void delete(Long memberId, String deviceId) {
        try {
            redisTemplate.delete(key(memberId, deviceId));
        } catch (Exception e) {
            log.debug("[RT_STORE] Redis 연결 실패, 리프레시 토큰 삭제 스킵: {}", e.getMessage());
        }
    }

    public void deleteAll(Long memberId) {
        try {
            Set<String> keys = redisTemplate.keys(PREFIX + memberId + ":*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception e) {
            log.debug("[RT_STORE] Redis 연결 실패, 리프레시 토큰 전체 삭제 스킵: {}", e.getMessage());
        }
    }

    public boolean isValid(Long memberId, String deviceId, String token) {
        return find(memberId, deviceId)
            .map(stored -> stored.equals(token))
            .orElse(false);
    }

    private String key(Long memberId, String deviceId) {
        return PREFIX + memberId + ":" + (deviceId != null ? deviceId : "default");
    }
}
