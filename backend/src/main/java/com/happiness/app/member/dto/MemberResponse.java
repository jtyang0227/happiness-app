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
    private String portfolioLayout;
    private Long portfolioCoverPhotoId;
    private MemberStatus status;
    private Authority authority;
    /** WM/SA → "ADMIN", US → "USER" (프론트엔드 role 체크용) */
    private String role;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MemberResponse fromEntity(Member member) {
        Authority auth = member.getAuthority();
        String role = (auth == Authority.WM || auth == Authority.SA) ? "ADMIN" : "USER";
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
                .portfolioLayout(member.getPortfolioLayout())
                .portfolioCoverPhotoId(member.getPortfolioCoverPhotoId())
                .status(member.getStatus())
                .authority(auth)
                .role(role)
                .createdAt(member.getCreatedAt())
                .updatedAt(member.getUpdatedAt())
                .build();
    }
}
