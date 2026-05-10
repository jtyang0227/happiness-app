package com.happiness.app.security.token;

import com.happiness.app.security.jwt.JwtProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class RefreshTokenStore {

    private final StringRedisTemplate redisTemplate;
    private final JwtProperties jwtProperties;

    private static final String PREFIX = "rt:";

    public void save(Long memberId, String deviceId, String token) {
        redisTemplate.opsForValue().set(
            key(memberId, deviceId),
            token,
            Duration.ofMillis(jwtProperties.getRefreshTokenExpiryMs())
        );
    }

    public Optional<String> find(Long memberId, String deviceId) {
        return Optional.ofNullable(redisTemplate.opsForValue().get(key(memberId, deviceId)));
    }

    public void delete(Long memberId, String deviceId) {
        redisTemplate.delete(key(memberId, deviceId));
    }

    public void deleteAll(Long memberId) {
        Set<String> keys = redisTemplate.keys(PREFIX + memberId + ":*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
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
