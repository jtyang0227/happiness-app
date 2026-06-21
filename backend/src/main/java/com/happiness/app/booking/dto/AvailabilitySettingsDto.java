package com.happiness.app.booking.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilitySettingsDto {
    private String weekdays;
    private String timeSlots;
    private int bufferHours;
    private String bookingNote;
    private boolean isActive;
}
