package com.happiness.app.assistant.service;

import com.happiness.app.assistant.AssistantException;
import com.happiness.app.assistant.dto.ChatMessageDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Google Gemini generateContent REST API 클라이언트.
 * 인증은 x-goog-api-key 헤더로 전달한다(쿼리 파라미터 방식은 access 로그에 키가
 * 남을 수 있어 사용하지 않음).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiClient {

    private static final int MAX_HISTORY_TURNS = 20;
    private static final int MAX_MESSAGE_LENGTH = 2000;
    private static final String FALLBACK_REPLY = "죄송해요, 지금은 답변을 드리기 어려워요. 다시 한번 말씀해주시겠어요?";

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.0-flash}")
    private String model;

    private final WebClient.Builder webClientBuilder;

    public String generate(String systemPrompt, List<ChatMessageDto> history, String userMessage) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new AssistantException("AI 어시스턴트가 아직 설정되지 않았습니다. 관리자에게 문의해주세요.");
        }
        if (userMessage == null || userMessage.isBlank()) {
            throw new AssistantException("메시지를 입력해주세요.");
        }
        if (userMessage.length() > MAX_MESSAGE_LENGTH) {
            throw new AssistantException("메시지가 너무 깁니다. " + MAX_MESSAGE_LENGTH + "자 이내로 입력해주세요.");
        }

        List<Map<String, Object>> contents = new ArrayList<>();
        if (history != null && !history.isEmpty()) {
            List<ChatMessageDto> trimmed = history.size() > MAX_HISTORY_TURNS
                    ? history.subList(history.size() - MAX_HISTORY_TURNS, history.size())
                    : history;
            for (ChatMessageDto turn : trimmed) {
                if (turn.getContent() == null || turn.getContent().isBlank()) continue;
                String role = "model".equals(turn.getRole()) ? "model" : "user";
                contents.add(turn(role, turn.getContent()));
            }
        }
        contents.add(turn("user", userMessage));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("contents", contents);
        body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))));

        WebClient client = webClientBuilder
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .defaultHeader("x-goog-api-key", apiKey)
                .build();

        Map<String, Object> response;
        try {
            response = client.post()
                    .uri("/models/{model}:generateContent", model)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, resp ->
                            resp.bodyToMono(String.class).map(errBody -> {
                                log.error("Gemini API 오류 응답: {}", errBody);
                                return new AssistantException("AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
                            }))
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (AssistantException e) {
            throw e;
        } catch (Exception e) {
            log.error("Gemini API 호출 실패", e);
            throw new AssistantException("AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.", e);
        }

        return extractText(response);
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        try {
            List<Object> candidates = (List<Object>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                return FALLBACK_REPLY;
            }
            Map<String, Object> first = (Map<String, Object>) candidates.get(0);
            Map<String, Object> content = (Map<String, Object>) first.get("content");
            List<Object> parts = content != null ? (List<Object>) content.get("parts") : null;
            if (parts == null || parts.isEmpty()) return FALLBACK_REPLY;
            Map<String, Object> textPart = (Map<String, Object>) parts.get(0);
            Object text = textPart.get("text");
            return text != null ? text.toString() : FALLBACK_REPLY;
        } catch (Exception e) {
            log.error("Gemini 응답 파싱 실패: {}", response, e);
            return FALLBACK_REPLY;
        }
    }

    private Map<String, Object> turn(String role, String text) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("role", role);
        m.put("parts", List.of(Map.of("text", text)));
        return m;
    }
}
