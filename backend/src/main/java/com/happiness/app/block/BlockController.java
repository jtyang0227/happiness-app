package com.happiness.app.block;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.exception.ApiResponse;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 사용자 차단 (/api/blocks, 전부 인증 — SecurityConfig anyRequest).
 * 차단 대상은 항상 로그인 회원 기준으로 저장한다. 숨김은 클라이언트가 이 목록으로 한다
 * (차단은 차단한 사람에게만 적용되는 개인 설정이라 공개 API 응답은 바꾸지 않는다).
 */
@Slf4j
@RestController
@RequestMapping("/api/blocks")
@RequiredArgsConstructor
public class BlockController {

    private final MemberBlockRepository blockRepository;
    private final MemberRepository memberRepository;

    /** 내가 차단한 회원 목록 — [{memberId, name, profileName, avatarUrl, blockedAt}] (연락처 없음) */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> myBlocks() {
        Long me = SecurityUtil.getCurrentMemberId();
        List<MemberBlock> blocks = blockRepository.findByBlockerIdOrderByCreatedAtDesc(me);
        Map<Long, Member> members = memberRepository.findAllById(
                        blocks.stream().map(MemberBlock::getBlockedId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Member::getId, Function.identity()));
        List<Map<String, Object>> result = new ArrayList<>();
        for (MemberBlock b : blocks) {
            Member m = members.get(b.getBlockedId());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("memberId", b.getBlockedId());
            row.put("name", m != null ? m.getName() : "(탈퇴한 회원)");
            row.put("profileName", m != null ? m.getProfileName() : null);
            row.put("avatarUrl", m != null ? m.getAvatarUrl() : null);
            row.put("blockedAt", b.getCreatedAt());
            result.add(row);
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /** 차단 (멱등) */
    @PostMapping("/{memberId}")
    public ResponseEntity<ApiResponse<Void>> block(@PathVariable Long memberId) {
        Long me = SecurityUtil.getCurrentMemberId();
        if (me.equals(memberId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자기 자신은 차단할 수 없습니다.");
        }
        if (!memberRepository.existsById(memberId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다.");
        }
        if (!blockRepository.existsByBlockerIdAndBlockedId(me, memberId)) {
            blockRepository.save(MemberBlock.builder().blockerId(me).blockedId(memberId).build());
            log.info("[ADMIN] 사용자 차단 — blockerId={} blockedId={}", me, memberId);
        }
        return ResponseEntity.ok(ApiResponse.ok());
    }

    /** 차단 해제 (멱등) */
    @DeleteMapping("/{memberId}")
    public ResponseEntity<ApiResponse<Void>> unblock(@PathVariable Long memberId) {
        blockRepository.deleteByBlockerIdAndBlockedId(SecurityUtil.getCurrentMemberId(), memberId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
