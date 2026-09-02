package com.happiness.app.assistant.dto;

import lombok.Data;

@Data
public class ChatMessageDto {
    private String role;    // "user" | "model"
    private String content;
}
