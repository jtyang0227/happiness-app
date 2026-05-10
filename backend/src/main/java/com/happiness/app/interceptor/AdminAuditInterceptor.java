package com.happiness.app.interceptor;

import com.happiness.app.audit.service.AuditLogService;
import com.happiness.app.security.auth.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminAuditInterceptor implements HandlerInterceptor {

    private final AuditLogService auditLogService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return true;
        if (!(auth.getPrincipal() instanceof CustomUserDetails userDetails)) return true;

        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_WM") || a.getAuthority().equals("ROLE_SA"));

        if (isAdmin) {
            log.info("[ADMIN_AUDIT] memberId={} | role={} | {} {}",
                    userDetails.getId(), userDetails.getRole(),
                    request.getMethod(), request.getRequestURI());
            auditLogService.recordAdminAction(
                    userDetails.getId(), userDetails.getRole(),
                    request.getMethod(), request.getRequestURI(),
                    getClientIp(request));
        }
        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        return (ip != null && !ip.isBlank()) ? ip.split(",")[0].trim() : request.getRemoteAddr();
    }
}
