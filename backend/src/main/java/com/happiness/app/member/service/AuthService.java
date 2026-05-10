package com.happiness.app.member.service;

import com.happiness.app.audit.service.AuditLogService;
import com.happiness.app.exception.ErrorCode;
import com.happiness.app.exception.SecurityException;
import com.happiness.app.member.dto.LoginRequest;
import com.happiness.app.member.dto.MemberResponse;
import com.happiness.app.member.dto.RefreshTokenRequest;
import com.happiness.app.member.dto.TokenResponse;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.entity.MemberStatus;
import com.happiness.app.member.repository.MemberRepository;
import com.happiness.app.security.jwt.JwtProperties;
import com.happiness.app.security.jwt.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final MemberRepository memberRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String ip = getClientIp(httpRequest);
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

        String role = member.getAuthority().name();
        String accessToken  = jwtTokenProvider.generateAccessToken(member.getId(), member.getEmail(), role);
        String refreshToken = jwtTokenProvider.generateRefreshToken(member.getId(), member.getEmail());

        auditLogService.recordLoginSuccess(member.getId(), ip);
        log.info("[AUTH] 로그인 성공 - memberId={}, role={}", member.getId(), role);

        return TokenResponse.of(
                accessToken, refreshToken,
                jwtProperties.getAccessTokenExpiryMs(),
                MemberResponse.fromEntity(member));
    }

    @Transactional(readOnly = true)
    public TokenResponse refresh(RefreshTokenRequest request) {
        try {
            Claims claims = jwtTokenProvider.parseToken(request.getRefreshToken());
            if (jwtTokenProvider.isAccessToken(claims)) {
                throw new SecurityException(ErrorCode.INVALID_REFRESH_TOKEN);
            }
            Long memberId = jwtTokenProvider.getMemberId(claims);
            String email  = jwtTokenProvider.getEmail(claims);

            Member member = memberRepository.findById(memberId)
                    .orElseThrow(() -> new SecurityException(ErrorCode.MEMBER_NOT_FOUND));

            String role        = member.getAuthority().name();
            String accessToken = jwtTokenProvider.generateAccessToken(memberId, email, role);
            String newRefresh  = jwtTokenProvider.generateRefreshToken(memberId, email);

            return TokenResponse.of(
                    accessToken, newRefresh,
                    jwtProperties.getAccessTokenExpiryMs(),
                    MemberResponse.fromEntity(member));
        } catch (ExpiredJwtException e) {
            throw new SecurityException(ErrorCode.EXPIRED_TOKEN);
        } catch (JwtException e) {
            throw new SecurityException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        return (ip != null && !ip.isBlank()) ? ip.split(",")[0].trim() : request.getRemoteAddr();
    }
}
