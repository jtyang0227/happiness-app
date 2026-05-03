package com.happiness.mobileapp.member.controller;

import com.happiness.mobileapp.member.dto.LoginRequest;
import com.happiness.mobileapp.member.dto.MemberResponse;
import com.happiness.mobileapp.member.dto.SignUpRequest;
import com.happiness.mobileapp.member.service.KakaoOAuthService;
import com.happiness.mobileapp.member.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final MemberService memberService;
    private final KakaoOAuthService kakaoOAuthService;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignUpRequest request) {
        try {
            MemberResponse response = memberService.signUp(request);
            Map<String, Object> result = new HashMap<>();
            result.put("status", "success");
            result.put("message", "회원 가입이 완료되었습니다.");
            result.put("data", response);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException e) {
            return errorResponse(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "회원 가입 중 오류가 발생했습니다.");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            MemberResponse response = memberService.login(request);
            Map<String, Object> result = new HashMap<>();
            result.put("status", "success");
            result.put("message", "로그인에 성공했습니다.");
            result.put("data", response);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return errorResponse(HttpStatus.UNAUTHORIZED, e.getMessage());
        } catch (Exception e) {
            return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "로그인 중 오류가 발생했습니다.");
        }
    }

    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam String email) {
        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("available", memberService.isEmailAvailable(email));
        result.put("email", email);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/oauth/kakao")
    public ResponseEntity<?> kakaoOAuth(@RequestParam String code) {
        try {
            MemberResponse response = kakaoOAuthService.kakaoLogin(code);
            Map<String, Object> result = new HashMap<>();
            result.put("status", "success");
            result.put("message", "카카오 로그인에 성공했습니다.");
            result.put("data", response);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "카카오 로그인 처리 중 오류가 발생했습니다.");
        }
    }

    @PostMapping("/oauth/google")
    public ResponseEntity<?> googleOAuth(@RequestParam String idToken) {
        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("message", "Google OAuth2 로그인 준비됨");
        result.put("redirectUrl", "/api/auth/oauth/google/callback");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/oauth/naver")
    public ResponseEntity<?> naverOAuth(@RequestParam String accessToken) {
        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("message", "Naver OAuth2 로그인 준비됨");
        result.put("redirectUrl", "/api/auth/oauth/naver/callback");
        return ResponseEntity.ok(result);
    }

    @GetMapping("/member/{id}")
    public ResponseEntity<?> getMember(@PathVariable Long id) {
        try {
            MemberResponse response = memberService.getMember(id);
            Map<String, Object> result = new HashMap<>();
            result.put("status", "success");
            result.put("data", response);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return errorResponse(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    private ResponseEntity<Map<String, Object>> errorResponse(HttpStatus status, String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("status", "error");
        error.put("message", message);
        return ResponseEntity.status(status).body(error);
    }
}
