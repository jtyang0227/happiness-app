package com.happiness.app.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happiness.app.exception.ApiResponse;
import com.happiness.app.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class ApiAccessInterceptor implements HandlerInterceptor {

    private final ObjectMapper objectMapper;

    // 허용되지 않는 User-Agent 패턴
    private static final Set<String> BLOCKED_AGENTS = Set.of(
            "sqlmap", "nikto", "nmap", "masscan", "zgrab"
    );

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent != null) {
            String lowerAgent = userAgent.toLowerCase();
            for (String blocked : BLOCKED_AGENTS) {
                if (lowerAgent.contains(blocked)) {
                    log.warn("[SECURITY] 차단된 User-Agent 감지 - agent: {}, IP: {}",
                            userAgent, getClientIp(request));
                    writeError(response, ErrorCode.FORBIDDEN);
                    return false;
                }
            }
        }
        return true;
    }

    private void writeError(HttpServletResponse response, ErrorCode code) throws IOException {
        response.setStatus(code.getHttpStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getWriter(), ApiResponse.fail(code));
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        return (ip != null && !ip.isBlank()) ? ip.split(",")[0].trim() : request.getRemoteAddr();
    }
}
