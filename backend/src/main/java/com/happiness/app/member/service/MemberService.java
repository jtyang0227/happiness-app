package com.happiness.app.member.service;

import com.happiness.app.inquiry.repository.InquiryRepository;
import com.happiness.app.member.dto.*;
import com.happiness.app.member.entity.Authority;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.entity.MemberStatus;
import com.happiness.app.member.repository.MemberRepository;
import com.happiness.app.photo.repository.*;
import com.happiness.app.series.repository.SeriesPhotoRepository;
import com.happiness.app.series.repository.SeriesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final PhotoRepository photoRepository;
    private final PhotoLikeRepository photoLikeRepository;
    private final PhotoSaveRepository photoSaveRepository;
    private final PhotoShareRepository photoShareRepository;
    private final PhotoTagRepository photoTagRepository;
    private final SeriesPhotoRepository seriesPhotoRepository;
    private final SeriesRepository seriesRepository;
    private final InquiryRepository inquiryRepository;

    // RFC 5322 간략화 이메일 정규식
    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$");

    // 포트폴리오 서브도메인 슬러그: 소문자·숫자·하이픈, 3-30자, 하이픈으로 시작·끝 불가
    private static final Pattern PROFILE_NAME_PATTERN =
        Pattern.compile("^[a-z0-9][a-z0-9\\-]{1,28}[a-z0-9]$|^[a-z0-9]{1,2}$");

    // 인스타그램 아이디: 영문·숫자·점·밑줄, 1-30자
    private static final Pattern INSTAGRAM_PATTERN =
        Pattern.compile("^[a-zA-Z0-9._]{1,30}$");

    public MemberResponse signUp(SignUpRequest request) {
        validateEmail(request.getEmail());
        validatePassword(request.getPassword());

        if (memberRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 등록된 이메일입니다.");
        }
        if (!request.isTermsAgreed()) {
            throw new IllegalArgumentException("이용약관에 동의해야 합니다.");
        }
        if (request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("이름은 필수입니다.");
        }

        String profileName = normalizeProfileName(request.getProfileName());
        if (profileName != null && memberRepository.existsByProfileName(profileName)) {
            throw new IllegalArgumentException("이미 사용 중인 프로필 이름입니다.");
        }

        String instagramId = normalizeInstagramId(request.getInstagramId());

        Member member = Member.builder()
                .email(request.getEmail().trim().toLowerCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName().trim())
                .tel(request.getTel() != null ? request.getTel().trim() : "")
                .profileName(profileName)
                .instagramId(instagramId)
                .status(MemberStatus.ACTIVE)
                .authority(Authority.US)
                .provider("local")
                .build();

        return MemberResponse.fromEntity(memberRepository.save(member));
    }

    public MemberResponse login(LoginRequest request) {
        validateEmail(request.getEmail());

        Member member = memberRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("가입되지 않은 이메일입니다."));

        if (member.getPassword() == null) {
            throw new IllegalArgumentException("소셜 로그인 계정입니다. 카카오로 로그인해주세요.");
        }
        if (!passwordEncoder.matches(request.getPassword(), member.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }
        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new IllegalArgumentException("계정이 비활성화 상태입니다. 고객센터에 문의해주세요.");
        }

        return MemberResponse.fromEntity(member);
    }

    public MemberResponse updateProfile(Long memberId, ProfileUpdateRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        if (request.getName() != null && !request.getName().isBlank()) {
            member.setName(request.getName().trim());
        }
        if (request.getTel() != null) {
            member.setTel(request.getTel().trim());
        }

        String profileName = normalizeProfileName(request.getProfileName());
        if (profileName != null && !profileName.equals(member.getProfileName())) {
            if (memberRepository.existsByProfileName(profileName)) {
                throw new IllegalArgumentException("이미 사용 중인 프로필 이름입니다.");
            }
            member.setProfileName(profileName);
        } else if (request.getProfileName() != null && request.getProfileName().isBlank()) {
            member.setProfileName(null);
        }

        String instagramId = normalizeInstagramId(request.getInstagramId());
        if (request.getInstagramId() != null) {
            member.setInstagramId(instagramId);
        }

        if (request.getAvatarUrl() != null)   member.setAvatarUrl(request.getAvatarUrl().isBlank() ? null : request.getAvatarUrl().trim());
        if (request.getCoverUrl() != null)    member.setCoverUrl(request.getCoverUrl().isBlank() ? null : request.getCoverUrl().trim());
        if (request.getBio() != null)         member.setBio(request.getBio().isBlank() ? null : request.getBio().trim());
        if (request.getWebsiteUrl() != null)  member.setWebsiteUrl(request.getWebsiteUrl().isBlank() ? null : request.getWebsiteUrl().trim());
        if (request.getLocation() != null)    member.setLocation(request.getLocation().isBlank() ? null : request.getLocation().trim());
        if (request.getSpecialties() != null) member.setSpecialties(request.getSpecialties().isBlank() ? null : request.getSpecialties().trim());
        if (request.getPublicProfile() != null)       member.setPublicProfile(request.getPublicProfile());
        if (request.getEmailNotifications() != null)  member.setEmailNotifications(request.getEmailNotifications());
        if (request.getPortfolioLayout() != null)     member.setPortfolioLayout(request.getPortfolioLayout().isBlank() ? null : request.getPortfolioLayout().trim());
        if (request.getPortfolioCoverPhotoId() != null) member.setPortfolioCoverPhotoId(request.getPortfolioCoverPhotoId());

        return MemberResponse.fromEntity(memberRepository.save(member));
    }

    public void deleteAccount(Long memberId) {
        // 1. 멤버 소유 사진 ID 목록 조회
        List<Long> photoIds = photoRepository.findIdsByMemberId(memberId);

        // 2. 멤버 사진에 달린 모든 상호작용 삭제 (다른 유저의 좋아요/저장 포함)
        for (Long photoId : photoIds) {
            photoLikeRepository.deleteByPhotoId(photoId);
            photoSaveRepository.deleteByPhotoId(photoId);
            photoShareRepository.deleteByPhotoId(photoId);
            photoTagRepository.deleteByPhotoId(photoId);
            seriesPhotoRepository.deleteByPhotoId(photoId);
        }

        // 3. 멤버가 다른 사진에 남긴 좋아요/저장 삭제
        photoLikeRepository.deleteByMemberId(memberId);
        photoSaveRepository.deleteByMemberId(memberId);

        // 4. 멤버의 시리즈 삭제
        seriesRepository.findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(memberId)
                .forEach(s -> seriesPhotoRepository.deleteBySeriesId(s.getId()));
        seriesRepository.deleteByMemberId(memberId);

        // 5. 사진, 수신 문의, 멤버 삭제
        photoRepository.deleteByMemberId(memberId);
        inquiryRepository.deleteByReceiverMemberId(memberId);
        memberRepository.deleteById(memberId);
    }

    public void changePassword(Long memberId, String currentPassword, String newPassword) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));
        if (member.getPassword() == null || !passwordEncoder.matches(currentPassword, member.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }
        validatePassword(newPassword);
        member.setPassword(passwordEncoder.encode(newPassword));
        memberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public MemberStatsResponse getMemberStats(Long memberId) {
        return MemberStatsResponse.builder()
                .photoCount(photoRepository.countByMemberId(memberId))
                .totalLikes(photoRepository.sumLikesCountByMemberId(memberId))
                .totalSaves(photoRepository.sumSavesCountByMemberId(memberId))
                .totalShares(photoRepository.sumSharesCountByMemberId(memberId))
                .inquiryCount(inquiryRepository.countByReceiverMemberId(memberId))
                .unreadInquiryCount(inquiryRepository.countByReceiverMemberIdAndIsReadFalse(memberId))
                .build();
    }

    public MemberResponse findOrCreateOAuthMember(String provider, String providerId, String email, String name) {
        Optional<Member> existing = memberRepository.findByProviderAndProviderId(provider, providerId);
        if (existing.isPresent()) return MemberResponse.fromEntity(existing.get());

        Optional<Member> byEmail = memberRepository.findByEmail(email);
        if (byEmail.isPresent()) return MemberResponse.fromEntity(byEmail.get());

        Member newMember = Member.builder()
                .email(email)
                .name(name)
                .tel("")
                .password(null)
                .status(MemberStatus.ACTIVE)
                .authority(Authority.US)
                .provider(provider)
                .providerId(providerId)
                .build();

        return MemberResponse.fromEntity(memberRepository.save(newMember));
    }

    @Transactional(readOnly = true)
    public MemberResponse getMember(Long id) {
        return MemberResponse.fromEntity(memberRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다.")));
    }

    @Transactional(readOnly = true)
    public MemberResponse getMemberByEmail(String email) {
        return MemberResponse.fromEntity(memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다.")));
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> getAllMembers() {
        return memberRepository.findAll().stream()
                .map(MemberResponse::fromEntity)
                .toList();
    }

    public MemberResponse changeMemberRole(Long memberId, String role) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));
        member.setAuthority("ADMIN".equalsIgnoreCase(role) ? Authority.SA : Authority.US);
        return MemberResponse.fromEntity(memberRepository.save(member));
    }

    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String email) {
        if (!EMAIL_PATTERN.matcher(email.trim()).matches()) return false;
        return !memberRepository.existsByEmail(email.trim().toLowerCase());
    }

    @Transactional(readOnly = true)
    public boolean isProfileNameAvailable(String name) {
        String normalized = normalizeProfileName(name);
        if (normalized == null) return false;
        return !memberRepository.existsByProfileName(normalized);
    }

    // ── 내부 검증 헬퍼 ───────────────────────────────────────

    private void validateEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("이메일은 필수입니다.");
        }
        if (!EMAIL_PATTERN.matcher(email.trim()).matches()) {
            throw new IllegalArgumentException("올바른 이메일 형식이 아닙니다. (예: user@example.com)");
        }
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("비밀번호는 8자 이상이어야 합니다.");
        }
    }

    /** profileName을 소문자로 정규화. null이면 null 반환. 형식 위반 시 예외. */
    private String normalizeProfileName(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String name = raw.trim().toLowerCase();
        if (!PROFILE_NAME_PATTERN.matcher(name).matches()) {
            throw new IllegalArgumentException(
                "프로필 이름은 소문자, 숫자, 하이픈만 사용 가능하며 3-30자이어야 합니다. (예: my-portfolio)");
        }
        return name;
    }

    /** instagramId에서 @ 제거 후 정규화. null이면 null 반환. */
    private String normalizeInstagramId(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String id = raw.trim().replaceFirst("^@", "");
        if (!INSTAGRAM_PATTERN.matcher(id).matches()) {
            throw new IllegalArgumentException(
                "인스타그램 아이디는 영문, 숫자, 점, 밑줄만 사용 가능하며 30자 이하이어야 합니다.");
        }
        return id;
    }
}
