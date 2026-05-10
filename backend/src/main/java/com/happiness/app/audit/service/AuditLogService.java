package com.happiness.app.audit.service;

import com.happiness.app.audit.entity.SecurityAuditLog;
import com.happiness.app.audit.repository.SecurityAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final SecurityAuditLogRepository repository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAdminAction(Long memberId, String role, String method,
                                  String uri, String ip) {
        try {
            repository.save(SecurityAuditLog.builder()
                    .memberId(memberId)
                    .role(role)
                    .actionType("ADMIN_API")
                    .actionDetail(method + " " + uri)
                    .ipAddress(ip)
                    .success(true)
                    .build());
        } catch (Exception e) {
            log.error("[AUDIT] 감사 로그 저장 실패", e);
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordServiceAction(Long memberId, String action, boolean success, String error) {
        try {
            repository.save(SecurityAuditLog.builder()
                    .memberId(memberId)
                    .actionType("SERVICE")
                    .actionDetail(action)
                    .success(success)
                    .errorMessage(error)
                    .build());
        } catch (Exception e) {
            log.error("[AUDIT] 서비스 감사 로그 저장 실패", e);
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLoginFailure(String email, String ip) {
        log.warn("[SECURITY] 로그인 실패 - email={}, ip={}", maskEmail(email), ip);
        try {
            repository.save(SecurityAuditLog.builder()
                    .actionType("LOGIN_FAILURE")
                    .actionDetail("email=" + maskEmail(email))
                    .ipAddress(ip)
                    .success(false)
                    .build());
        } catch (Exception e) {
            log.error("[AUDIT] 로그인 실패 로그 저장 실패", e);
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLoginSuccess(Long memberId, String ip) {
        try {
            repository.save(SecurityAuditLog.builder()
                    .memberId(memberId)
                    .actionType("LOGIN_SUCCESS")
                    .actionDetail("ip=" + ip)
                    .ipAddress(ip)
                    .success(true)
                    .build());
        } catch (Exception e) {
            log.error("[AUDIT] 로그인 성공 로그 저장 실패", e);
        }
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@");
        String local = parts[0];
        String masked = local.length() > 2
                ? local.substring(0, 2) + "***"
                : "***";
        return masked + "@" + parts[1];
    }
}
