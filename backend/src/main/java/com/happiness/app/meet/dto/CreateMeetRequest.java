package com.happiness.app.meet.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreateMeetRequest {
    private Long receiverId;
    private List<String> proposedDates;  // ["2026-07-10", "2026-07-12"]
    private String locationName;
    private String locationAddress;
    private Double locationLat;
    private Double locationLng;
    private String initialMessage;
}
