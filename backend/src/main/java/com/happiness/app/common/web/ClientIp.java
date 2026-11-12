package com.happiness.app.common.web;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 요청의 클라이언트 IP를 한 곳에서 구한다 (속도 제한·IP 차단·감사 로그 공용).
 *
 * <p>기본은 예전과 같다: {@code X-Forwarded-For}의 첫 값, 없으면 연결 주소.
 * 다만 첫 값은 클라이언트가 직접 써 보낼 수 있어, 프록시가 값을 이어 붙이는 구성에서는 헤더를 바꿔 가며 IP 기준 속도 제한을
 * 피해 갈 수 있다. 앞단 프록시가 덮어써 주는 헤더가 있으면 환경 변수 {@code APP_CLIENT_IP_HEADER}에 그 이름을 넣는다
 * (Cloudflare 프록시 뒤라면 {@code CF-Connecting-IP}). 그 헤더가 요청에 없으면 기본 방식으로 돌아간다.
 */
public final class ClientIp {

    private static final String TRUSTED_HEADER = trimToNull(System.getenv("APP_CLIENT_IP_HEADER"));

    private ClientIp() {}

    public static String resolve(HttpServletRequest request) {
        return resolve(request, TRUSTED_HEADER);
    }

    static String resolve(HttpServletRequest request, String trustedHeader) {
        if (trustedHeader != null) {
            String trusted = trimToNull(request.getHeader(trustedHeader));
            if (trusted != null) return trusted;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
