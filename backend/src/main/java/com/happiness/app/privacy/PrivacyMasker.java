package com.happiness.app.privacy;

/**
 * 연락처 마스킹 — 업무 식별에 필요한 최소한만 남긴다(개인정보 최소 노출).
 * happiness-admin `PrivacyMasker`와 같은 규칙: 두 앱이 같은 회원을 같은 모양으로 보여 준다.
 * 기획: DESIGN_PROMPTS/planning/PLANNING_privacy-protection-app.md
 */
public final class PrivacyMasker {

    private PrivacyMasker() {}

    /** user2@test.com → us***@test.com, a@x.com → a***@x.com */
    public static String email(String email) {
        if (email == null || email.isBlank()) return email;
        int at = email.indexOf('@');
        if (at <= 0) return "***";
        String local = email.substring(0, at);
        return local.substring(0, Math.min(2, local.length())) + "***" + email.substring(at);
    }

    /** 010-1234-0002 → 010-****-0002, 01012340002 → 010****0002 */
    public static String tel(String tel) {
        if (tel == null || tel.isBlank()) return tel;
        String digits = tel.replaceAll("\\D", "");
        if (digits.length() < 7) return "****";
        if (tel.contains("-")) {
            String[] parts = tel.split("-");
            if (parts.length == 3) return parts[0] + "-****-" + parts[2];
        }
        return digits.substring(0, 3) + "****" + digits.substring(digits.length() - 4);
    }
}
