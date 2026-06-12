package com.happiness.app.member.dto;

import com.happiness.app.member.entity.Authority;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.entity.MemberStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberResponse {
    private Long id;
    private String email;
    private String name;
    private String tel;
    private String profileName;
    private String instagramId;
    private String avatarUrl;
    private String coverUrl;
    private String bio;
    private String websiteUrl;
    private String location;
    private String specialties;
    private String provider;
    private boolean publicProfile;
    private boolean emailNotifications;
    private MemberStatus status;
    private Authority authority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MemberResponse fromEntity(Member member) {
        return MemberResponse.builder()
                .id(member.getId())
                .email(member.getEmail())
                .name(member.getName())
                .tel(member.getTel())
                .profileName(member.getProfileName())
                .instagramId(member.getInstagramId())
                .avatarUrl(member.getAvatarUrl())
                .coverUrl(member.getCoverUrl())
                .bio(member.getBio())
                .websiteUrl(member.getWebsiteUrl())
                .location(member.getLocation())
                .specialties(member.getSpecialties())
                .provider(member.getProvider())
                .publicProfile(member.isPublicProfile())
                .emailNotifications(member.isEmailNotifications())
                .status(member.getStatus())
                .authority(member.getAuthority())
                .createdAt(member.getCreatedAt())
                .updatedAt(member.getUpdatedAt())
                .build();
    }
}
