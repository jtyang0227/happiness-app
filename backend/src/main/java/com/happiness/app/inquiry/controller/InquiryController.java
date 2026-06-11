package com.happiness.app.inquiry.controller;

import com.happiness.app.inquiry.dto.InquiryRequest;
import com.happiness.app.inquiry.dto.InquiryResponse;
import com.happiness.app.inquiry.entity.Inquiry;
import com.happiness.app.inquiry.repository.InquiryRepository;
import com.happiness.app.inquiry.service.InquiryEmailService;
import com.happiness.app.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/inquiry")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryRepository inquiryRepository;
    private final MemberRepository memberRepository;
    private final InquiryEmailService emailService;

    /** 문의 등록 (공개) */
    @PostMapping
    public ResponseEntity<?> createInquiry(@RequestBody InquiryRequest req) {
        if (req.getSenderName() == null || req.getSenderName().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "보내는 분 이름을 입력해주세요."));
        if (req.getSenderEmail() == null || req.getSenderEmail().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "이메일을 입력해주세요."));
        if (req.getMessage() == null || req.getMessage().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "메시지를 입력해주세요."));
        if (req.getReceiverMemberId() == null)
            return ResponseEntity.badRequest().body(Map.of("message", "receiverMemberId는 필수입니다."));

        Inquiry saved = inquiryRepository.save(Inquiry.builder()
                .receiverMemberId(req.getReceiverMemberId())
                .senderName(req.getSenderName().trim())
                .senderEmail(req.getSenderEmail().trim())
                .shootType(req.getShootType())
                .shootDate(req.getShootDate())
                .budget(req.getBudget())
                .message(req.getMessage().trim())
                .build());

        // 비동기 이메일 발송 (실패해도 문의는 저장됨)
        memberRepository.findById(req.getReceiverMemberId()).ifPresent(m ->
            emailService.sendInquiryNotification(m.getEmail(), req)
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "문의가 성공적으로 접수되었습니다.", "id", saved.getId()));
    }

    /** 내 수신함 목록 (인증 필요) */
    @GetMapping("/inbox")
    public ResponseEntity<List<InquiryResponse>> getInbox(@RequestParam Long memberId) {
        List<InquiryResponse> list = inquiryRepository
                .findByReceiverMemberIdOrderByCreatedAtDesc(memberId)
                .stream()
                .map(InquiryResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    /** 읽지 않은 문의 수 */
    @GetMapping("/inbox/unread-count")
    public ResponseEntity<?> getUnreadCount(@RequestParam Long memberId) {
        long count = inquiryRepository.countByReceiverMemberIdAndIsReadFalse(memberId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /** 읽음 처리 (인증 필요) */
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        return inquiryRepository.findById(id)
                .map(inquiry -> {
                    inquiry.setIsRead(true);
                    inquiryRepository.save(inquiry);
                    return ResponseEntity.ok(Map.of("message", "읽음 처리되었습니다."));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** 문의 삭제 (인증 필요) */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInquiry(@PathVariable Long id) {
        if (!inquiryRepository.existsById(id)) return ResponseEntity.notFound().build();
        inquiryRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
