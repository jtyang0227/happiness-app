package com.happiness.app.inquiry.service;

import com.happiness.app.inquiry.dto.InquiryRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class InquiryEmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.from:noreply@happiness.app}")
    private String fromAddress;

    public void sendInquiryNotification(String artistEmail, InquiryRequest req) {
        if (mailSender == null || mailHost == null || mailHost.isBlank()
                || artistEmail == null || artistEmail.isBlank()) {
            log.info("Mail not configured or artist email not set — inquiry saved to DB only.");
            return;
        }
        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(artistEmail);
            helper.setSubject("[Happiness] 새 문의가 도착했습니다 — " + req.getSenderName());
            helper.setText(buildHtml(req), true);
            mailSender.send(message);
            log.info("Inquiry notification sent to {}", artistEmail);
        } catch (Exception e) {
            log.warn("Failed to send inquiry email: {}", e.getMessage());
        }
    }

    private String buildHtml(InquiryRequest req) {
        return String.format("""
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:12px;">
              <h2 style="color:#5b6ef5;">✦ 새 촬영 문의</h2>
              <table style="width:100%%border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#666;width:100px;">보내는 분</td><td style="padding:8px 0;font-weight:700;">%s</td></tr>
                <tr><td style="padding:8px 0;color:#666;">이메일</td><td style="padding:8px 0;">%s</td></tr>
                <tr><td style="padding:8px 0;color:#666;">촬영 종류</td><td style="padding:8px 0;">%s</td></tr>
                <tr><td style="padding:8px 0;color:#666;">희망 날짜</td><td style="padding:8px 0;">%s</td></tr>
                <tr><td style="padding:8px 0;color:#666;">예산</td><td style="padding:8px 0;">%s</td></tr>
              </table>
              <div style="margin-top:16px;padding:16px;background:#fff;border-radius:8px;border-left:3px solid #5b6ef5;">
                <p style="color:#333;line-height:1.7;margin:0;">%s</p>
              </div>
              <p style="color:#999;font-size:12px;margin-top:16px;">Happiness 포트폴리오 갤러리에서 발송된 문의입니다.</p>
            </div>
            """,
            req.getSenderName(),
            req.getSenderEmail(),
            req.getShootType() != null ? req.getShootType() : "—",
            req.getShootDate() != null ? req.getShootDate() : "—",
            req.getBudget() != null ? req.getBudget() : "—",
            req.getMessage().replace("\n", "<br>")
        );
    }
}
