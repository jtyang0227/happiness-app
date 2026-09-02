package com.happiness.app.assistant;

/**
 * 사용자에게 그대로 노출해도 되는 안전한 메시지를 담는 예외.
 * (설정 누락, 입력값 오류, Gemini 업스트림 오류 등)
 */
public class AssistantException extends RuntimeException {
    public AssistantException(String message) {
        super(message);
    }

    public AssistantException(String message, Throwable cause) {
        super(message, cause);
    }
}
