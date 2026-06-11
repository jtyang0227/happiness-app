package com.happiness.app.inquiry.dto;

import com.happiness.app.inquiry.entity.Inquiry;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InquiryResponse {
    private Long id;
    private Long receiverMemberId;
    private String senderName;
    private String senderEmail;
    private String shootType;
    private String shootDate;
    private String budget;
    private String message;
    private Boolean isRead;
    private LocalDateTime createdAt;

    public static InquiryResponse fromEntity(Inquiry inquiry) {
        return InquiryResponse.builder()
                .id(inquiry.getId())
                .receiverMemberId(inquiry.getReceiverMemberId())
                .senderName(inquiry.getSenderName())
                .senderEmail(inquiry.getSenderEmail())
                .shootType(inquiry.getShootType())
                .shootDate(inquiry.getShootDate())
                .budget(inquiry.getBudget())
                .message(inquiry.getMessage())
                .isRead(inquiry.getIsRead())
                .createdAt(inquiry.getCreatedAt())
                .build();
    }
}
