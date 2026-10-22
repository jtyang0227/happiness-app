package com.happiness.app.security.jwt;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 운영에서 공개된 기본 JWT_SECRET으로 서명하지 않는지 (보안 점검 2026-10-22) */
class JwtTokenProviderTest {

    private static JwtTokenProvider provider(String secret, String... profiles) {
        JwtProperties props = new JwtProperties();
        props.setSecret(secret);
        props.setAccessTokenExpiryMs(60_000);
        props.setRefreshTokenExpiryMs(60_000);
        props.setIssuer("test");
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(profiles);
        JwtTokenProvider p = new JwtTokenProvider(props, env);
        p.initKey();
        return p;
    }

    @Test
    void 운영에서_기본_비밀값으로_만든_토큰은_통하지_않는다() {
        // 공격자가 저장소의 기본값으로 서명한 토큰
        String forged = provider(JwtTokenProvider.DEV_DEFAULT_SECRET, "dev").generateAccessToken(1L, "a@b.c", "SA");
        JwtTokenProvider prod = provider(JwtTokenProvider.DEV_DEFAULT_SECRET, "prod");
        assertThatThrownBy(() -> prod.parseToken(forged)).isInstanceOf(Exception.class);
        // 운영 자체 발급 토큰은 정상
        assertThat(prod.parseToken(prod.generateAccessToken(1L, "a@b.c", "USER")).getSubject()).isEqualTo("1");
    }

    @Test
    void 제대로_된_비밀값이면_재시작해도_같은_키() {
        String secret = "x".repeat(64);
        String t = provider(secret, "prod").generateAccessToken(7L, "a@b.c", "USER");
        assertThat(provider(secret, "prod").parseToken(t).getSubject()).isEqualTo("7");
    }
}
