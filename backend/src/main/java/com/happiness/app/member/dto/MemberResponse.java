package com.happiness.app.member.dto;

import com.happiness.app.member.entity.Authority;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.entity.MemberStatus;
import com.happiness.app.privacy.PrivacyMasker;
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

    /**
     * 본인·관리자가 아닌 사람에게 보내는 응답 — 연락처(이메일·전화)를 뺀다.
     * 공개 포트폴리오·남의 회원 조회·회원 검색·팔로워 목록은 화면에서 연락처를 쓰지 않는다(전수 확인).
     * 기획: PLANNING_privacy-protection-app.md (개인정보 최소 노출)
     */
    public MemberResponse withoutContact() {
        this.email = null;
        this.tel = null;
        return this;
    }

    /** 관리자 목록용 — 연락처를 마스킹한다(원문 열람·접속기록은 happiness-admin에서). */
    public MemberResponse maskedContact() {
        this.email = PrivacyMasker.email(this.email);
        this.tel = PrivacyMasker.tel(this.tel);
        return this;
    }
}
