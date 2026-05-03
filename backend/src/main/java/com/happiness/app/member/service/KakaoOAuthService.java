package com.happiness.app.member.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happiness.app.member.dto.KakaoTokenResponse;
import com.happiness.app.member.dto.KakaoUserInfo;
import com.happiness.app.member.dto.MemberResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class KakaoOAuthService {

    private final MemberService memberService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${kakao.client-id:}")
    private String clientId;

    @Value("${kakao.client-secret:}")
    private String clientSecret;

    @Value("${kakao.redirect-uri:http://localhost:3000/oauth/callback}")
    private String redirectUri;

    private static final String KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
    private static final String KAKAO_USER_INFO_URL = "https://kapi.kakao.com/v2/user/me";

    public KakaoTokenResponse getAccessToken(String code) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-type", "application/x-www-form-urlencoded;charset=utf-8");

        String body = "grant_type=authorization_code" +
                "&client_id=" + clientId +
                "&redirect_uri=" + redirectUri +
                "&code=" + code +
                "&client_secret=" + clientSecret;

        HttpEntity<String> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.exchange(KAKAO_TOKEN_URL, HttpMethod.POST, request, String.class);

        try {
            return objectMapper.readValue(response.getBody(), KakaoTokenResponse.class);
        } catch (Exception e) {
            throw new RuntimeException("카카오 토큰 파싱 실패", e);
        }
    }

    public KakaoUserInfo getUserInfo(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);
        headers.set("Content-type", "application/x-www-form-urlencoded;charset=utf-8");

        HttpEntity<String> request = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(KAKAO_USER_INFO_URL, HttpMethod.GET, request, String.class);

        try {
            return objectMapper.readValue(response.getBody(), KakaoUserInfo.class);
        } catch (Exception e) {
            throw new RuntimeException("카카오 사용자 정보 파싱 실패", e);
        }
    }

    public MemberResponse kakaoLogin(String code) {
        KakaoTokenResponse tokenResponse = getAccessToken(code);
        KakaoUserInfo userInfo = getUserInfo(tokenResponse.getAccess_token());

        String email = userInfo.getKakaoAccount().getEmail();
        String name = userInfo.getKakaoAccount().getProfile() != null
                ? userInfo.getKakaoAccount().getProfile().getNickname()
                : "카카오 사용자";
        String providerId = String.valueOf(userInfo.getId());

        return memberService.findOrCreateOAuthMember("kakao", providerId, email, name);
    }
}
