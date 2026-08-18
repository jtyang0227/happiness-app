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
        // Redis 장애 시에는 다른 컴포넌트(IpBlockFilter 등)와 동일하게 허용 통과(fail-open)한다.
        // find()가 Redis 연결 실패든 "저장된 토큰 없음"이든 모두 Optional.empty()로 뜻개서
        // 반환하기 때문에 isValid()가 이를 그대로 쓰면 Redis가 죽었을 때 정상 리프레시 토큰까지
        // "불일치"로 거부해 로그인 세션이 통채로 끓긴다 — 여기서는 두 경우를 구분해서 처리한다.
        try {
            String stored = redisTemplate.opsForValue().get(key(memberId, deviceId));
            return token.equals(stored);
        } catch (Exception e) {
            log.debug("[RT_STORE] Redis 연결 실패, 리프레시 토큰 검증 스킵(fail-open): {}", e.getMessage());
            return true;
        }
    }

    private String key(Long memberId, String deviceId) {
        return PREFIX + memberId + ":" + (deviceId != null ? deviceId : "default");
    }
}
