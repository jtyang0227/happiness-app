package com.happiness.app.member.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfileUpdateRequest {
    private String name;
    private String tel;
    /** 포트폴리오 서브도메인 슬러그 (소문자, 숫자, 하이픈, 3-30자) */
    private String profileName;
    /** 인스타그램 아이디 (@ 제외) */
    private String instagramId;
}
