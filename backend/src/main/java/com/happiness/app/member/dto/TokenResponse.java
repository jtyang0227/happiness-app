package com.happiness.app.member.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TokenResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private long expiresIn;
    private MemberResponse member;

    public static TokenResponse of(String accessToken, String refreshToken,
                                   long expiresInMs, MemberResponse member) {
        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(expiresInMs / 1000)
                .member(member)
                .build();
    }
}
