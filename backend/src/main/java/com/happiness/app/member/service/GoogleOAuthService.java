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
public class GoogleOAuthService {

    private final MemberService memberService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${google.client-id:}")
    private String clientId;

    @Value("${google.client-secret:}")
    private String clientSecret;

    @Value("${google.redirect-uri:http://localhost:3000/oauth/google/callback}")
    private String redirectUri;

    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

    public MemberResponse googleLogin(String code) {
        String accessToken = getAccessToken(code);
        return getUserInfo(accessToken);
    }

    private String getAccessToken(String code) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String body = "grant_type=authorization_code"
                + "&client_id=" + clientId
                + "&client_secret=" + clientSecret
                + "&redirect_uri=" + redirectUri
                + "&code=" + code;

        ResponseEntity<String> response = restTemplate.exchange(
                TOKEN_URL, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
        try {
            JsonNode node = objectMapper.readTree(response.getBody());
            return node.get("access_token").asText();
        } catch (Exception e) {
            throw new RuntimeException("구글 토큰 파싱 실패", e);
        }
    }

    private MemberResponse getUserInfo(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        ResponseEntity<String> response = restTemplate.exchange(
                USER_INFO_URL, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        try {
            JsonNode node = objectMapper.readTree(response.getBody());
            String providerId = node.get("id").asText();
            String email = node.has("email") ? node.get("email").asText()
                    : providerId + "@google.user";
            String name = node.has("name") ? node.get("name").asText() : "Google 사용자";
            return memberService.findOrCreateOAuthMember("google", providerId, email, name);
        } catch (Exception e) {
            throw new RuntimeException("구글 사용자 정보 파싱 실패", e);
        }
    }
}
