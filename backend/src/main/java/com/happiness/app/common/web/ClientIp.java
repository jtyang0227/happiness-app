package com.happiness.app.common.web;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 요청의 클라이언트 IP를 한 곳에서 구한다 (속도 제한·IP 차단·감사 로그 공용).
 *
 * <p>기본은 예전과 같다: {@code X-Forwarded-For}의 첫 값, 없으면 연결 주소.
 * 다만 첫 값은 클라이언트가 직접 써 보낼 수 있어, 프록시가 값을 이어 붙이는 구성에서는 헤더를 바꿔 가며 IP 기준 속도 제한을
 * 피해 갈 수 있다. 앞단 프록시가 덮어써 주는 헤더가 있으면 환경 변수 {@code APP_CLIENT_IP_HEADER}에 그 이름을 넣는다
 * (Cloudflare 프록시 뒤라면 {@code CF-Connecting-IP}). 그 헤더가 요청에 없으면 기본 방식으로 돌아간다.
 * <b>주의</b>: 앞단이 그 헤더를 덮어쓰지 않는 구성(예: Render 주소로 직접 접속)에서는 클라이언트가 그 헤더도 마음대로 보낼 수 있다.
 *
 * <p>{@code APP_TRUSTED_PROXY_HOPS=N}(1 이상)을 주면 {@code X-Forwarded-For}의 <b>오른쪽에서 N번째</b> 값을 쓴다 — 우리 쪽 프록시가
 * 덧붙인 값이라 클라이언트가 바꿀 수 없다(Render처럼 프록시 한 겹이면 1). 값이 N개보다 적으면 맨 앞 값.
 */
public final class ClientIp {

    private static final String TRUSTED_HEADER = trimToNull(System.getenv("APP_CLIENT_IP_HEADER"));
    private static final int TRUSTED_HOPS = parseHops(System.getenv("APP_TRUSTED_PROXY_HOPS"));

    private ClientIp() {}

    public static String resolve(HttpServletRequest request) {
        return resolve(request, TRUSTED_HEADER, TRUSTED_HOPS);
    }

    static String resolve(HttpServletRequest request, String trustedHeader) {
        return resolve(request, trustedHeader, 0);
    }

    static String resolve(HttpServletRequest request, String trustedHeader, int trustedHops) {
        if (trustedHeader != null) {
            String trusted = trimToNull(request.getHeader(trustedHeader));
            if (trusted != null) return trusted;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] parts = forwarded.split(",");
            if (trustedHops > 0) {
                String v = parts[Math.max(0, parts.length - trustedHops)].trim();
                if (!v.isEmpty()) return v;
            }
            return parts[0].trim();
        }
        return request.getRemoteAddr();
    }

    static int parseHops(String value) {
        try {
            int n = Integer.parseInt(value == null ? "" : value.trim());
            return Math.max(0, Math.min(n, 10));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
