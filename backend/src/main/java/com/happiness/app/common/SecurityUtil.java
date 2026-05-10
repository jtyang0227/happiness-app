package com.happiness.app.common;

import com.happiness.app.exception.ErrorCode;
import com.happiness.app.exception.SecurityException;
import com.happiness.app.security.auth.CustomUserDetails;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SecurityUtil {

    public static Long getCurrentMemberId() {
        return getCurrentUserDetails().getId();
    }

    public static String getCurrentMemberEmail() {
        return getCurrentUserDetails().getEmail();
    }

    public static String getCurrentMemberRole() {
        return getCurrentUserDetails().getRole();
    }

    public static boolean isAdmin() {
        String role = getCurrentUserDetails().getRole();
        return "WM".equals(role) || "SA".equals(role);
    }

    public static boolean isAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() &&
               !"anonymousUser".equals(auth.getPrincipal());
    }

    private static CustomUserDetails getCurrentUserDetails() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() ||
            !(auth.getPrincipal() instanceof CustomUserDetails)) {
            throw new SecurityException(ErrorCode.UNAUTHORIZED);
        }
        return (CustomUserDetails) auth.getPrincipal();
    }
}
