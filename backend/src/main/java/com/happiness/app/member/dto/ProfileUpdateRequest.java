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
    private String profileName;
    private String instagramId;
    private String avatarUrl;
    private String coverUrl;
    private String bio;
    private String websiteUrl;
    private String location;
    /** 촬영 전문 분야 — 콤마 구분 (예: "결혼식,인물,풍경") */
    private String specialties;
    private Boolean publicProfile;
    private Boolean emailNotifications;
}
