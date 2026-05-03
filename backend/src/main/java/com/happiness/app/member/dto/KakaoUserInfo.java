package com.happiness.app.member.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KakaoUserInfo {
    private Long id;

    @JsonProperty("kakao_account")
    private KakaoAccount kakaoAccount;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KakaoAccount {
        private Profile profile;
        private String email;
        private String phone_number;
        private String name;

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Profile {
            private String nickname;
            private String profile_image_url;
            private String thumbnail_image_url;
            private Boolean is_default_image;
        }
    }
}
