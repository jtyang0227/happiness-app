package com.happiness.app.member.service;

import com.happiness.app.member.entity.Member;
import com.happiness.app.member.entity.MemberStatus;
import com.happiness.app.member.entity.PasswordResetToken;
import com.happiness.app.member.repository.MemberRepository;
import com.happiness.app.member.repository.PasswordResetTokenRepository;
import com.happiness.app.security.token.RefreshTokenStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 아이디(이메일) 찾기 + 비밀번호 재설정. 기획: DESIGN_PROMPTS/planning/PLANNING_account-recovery.md
 * - 재설정 요청은 가입 여부와 무관하게 같은 응답(열거 방지) — 컨트롤러가 항상 같은 메시지를 돌려준다.
 * - 링크 주소는 설정값(app.frontend-url)으로만 만든다 — 요청 Host 헤더를 믿지 않는다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AccountRecoveryService {

    static final int TOKEN_TTL_MINUTES = 30;
    private static final long WINDOW_10_MIN = 600;
    private static final long WINDOW_1_HOUR = 3600;
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy.MM.dd");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final MemberRepository memberRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenStore refreshTokenStore;
    private final Environment environment;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.from:noreply@happiness.app}")
    private String fromAddress;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    // 속도 제한 — 기존 BookingService/NewsletterController와 같은 in-memory 고정 창 방식. key → {count, windowStartEpoch}
    private final ConcurrentHashMap<String, long[]> rateMap = new ConcurrentHashMap<>();

    public record AccountHint(String maskedEmail, String provider, String joinedAt) {}

    // ── 아이디 찾기 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AccountHint> findEmails(String name, String tel, String clientIp) {
        checkRate("find-email:" + clientIp, 5, WINDOW_10_MIN, "아이디 찾기를 너무 많이 시도했습니다. 10분 뒤에 다시 시도해주세요.");
        if (name == null || name.isBlank() || tel == null || tel.isBlank()) {
            throw new IllegalArgumentException("이름과 휴대폰 번호를 입력해주세요.");
        }
        String digits = tel.replaceAll("\\D", "");
        if (!digits.matches("01[0-9]\\d{7,8}")) {
            throw new IllegalArgumentException("올바른 휴대폰 번호 형식이 아닙니다. (예: 010-1234-5678)");
        }
        return memberRepository.findByName(name.trim()).stream()
                .filter(m -> m.getStatus() == MemberStatus.ACTIVE)
                .filter(m -> m.getTel() != null && digits.equals(m.getTel().replaceAll("\\D", "")))
                .map(m -> new AccountHint(
                        maskEmail(m.getEmail()),
                        m.getProvider() == null ? "local" : m.getProvider(),
                        m.getCreatedAt() == null ? null : m.getCreatedAt().format(DATE)))
                .toList();
    }

    // ── 비밀번호 재설정 요청 ────────────────────────────────

    /** 가입 여부를 호출자에게 알리지 않는다 — 반환값 없음, 예외는 입력 형식·속도 제한뿐. */
    public void requestReset(String email, String clientIp) {
        checkRate("reset-ip:" + clientIp, 5, WINDOW_10_MIN, "재설정 요청을 너무 많이 했습니다. 10분 뒤에 다시 시도해주세요.");
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("이메일을 입력해주세요.");
        }
        String normalized = email.trim().toLowerCase();
        // 같은 이메일로 메일 폭탄을 보내지 못하게 — 초과해도 응답은 같게(가입 여부 비노출), 조용히 건너뛴다
        if (!allow("reset-email:" + normalized, 3, WINDOW_1_HOUR)) {
            log.info("[password-reset] per-email limit reached");
            return;
        }
        memberRepository.findByEmail(normalized)
                .filter(m -> m.getStatus() == MemberStatus.ACTIVE)
                .ifPresent(this::issueAndSend);
    }

    private void issueAndSend(Member member) {
        if (member.getPassword() == null) {
            // 소셜 가입 계정 — 재설정할 비밀번호가 없다. 어떤 방식으로 로그인하는지 알려 준다.
            sendMail(member.getEmail(), "[Happiness] 로그인 방법 안내", socialAccountHtml(member));
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        tokenRepository.invalidateActive(member.getId(), now);
        String rawToken = newRawToken();
        tokenRepository.save(PasswordResetToken.builder()
                .memberId(member.getId())
                .tokenHash(sha256(rawToken))
                .expiresAt(now.plusMinutes(TOKEN_TTL_MINUTES))
                .build());
        String link = frontendUrl.replaceAll("/+$", "") + "/reset-password?token=" + rawToken;
        boolean sent = sendMail(member.getEmail(), "[Happiness] 비밀번호 재설정 안내", resetHtml(link));
        if (!sent && environment.acceptsProfiles(Profiles.of("dev"))) {
            // 개발 환경에서만 — 메일 서버 없이 흐름을 확인할 수 있게. 운영 로그에는 토큰을 남기지 않는다.
            log.info("[password-reset][dev] 메일 서버 없음 — 재설정 링크: {}", link);
        }
    }

    // ── 토큰 확인·재설정 ────────────────────────────────────

    @Transactional(readOnly = true)
    public String verify(String rawToken) {
        PasswordResetToken token = usableToken(rawToken);
        return memberRepository.findById(token.getMemberId())
                .map(m -> maskEmail(m.getEmail()))
                .orElseThrow(this::invalidLink);
    }

    public void confirm(String rawToken, String newPassword, String clientIp) {
        checkRate("reset-confirm:" + clientIp, 10, WINDOW_10_MIN, "재설정을 너무 많이 시도했습니다. 10분 뒤에 다시 시도해주세요.");
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("비밀번호는 8자 이상이어야 합니다.");
        }
        PasswordResetToken token = usableToken(rawToken);
        Member member = memberRepository.findById(token.getMemberId()).orElseThrow(this::invalidLink);
        member.setPassword(passwordEncoder.encode(newPassword));
        memberRepository.save(member);
        token.setUsedAt(LocalDateTime.now());
        tokenRepository.save(token);
        refreshTokenStore.deleteAll(member.getId());   // 모든 기기 로그아웃 — 비밀번호가 새 나간 경우 대비
        log.info("[password-reset] memberId={} password changed via reset link", member.getId());
    }

    private PasswordResetToken usableToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank() || rawToken.length() > 100) throw invalidLink();
        return tokenRepository.findByTokenHash(sha256(rawToken))
                .filter(t -> t.isUsable(LocalDateTime.now()))
                .orElseThrow(this::invalidLink);
    }

    private IllegalArgumentException invalidLink() {
        return new IllegalArgumentException("링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 요청해주세요.");
    }

    // ── 도우미 ────────────────────────────────────────────

    /** ja****@gmail.com — 로컬 파트 앞 2자(2자 이하면 1자)만 남긴다. */
    static String maskEmail(String email) {
        if (email == null) return null;
        int at = email.indexOf('@');
        if (at <= 0) return "****";
        String local = email.substring(0, at);
        int keep = local.length() <= 2 ? 1 : 2;
        return local.substring(0, keep) + "*".repeat(Math.max(local.length() - keep, 2)) + email.substring(at);
    }

    private static String newRawToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String sha256(String value) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private boolean allow(String key, int limit, long windowSeconds) {
        long now = System.currentTimeMillis() / 1000;
        long[] state = rateMap.compute(key, (k, v) -> {
            if (v == null || now - v[1] > windowSeconds) return new long[]{1, now};
            v[0]++;
            return v;
        });
        return state[0] <= limit;
    }

    private void checkRate(String key, int limit, long windowSeconds, String message) {
        if (!allow(key, limit, windowSeconds)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, message);
        }
    }

    /** 메일 서버가 없거나 실패하면 false — 요청 자체는 실패시키지 않는다(InquiryEmailService와 같은 정책). */
    private boolean sendMail(String to, String subject, String html) {
        if (mailSender == null || mailHost == null || mailHost.isBlank()) {
            log.warn("[password-reset] 메일 서버 미설정(MAIL_HOST) — 메일을 보내지 못했습니다.");
            return false;
        }
        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            return true;
        } catch (Exception e) {
            log.warn("[password-reset] 메일 발송 실패: {}", e.getMessage());
            return false;
        }
    }

    private String resetHtml(String link) {
        return """
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#ffffff;border:1px solid #E5E8EB;border-radius:16px;color:#191F28;">
              <h2 style="margin:0 0 12px;font-size:20px;">비밀번호 재설정</h2>
              <p style="color:#4E5968;line-height:1.7;margin:0 0 20px;">아래 버튼을 눌러 새 비밀번호를 정해주세요. 링크는 %d분 동안 한 번만 쓸 수 있어요.</p>
              <a href="%s" style="display:inline-block;padding:12px 20px;background:#3182F6;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;">새 비밀번호 정하기</a>
              <p style="color:#8B95A1;font-size:12px;line-height:1.6;margin:20px 0 0;">직접 요청하지 않았다면 이 메일을 무시하세요. 비밀번호는 바뀌지 않습니다.</p>
            </div>
            """.formatted(TOKEN_TTL_MINUTES, link);
    }

    private String socialAccountHtml(Member member) {
        Map<String, String> names = Map.of("kakao", "카카오", "google", "Google", "naver", "네이버", "apple", "Apple");
        String provider = names.getOrDefault(String.valueOf(member.getProvider()), "소셜");
        return """
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#ffffff;border:1px solid #E5E8EB;border-radius:16px;color:#191F28;">
              <h2 style="margin:0 0 12px;font-size:20px;">로그인 방법 안내</h2>
              <p style="color:#4E5968;line-height:1.7;margin:0;">이 이메일은 <b>%s</b> 계정으로 가입되어 있어 따로 정한 비밀번호가 없어요. 로그인 화면에서 <b>%s로 계속하기</b>를 눌러주세요.</p>
              <p style="color:#8B95A1;font-size:12px;line-height:1.6;margin:20px 0 0;">직접 요청하지 않았다면 이 메일을 무시하세요.</p>
            </div>
            """.formatted(provider, provider);
    }
}
