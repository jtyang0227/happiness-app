package com.happiness.app.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateChecklistRequest {
    /** [{"id":"uuid","text":"카메라 바디","checked":false}, ...] 형태의 JSON 문자열 */
    private String checklistJson;
    private LocalDate deliveryDeadline;
}
