package com.happiness.app.aop;

import com.happiness.app.aop.annotation.AuditLog;
import com.happiness.app.aop.annotation.RequireRole;
import com.happiness.app.audit.service.AuditLogService;
import com.happiness.app.exception.ErrorCode;
import com.happiness.app.exception.SecurityException;
import com.happiness.app.security.auth.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class SecurityAuditAspect {

    private final AuditLogService auditLogService;

    // ── @RequireRole 처리 ─────────────────────────────────────────────
    @Before("@annotation(requireRole)")
    public void checkRole(JoinPoint jp, RequireRole requireRole) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new SecurityException(ErrorCode.UNAUTHORIZED);
        }
        if (!(auth.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new SecurityException(ErrorCode.UNAUTHORIZED);
        }
        String role = userDetails.getRole();
        boolean hasRole = Arrays.stream(requireRole.value()).anyMatch(r -> r.equals(role));
        if (!hasRole) {
            log.warn("[AOP] 권한 부족 - memberId={}, required={}, actual={}",
                    userDetails.getId(), Arrays.toString(requireRole.value()), role);
            throw new SecurityException(ErrorCode.FORBIDDEN);
        }
    }

    // ── @AuditLog 처리 ────────────────────────────────────────────────
    @Around("@annotation(auditLog)")
    public Object auditAction(ProceedingJoinPoint pjp, AuditLog auditLog) throws Throwable {
        MethodSignature sig = (MethodSignature) pjp.getSignature();
        String methodName = sig.getDeclaringType().getSimpleName() + "." + sig.getName();
        String action = auditLog.action().isBlank() ? methodName : auditLog.action();

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long memberId = null;
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails ud) {
            memberId = ud.getId();
        }

        if (auditLog.logArgs()) {
            log.info("[AUDIT] action={} | memberId={} | args={}", action, memberId,
                    Arrays.toString(pjp.getArgs()));
        }

        try {
            Object result = pjp.proceed();
            auditLogService.recordServiceAction(memberId, action, true, null);
            return result;
        } catch (Exception e) {
            auditLogService.recordServiceAction(memberId, action, false, e.getMessage());
            throw e;
        }
    }
}
