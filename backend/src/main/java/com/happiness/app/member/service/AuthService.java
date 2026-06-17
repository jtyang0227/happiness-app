package com.happiness.app.member.service;

import com.happiness.app.audit.service.AuditLogService;
import com.happiness.app.exception.ErrorCode;
import com.happiness.app.exception.SecurityException;
import com.happiness.app.member.dto.*;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.entity.MemberStatus;
import com.happiness.app.member.repository.MemberRepository;
import com.happiness.app.security.jwt.JwtProperties;
import com.happiness.app.security.jwt.JwtTokenProvider;
import com.happiness.app.security.token.RefreshTokenStore;
import com.happiness.app.security.token.TokenBlacklistService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final MemberRepository memberRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final RefreshTokenStore refreshTokenStore;
    private final TokenBlacklistService tokenBlacklistService;

    private static final String DEVICE_ID_HEADER = "X-Device-Id";
    private static final String DEFAULT_DEVICE = "default";

    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String ip       = getClientIp(httpRequest);
        String deviceId = resolveDeviceId(request.getDeviceId(), httpRequest);

        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    auditLogService.recordLoginFailure(request.getEmail(), ip);
                    return new SecurityException(ErrorCode.LOGIN_FAILED);
                });

        if (!passwordEncoder.matches(request.getPassword(), member.getPassword())) {
            auditLogService.recordLoginFailure(request.getEmail(), ip);
            throw new SecurityException(ErrorCode.LOGIN_FAILED);
        }

        if (MemberStatus.SUSPENDED.equals(member.getStatus())) {
            throw new SecurityException(ErrorCode.ACCOUNT_LOCKED);
        }

        String role         = member.getAuthority().name();
        String accessToken  = jwtTokenProvider.generateAccessToken(member.getId(), member.getEmail(), role);
        String refreshToken = jwtTokenProvider.generateRefreshToken(member.getId(), member.getEmail());

        // Redis에 RefreshToken 저장 (디바이스별)
        refreshTokenStore.save(member.getId(), deviceId, refreshToken);

        auditLogService.recordLoginSuccess(member.getId(), ip);
        log.info("[AUTH] 로그인 성공 - memberId={}, role={}, device={}", member.getId(), role, deviceId);

        return TokenResponse.of(
                accessToken, refreshToken,
                jwtProperties.getAccessTokenExpiryMs(),
                MemberResponse.fromEntity(member));
    }

    @Transactional(readOnly = true)
    public TokenResponse refresh(RefreshTokenRequest request, HttpServletRequest httpRequest) {
        String deviceId = resolveDeviceId(request.getDeviceId(), httpRequest);
        try {
            Claims claims = jwtTokenProvider.parseToken(request.getRefreshToken());
            if (jwtTokenProvider.isAccessToken(claims)) {
                throw new SecurityException(ErrorCode.INVALID_REFRESH_TOKEN);
            }

            Long   memberId = jwtTokenProvider.getMemberId(claims);
            String email    = jwtTokenProvider.getEmail(claims);

            // Redis에 저장된 RefreshToken과 비교 (Rotation 검증)
            if (!refreshTokenStore.isValid(memberId, deviceId, request.getRefreshToken())) {
                log.warn("[AUTH] RefreshToken 불일치 - memberId={}, device={}", memberId, deviceId);
                throw new SecurityException(ErrorCode.INVALID_REFRESH_TOKEN);
            }

            Member member = memberRepository.findById(memberId)
                    .orElseThrow(() -> new SecurityException(ErrorCode.MEMBER_NOT_FOUND));

            String role       = member.getAuthority().name();
            String newAccess  = jwtTokenProvider.generateAccessToken(memberId, email, role);
            String newRefresh = jwtTokenProvider.generateRefreshToken(memberId, email);

            // Refresh Token Rotation: 기존 삭제 → 새 토큰 저장
            refreshTokenStore.save(memberId, deviceId, newRefresh);

            log.info("[AUTH] 토큰 재발급 - memberId={}, device={}", memberId, deviceId);

            return TokenResponse.of(
                    newAccess, newRefresh,
                    jwtProperties.getAccessTokenExpiryMs(),
                    MemberResponse.fromEntity(member));
        } catch (ExpiredJwtException e) {
            throw new SecurityException(ErrorCode.EXPIRED_TOKEN);
        } catch (SecurityException e) {
            throw e;
        } catch (JwtException e) {
            throw new SecurityException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
    }

    public void logout(String rawAccessToken, LogoutRequest request, HttpServletRequest httpRequest) {
        String deviceId = resolveDeviceId(request.getDeviceId(), httpRequest);

        // AccessToken 블랙리스트 등록
        if (StringUtils.hasText(rawAccessToken)) {
            try {
                Claims claims = jwtTokenProvider.parseToken(rawAccessToken);
                String jti = jwtTokenProvider.getJti(claims);
                long remainingMs = jwtTokenProvider.getRemainingMs(claims);
                tokenBlacklistService.blacklist(jti, remainingMs);
            } catch (ExpiredJwtException e) {
                // 이미 만료된 토큰 - 블랙리스트 불필요
            } catch (JwtException e) {
                log.debug("[LOGOUT] 토큰 파싱 실패 (무시): {}", e.getMessage());
            }
        }

        // RefreshToken 삭제 (단일 디바이스 또는 전체)
        try {
            Claims claims = jwtTokenProvider.parseToken(rawAccessToken != null ? rawAccessToken : "");
            Long memberId = jwtTokenProvider.getMemberId(claims);
            if (request.isAllDevices()) {
                refreshTokenStore.deleteAll(memberId);
                log.info("[AUTH] 전체 디바이스 로그아웃 - memberId={}", memberId);
            } else {
                refreshTokenStore.delete(memberId, deviceId);
                log.info("[AUTH] 로그아웃 - memberId={}, device={}", memberId, deviceId);
            }
        } catch (Exception e) {
            log.debug("[LOGOUT] RefreshToken 삭제 실패 (무시): {}", e.getMessage());
        }
    }

    public TokenResponse issueTokensForOAuth(MemberResponse memberResponse, HttpServletRequest httpRequest) {
        String deviceId = resolveDeviceId(null, httpRequest);
        String role = memberResponse.getAuthority().name();
        String accessToken = jwtTokenProvider.generateAccessToken(
                memberResponse.getId(), memberResponse.getEmail(), role);
        String refreshToken = jwtTokenProvider.generateRefreshToken(
                memberResponse.getId(), memberResponse.getEmail());
        refreshTokenStore.save(memberResponse.getId(), deviceId, refreshToken);
        return TokenResponse.of(accessToken, refreshToken,
                jwtProperties.getAccessTokenExpiryMs(), memberResponse);
    }

    private String resolveDeviceId(String fromRequest, HttpServletRequest httpRequest) {
        if (StringUtils.hasText(fromRequest)) return fromRequest;
        String fromHeader = httpRequest.getHeader(DEVICE_ID_HEADER);
        return StringUtils.hasText(fromHeader) ? fromHeader : DEFAULT_DEVICE;
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        return (ip != null && !ip.isBlank()) ? ip.split(",")[0].trim() : request.getRemoteAddr();
    }
}
