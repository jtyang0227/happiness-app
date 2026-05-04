package com.happiness.app.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignUpRequest {
    private String email;
    private String password;
    private String name;
    private String tel;
    /** 포트폴리오 서브도메인 슬러그 (선택) */
    private String profileName;
    /** 인스타그램 아이디 @ 제외 (선택) */
    private String instagramId;
    private boolean termsAgreed;
    private boolean privacyAgreed;
    private boolean marketingAgreed;
}
