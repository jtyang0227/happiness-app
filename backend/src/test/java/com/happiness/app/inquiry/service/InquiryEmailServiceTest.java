package com.happiness.app.inquiry.service;

import com.happiness.app.inquiry.dto.InquiryRequest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class InquiryEmailServiceTest {

    @Test
    void 문의_메일_본문은_보낸_사람이_넣은_HTML을_문자_그대로_보여준다() {
        InquiryRequest req = new InquiryRequest(1L,
                "<b>홍길동</b>", "a@test.com\"><script>alert(1)</script>",
                "인물/프로필", "2026-12-01", "<img src=x onerror=alert(1)>",
                "안녕하세요\n<a href=\"https://evil.example\">여기를 눌러 주세요</a>", null);

        String html = InquiryEmailService.buildHtml(req);

        assertThat(html).doesNotContain("<script>", "<a href", "<img src=x", "<b>홍길동</b>");
        assertThat(html).contains("&lt;b&gt;홍길동&lt;/b&gt;", "&lt;a href=");
        assertThat(html).contains("안녕하세요<br>");          // 줄바꿈만 태그로 바뀐다
        assertThat(html).contains("width:100%;border-collapse");
    }

    @Test
    void 선택_항목이_비어_있으면_줄표로_채운다() {
        InquiryRequest req = new InquiryRequest(1L, "홍길동", "a@test.com", null, null, null, "문의", null);
        assertThat(InquiryEmailService.buildHtml(req)).contains("—");
    }
}
