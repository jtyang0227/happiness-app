package com.happiness.app.booking.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddBlockedDateRequest {
    private LocalDate date;
    private String reason;
}
