package com.happiness.app.config;

import com.happiness.app.filter.JwtAuthenticationFilter;
import com.happiness.app.security.handler.CustomAccessDeniedHandler;
import com.happiness.app.security.handler.CustomAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomAuthenticationEntryPoint authEntryPoint;
    private final CustomAccessDeniedHandler accessDeniedHandler;

    @Value("${cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF: Stateless JWT → 비활성화
            .csrf(AbstractHttpConfigurer::disable)

            // CORS 정책
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Stateless 세션
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // 예외 처리
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authEntryPoint)
                .accessDeniedHandler(accessDeniedHandler))

            // 보안 헤더
            .headers(headers -> headers
                .frameOptions(f -> f.sameOrigin())
                .contentTypeOptions(c -> {})
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
                .referrerPolicy(r -> r.policy(
                    ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .contentSecurityPolicy(csp -> csp.policyDirectives(
                    "default-src 'self'; " +
                    "script-src 'self'; " +
                    "style-src 'self' 'unsafe-inline'; " +
                    "img-src 'self' data: https:; " +
                    "connect-src 'self'; " +
                    "frame-ancestors 'self';")))

            // 인증/인가 규칙
            .authorizeHttpRequests(auth -> auth
                // 공개 엔드포인트
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/signup").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/oauth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/auth/check-email").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/auth/check-profile-name").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/photos").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/photos/{id}").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/portfolio/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/series").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/series/{id}").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/inquiry").permitAll()
                // Delivery Portal — 공개 클라이언트 엔드포인트 (토큰 기반)
                // GET /api/delivery는 인증 필요(목록 조회) — 단일 세그먼트 토큰만 공개
                .requestMatchers(HttpMethod.GET,  "/api/delivery/*").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/delivery/*").permitAll()
                .requestMatchers(HttpMethod.PUT,  "/api/delivery/**").permitAll()
                // Analytics — 이벤트 추적
                .requestMatchers(HttpMethod.POST, "/api/analytics/track").permitAll()
                // Booking — 공개 예약 (인증 필요 엔드포인트를 먼저 명시 — 순서 중요)
                .requestMatchers(HttpMethod.POST, "/api/booking/blocked-dates").authenticated()
                .requestMatchers(HttpMethod.GET,  "/api/booking/*/availability").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/booking/*").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                // 관리자 전용
                .requestMatchers("/api/admin/**").hasAnyRole("WM", "SA")
                // 나머지는 인증 필요
                .anyRequest().authenticated())

            // JWT 필터 등록
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of(
            "Authorization", "Content-Type", "X-Trace-Id", "X-Requested-With", "Accept"));
        config.setExposedHeaders(List.of("X-Trace-Id"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
