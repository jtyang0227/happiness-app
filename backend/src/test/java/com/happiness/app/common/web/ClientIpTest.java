package com.happiness.app.common.web;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpTest {

    private MockHttpServletRequest request(String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.9");
        if (forwardedFor != null) request.addHeader("X-Forwarded-For", forwardedFor);
        return request;
    }

    @Test
    void 기본은_XForwardedFor_첫_값이고_없으면_연결_주소() {
        assertThat(ClientIp.resolve(request("203.0.113.7, 198.51.100.1"), null)).isEqualTo("203.0.113.7");
        assertThat(ClientIp.resolve(request(null), null)).isEqualTo("10.0.0.9");
        assertThat(ClientIp.resolve(request("  "), null)).isEqualTo("10.0.0.9");
    }

    @Test
    void 신뢰_헤더가_설정되면_클라이언트가_쓴_XForwardedFor보다_우선한다() {
        MockHttpServletRequest request = request("1.2.3.4");   // 공격자가 바꿔 보내는 값
        request.addHeader("CF-Connecting-IP", "203.0.113.7");
        assertThat(ClientIp.resolve(request, "CF-Connecting-IP")).isEqualTo("203.0.113.7");
    }

    @Test
    void 신뢰_헤더가_요청에_없으면_기본_방식으로_돌아간다() {
        assertThat(ClientIp.resolve(request("203.0.113.7"), "CF-Connecting-IP")).isEqualTo("203.0.113.7");
    }

    @Test
    void 신뢰_프록시_홉을_주면_오른쪽에서_N번째_값을_쓴다() {
        // 클라이언트가 "1.2.3.4"를 써 보내고 Render 프록시가 실제 주소를 덧붙인 경우
        assertThat(ClientIp.resolve(request("1.2.3.4, 203.0.113.7"), null, 1)).isEqualTo("203.0.113.7");
        assertThat(ClientIp.resolve(request("1.2.3.4, 203.0.113.7, 10.1.1.1"), null, 2)).isEqualTo("203.0.113.7");
        assertThat(ClientIp.resolve(request("203.0.113.7"), null, 3)).isEqualTo("203.0.113.7");
        assertThat(ClientIp.parseHops("abc")).isZero();
        assertThat(ClientIp.parseHops(" 1 ")).isEqualTo(1);
    }
}
