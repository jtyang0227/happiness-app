package com.happiness.app.booking.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingRequest {
    private LocalDate shootDate;
    private String shootTime;
    private String shootType;
    private String clientName;
    private String clientPhone;
    private String clientEmail;
    private String memo;
}
