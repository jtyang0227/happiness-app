package com.happiness.app.security.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    /** application.yml의 개발용 기본값 — 저장소에 공개돼 있어 운영에서 쓰면 누구나 관리자 토큰을 만들 수 있다 */
    static final String DEV_DEFAULT_SECRET = "happiness-app-dev-secret-key-must-be-at-least-256-bits-long-for-hs256";

    private final JwtProperties props;
    private final Environment env;
    private SecretKey key;

    @PostConstruct
    void initKey() {
        String secret = props.getSecret();
        boolean prod = Arrays.asList(env.getActiveProfiles()).contains("prod");
        boolean weak = secret == null || secret.equals(DEV_DEFAULT_SECRET)
                || secret.getBytes(StandardCharsets.UTF_8).length < 32;
        if (prod && weak) {
            // 서버를 멈추는 대신 이번 실행 동안만 쓰는 난수 키로 서명 — 위조는 막히고, 재시작마다 다시 로그인해야 한다
            byte[] random = new byte[64];
            new SecureRandom().nextBytes(random);
            secret = Base64.getEncoder().encodeToString(random);
            log.error("[SECURITY] JWT_SECRET이 비어 있거나 공개된 기본값/32바이트 미만입니다. 임시 난수 키를 사용합니다 — "
                    + "재시작하면 모든 로그인이 풀립니다. Railway Variables에 JWT_SECRET(openssl rand -base64 64)을 설정하세요.");
        }
        key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    private SecretKey signingKey() {
        return key;
    }

    public String generateAccessToken(Long memberId, String email, String role) {
        return buildToken(memberId, email, role, TokenType.ACCESS, props.getAccessTokenExpiryMs());
    }

    public String generateRefreshToken(Long memberId, String email) {
        return buildToken(memberId, email, null, TokenType.REFRESH, props.getRefreshTokenExpiryMs());
    }

    private String buildToken(Long memberId, String email, String role, TokenType type, long expiryMs) {
        Date now = new Date();
        JwtBuilder builder = Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(props.getIssuer())
                .subject(String.valueOf(memberId))
                .claim("email", email)
                .claim("type", type.name())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiryMs))
                .signWith(signingKey());
        if (role != null) builder.claim("role", role);
        return builder.compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isAccessToken(Claims claims) {
        return TokenType.ACCESS.name().equals(claims.get("type", String.class));
    }

    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.debug("JWT expired: {}", e.getMessage());
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("JWT invalid: {}", e.getMessage());
        }
        return false;
    }

    public Long getMemberId(Claims claims) {
        return Long.valueOf(claims.getSubject());
    }

    public String getEmail(Claims claims) {
        return claims.get("email", String.class);
    }

    public String getRole(Claims claims) {
        return claims.get("role", String.class);
    }

    public String getJti(Claims claims) {
        return claims.getId();
    }

    /** 토큰 만료까지 남은 밀리초. 이미 만료된 경우 0 반환 */
    public long getRemainingMs(Claims claims) {
        Date expiration = claims.getExpiration();
        if (expiration == null) return 0;
        long remaining = expiration.getTime() - System.currentTimeMillis();
        return Math.max(0, remaining);
    }
}
