package com.happiness.app.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Slf4j
@Component
public class LoggingInterceptor implements HandlerInterceptor {

    private static final String START_TIME_ATTR = "reqStartTime";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute(START_TIME_ATTR, System.currentTimeMillis());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String user = (auth != null && auth.isAuthenticated() &&
                       !"anonymousUser".equals(auth.getPrincipal()))
                ? auth.getName() : "ANONYMOUS";

        log.info("[REQUEST] {} {} | user={} | traceId={}",
                request.getMethod(), request.getRequestURI(),
                user, MDC.get("traceId"));
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        Long start = (Long) request.getAttribute(START_TIME_ATTR);
        long elapsed = start != null ? System.currentTimeMillis() - start : -1;
        int status = response.getStatus();

        if (ex != null) {
            log.error("[RESPONSE] {} {} | status={} | elapsed={}ms | error={}",
                    request.getMethod(), request.getRequestURI(), status, elapsed, ex.getMessage());
        } else {
            log.info("[RESPONSE] {} {} | status={} | elapsed={}ms",
                    request.getMethod(), request.getRequestURI(), status, elapsed);
        }
    }
}
