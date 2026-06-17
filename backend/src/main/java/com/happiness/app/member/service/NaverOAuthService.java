package com.happiness.app.member.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.happiness.app.member.dto.MemberResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class NaverOAuthService {

    private final MemberService memberService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${naver.client-id:}")
    private String clientId;

    @Value("${naver.client-secret:}")
    private String clientSecret;

    @Value("${naver.redirect-uri:http://localhost:3000/oauth/naver/callback}")
    private String redirectUri;

    private static final String TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
    private static final String USER_INFO_URL = "https://openapi.naver.com/v1/nid/me";

    public MemberResponse naverLogin(String code, String state) {
        String accessToken = getAccessToken(code, state);
        return getUserInfo(accessToken);
    }

    private String getAccessToken(String code, String state) {
        String url = TOKEN_URL
                + "?grant_type=authorization_code"
                + "&client_id=" + clientId
                + "&client_secret=" + clientSecret
                + "&redirect_uri=" + redirectUri
                + "&code=" + code
                + (state != null && !state.isBlank() ? "&state=" + state : "");

        ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.GET, HttpEntity.EMPTY, String.class);
        try {
            JsonNode node = objectMapper.readTree(response.getBody());
            return node.get("access_token").asText();
        } catch (Exception e) {
            throw new RuntimeException("네이버 토큰 파싱 실패", e);
        }
    }

    private MemberResponse getUserInfo(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        ResponseEntity<String> response = restTemplate.exchange(
                USER_INFO_URL, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode res = root.get("response");
            String providerId = res.get("id").asText();
            String email = res.has("email") ? res.get("email").asText()
                    : providerId + "@naver.user";
            String name = res.has("name") ? res.get("name").asText()
                    : res.has("nickname") ? res.get("nickname").asText() : "네이버 사용자";
            return memberService.findOrCreateOAuthMember("naver", providerId, email, name);
        } catch (Exception e) {
            throw new RuntimeException("네이버 사용자 정보 파싱 실패", e);
        }
    }
}
