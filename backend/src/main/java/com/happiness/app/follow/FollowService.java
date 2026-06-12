package com.happiness.app.follow;

import com.happiness.app.member.dto.MemberResponse;
import com.happiness.app.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FollowService {

    private final FollowRepository followRepository;
    private final MemberRepository memberRepository;

    public void follow(Long followerId, Long followingId) {
        if (followerId.equals(followingId))
            throw new IllegalArgumentException("자기 자신을 팔로우할 수 없습니다.");
        if (followRepository.existsByFollowerIdAndFollowingId(followerId, followingId))
            throw new IllegalArgumentException("이미 팔로우 중입니다.");
        followRepository.save(Follow.builder()
                .followerId(followerId).followingId(followingId).build());
    }

    public void unfollow(Long followerId, Long followingId) {
        followRepository.deleteByFollowerIdAndFollowingId(followerId, followingId);
    }

    @Transactional(readOnly = true)
    public boolean isFollowing(Long followerId, Long followingId) {
        return followRepository.existsByFollowerIdAndFollowingId(followerId, followingId);
    }

    @Transactional(readOnly = true)
    public long getFollowerCount(Long memberId) {
        return followRepository.countByFollowingId(memberId);
    }

    @Transactional(readOnly = true)
    public long getFollowingCount(Long memberId) {
        return followRepository.countByFollowerId(memberId);
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> getFollowers(Long memberId) {
        return followRepository.findByFollowingId(memberId).stream()
                .map(f -> memberRepository.findById(f.getFollowerId()))
                .filter(Optional::isPresent)
                .map(opt -> MemberResponse.fromEntity(opt.get()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> getFollowing(Long memberId) {
        return followRepository.findByFollowerId(memberId).stream()
                .map(f -> memberRepository.findById(f.getFollowingId()))
                .filter(Optional::isPresent)
                .map(opt -> MemberResponse.fromEntity(opt.get()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Long> getFollowingIds(Long memberId) {
        return followRepository.findByFollowerId(memberId).stream()
                .map(Follow::getFollowingId)
                .collect(Collectors.toList());
    }
}
