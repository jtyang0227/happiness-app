package com.happiness.app.member.controller;

import com.happiness.app.exception.ApiResponse;
import com.happiness.app.member.dto.*;
import com.happiness.app.member.service.AuthService;
import com.happiness.app.member.service.KakaoOAuthService;
import com.happiness.app.member.service.MemberService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final MemberService memberService;
    private final AuthService authService;
    private final KakaoOAuthService kakaoOAuthService;

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

    @PostMapping("/oauth/kakao")
    public ResponseEntity<ApiResponse<MemberResponse>> kakaoLogin(
            @RequestBody Map<String, String> body) {
        String code = body.get("code");
        MemberResponse member = kakaoOAuthService.kakaoLogin(code);
        return ResponseEntity.ok(ApiResponse.ok(member));
    }
}
