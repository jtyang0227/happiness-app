package com.happiness.app.member.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class LogoutRequest {
    private String deviceId;
    private boolean allDevices = false;
}
