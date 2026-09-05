package com.happiness.app.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** null 필드는 변경하지 않는다 (부분 업데이트) */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePaymentRequest {
    /** PENDING / RECEIVED */
    private String depositStatus;
    private Integer depositAmount;

    /** PENDING / RECEIVED */
    private String balanceStatus;
    private Integer balanceAmount;
}
