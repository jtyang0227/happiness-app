package com.happiness.app.member.controller;

import com.happiness.app.exception.ApiResponse;
import com.happiness.app.member.dto.*;
import com.happiness.app.member.service.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final MemberService memberService;
    private final AuthService authService;
    private final KakaoOAuthService kakaoOAuthService;
    private final GoogleOAuthService googleOAuthService;
    private final NaverOAuthService naverOAuthService;
    private final AppleOAuthService appleOAuthService;

    private static final String BEARER_PREFIX = "Bearer ";

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<MemberResponse>> signup(@Valid @RequestBody SignUpRequest request) {
        MemberResponse response = memberService.signUp(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        TokenResponse token = authService.login(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(token));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletRequest httpRequest) {
        TokenResponse token = authService.refresh(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(token));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestBody(required = false) LogoutRequest request,
            HttpServletRequest httpRequest) {
        String bearer = httpRequest.getHeader("Authorization");
        String rawToken = (StringUtils.hasText(bearer) && bearer.startsWith(BEARER_PREFIX))
                ? bearer.substring(BEARER_PREFIX.length()) : null;
        authService.logout(rawToken, request != null ? request : new LogoutRequest(), httpRequest);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @GetMapping("/check-email")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkEmail(@RequestParam String email) {
        boolean available = memberService.isEmailAvailable(email);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("available", available)));
    }

    @GetMapping("/check-profile-name")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkProfileName(@RequestParam String name) {
        boolean available = memberService.isProfileNameAvailable(name);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("available", available)));
    }

    @PutMapping("/member/{id}/profile")
    public ResponseEntity<ApiResponse<MemberResponse>> updateProfile(
            @PathVariable Long id,
            @RequestBody ProfileUpdateRequest request) {
        MemberResponse response = memberService.updateProfile(id, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/member/{id}")
    public ResponseEntity<ApiResponse<MemberResponse>> getMember(@PathVariable Long id) {
        MemberResponse response = memberService.getMember(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/member/{id}/stats")
    public ResponseEntity<ApiResponse<MemberStatsResponse>> getMemberStats(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(memberService.getMemberStats(id)));
    }

    @PutMapping("/member/{id}/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @PathVariable Long id,
            @RequestBody PasswordChangeRequest request) {
        memberService.changePassword(id, request.getCurrentPassword(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @DeleteMapping("/member/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(@PathVariable Long id) {
        memberService.deleteAccount(id);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @GetMapping("/members")
    @PreAuthorize("hasAnyRole('WM', 'SA')")
    public ResponseEntity<ApiResponse<List<MemberResponse>>> getAllMembers() {
        return ResponseEntity.ok(ApiResponse.ok(memberService.getAllMembers()));
    }

    @PutMapping("/member/{id}/role")
    @PreAuthorize("hasAnyRole('WM', 'SA')")
    public ResponseEntity<ApiResponse<MemberResponse>> changeMemberRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String role = body.get("role");
        return ResponseEntity.ok(ApiResponse.ok(memberService.changeMemberRole(id, role)));
    }

    @PostMapping("/oauth/kakao")
    public ResponseEntity<ApiResponse<TokenResponse>> kakaoLogin(
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest) {
        String code = body.get("code");
        MemberResponse member = kakaoOAuthService.kakaoLogin(code);
        TokenResponse token = authService.issueTokensForOAuth(member, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(token));
    }

    @PostMapping("/oauth/google")
    public ResponseEntity<ApiResponse<TokenResponse>> googleLogin(
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest) {
        String code = body.get("code");
        MemberResponse member = googleOAuthService.googleLogin(code);
        TokenResponse token = authService.issueTokensForOAuth(member, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(token));
    }

    @PostMapping("/oauth/naver")
    public ResponseEntity<ApiResponse<TokenResponse>> naverLogin(
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest) {
        String code = body.get("code");
        String state = body.get("state");
        MemberResponse member = naverOAuthService.naverLogin(code, state);
        TokenResponse token = authService.issueTokensForOAuth(member, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(token));
    }

    /** Apple은 form_post로 redirect → 백엔드에서 처리 후 프론트엔드로 리다이렉트 */
    @PostMapping(value = "/oauth/apple/callback", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public void appleCallback(
            @RequestParam(name = "id_token", required = false) String idToken,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String user,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) throws IOException {
        try {
            MemberResponse member = appleOAuthService.appleLogin(idToken, user);
            TokenResponse token = authService.issueTokensForOAuth(member, httpRequest);
            String redirectUrl = appleOAuthService.getFrontendRedirectUri()
                    + "?accessToken=" + URLEncoder.encode(token.getAccessToken(), StandardCharsets.UTF_8)
                    + "&refreshToken=" + URLEncoder.encode(token.getRefreshToken(), StandardCharsets.UTF_8)
                    + "&memberId=" + token.getMember().getId();
            httpResponse.sendRedirect(redirectUrl);
        } catch (Exception e) {
            String errorUrl = appleOAuthService.getFrontendRedirectUri() + "?error=apple_login_failed";
            httpResponse.sendRedirect(errorUrl);
        }
    }
}
