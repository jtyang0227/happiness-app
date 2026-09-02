package com.happiness.app.assistant.dto;

import lombok.Data;

import java.util.List;

@Data
public class ChatRequest {
    private String message;
    private List<ChatMessageDto> history;
}
