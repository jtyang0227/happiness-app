package com.happiness.app.member.service;

import com.happiness.app.member.dto.LoginRequest;
import com.happiness.app.member.dto.MemberResponse;
import com.happiness.app.member.dto.SignUpRequest;
import com.happiness.app.member.entity.Authority;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.entity.MemberStatus;
import com.happiness.app.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    public MemberResponse signUp(SignUpRequest request) {
        if (memberRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 등록된 이메일입니다: " + request.getEmail());
        }
        if (!request.isTermsAgreed()) {
            throw new IllegalArgumentException("약관에 동의해야 합니다");
        }

        Member member = Member.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .tel(request.getTel())
                .status(MemberStatus.ACTIVE)
                .authority(Authority.US)
                .provider("local")
                .build();

        return MemberResponse.fromEntity(memberRepository.save(member));
    }

    public MemberResponse login(LoginRequest request) {
        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("가입되지 않은 이메일입니다: " + request.getEmail()));

        if (!passwordEncoder.matches(request.getPassword(), member.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다");
        }
        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new IllegalArgumentException("계정 상태가 활성화되지 않았습니다");
        }

        return MemberResponse.fromEntity(member);
    }

    public MemberResponse findOrCreateOAuthMember(String provider, String providerId, String email, String name) {
        Optional<Member> existing = memberRepository.findByProviderAndProviderId(provider, providerId);
        if (existing.isPresent()) {
            return MemberResponse.fromEntity(existing.get());
        }

        Optional<Member> byEmail = memberRepository.findByEmail(email);
        if (byEmail.isPresent()) {
            return MemberResponse.fromEntity(byEmail.get());
        }

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
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다: " + id));
        return MemberResponse.fromEntity(member);
    }

    @Transactional(readOnly = true)
    public MemberResponse getMemberByEmail(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다: " + email));
        return MemberResponse.fromEntity(member);
    }

    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String email) {
        return !memberRepository.existsByEmail(email);
    }
}
