package com.happiness.app.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KakaoTokenResponse {
    private String access_token;
    private String token_type;
    private Long expires_in;
    private String refresh_token;
    private Long refresh_token_expires_in;
}
