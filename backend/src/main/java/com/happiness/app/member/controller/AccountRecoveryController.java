package com.happiness.app.member.controller;

import com.happiness.app.exception.ApiResponse;
import com.happiness.app.member.service.AccountRecoveryService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** 아이디(이메일) 찾기 · 비밀번호 재설정 — 전부 공개(SecurityConfig). 기획: PLANNING_account-recovery.md */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AccountRecoveryController {

    static final String RESET_REQUESTED_MESSAGE =
            "가입된 이메일이면 비밀번호 재설정 메일을 보냈습니다. 메일함(스팸함 포함)을 확인해주세요.";

    private final AccountRecoveryService recoveryService;

    public record FindEmailRequest(String name, String tel) {}
    public record ResetRequest(String email) {}
    public record ResetConfirmRequest(String token, String newPassword) {}

    @PostMapping("/find-email")
    public ResponseEntity<ApiResponse<Map<String, List<AccountRecoveryService.AccountHint>>>> findEmail(
            @RequestBody FindEmailRequest req, HttpServletRequest http) {
        var accounts = recoveryService.findEmails(req.name(), req.tel(), clientIp(http));
        return ResponseEntity.ok(ApiResponse.ok(Map.of("accounts", accounts)));
    }

    /** 가입 여부와 무관하게 항상 같은 응답 — 이메일 열거 방지. */
    @PostMapping("/password-reset/request")
    public ResponseEntity<ApiResponse<Map<String, String>>> requestReset(
            @RequestBody ResetRequest req, HttpServletRequest http) {
        recoveryService.requestReset(req.email(), clientIp(http));
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", RESET_REQUESTED_MESSAGE)));
    }

    @GetMapping("/password-reset/verify")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verify(@RequestParam String token) {
        String maskedEmail = recoveryService.verify(token);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("valid", true, "maskedEmail", maskedEmail)));
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<ApiResponse<Void>> confirm(@RequestBody ResetConfirmRequest req, HttpServletRequest http) {
        recoveryService.confirm(req.token(), req.newPassword(), clientIp(http));
        return ResponseEntity.ok(ApiResponse.ok());
    }

    private static String clientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        return (ip != null && !ip.isBlank()) ? ip.split(",")[0].trim() : request.getRemoteAddr();
    }
}
