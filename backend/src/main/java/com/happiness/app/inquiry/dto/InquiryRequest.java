package com.happiness.app.inquiry.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InquiryRequest {
    private Long receiverMemberId;
    private String senderName;
    private String senderEmail;
    private String shootType;
    private String shootDate;
    private String budget;
    private String message;
}
