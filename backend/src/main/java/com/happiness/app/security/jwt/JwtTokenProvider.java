package com.happiness.app.security.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private final JwtProperties props;

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(props.getSecret().getBytes(StandardCharsets.UTF_8));
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
