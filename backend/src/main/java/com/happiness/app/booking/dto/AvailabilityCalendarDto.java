package com.happiness.app.booking.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class AvailabilityCalendarDto {
    /** 예약 가능한 날짜 목록 (YYYY-MM-DD) */
    private List<String> availableDates;
    /** 이미 예약된 슬롯 맵: date -> List<time> */
    private Map<String, List<String>> bookedSlots;
    /** 예약 가능 시간 슬롯 목록 */
    private List<String> timeSlots;
    /** 예약 안내 메시지 */
    private String bookingNote;
}
