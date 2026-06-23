package com.happiness.app.delivery.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateDeliveryRequest {
    private String title;
    private String clientName;
    private List<Long> photoIds;
    /** 만료 기간 (일, 1-90) */
    private int expiresInDays;
    /** 선택적 접근 패스워드 */
    private String password;
}
