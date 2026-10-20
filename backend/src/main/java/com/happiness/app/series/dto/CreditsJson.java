package com.happiness.app.series.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

/** Series.creditsJson ↔ List<CreditDto>. 깨진 JSON은 빈 목록으로 읽는다(화면이 깨지지 않도록). */
public final class CreditsJson {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<CreditDto>> TYPE = new TypeReference<>() {};

    private CreditsJson() {}

    public static List<CreditDto> read(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return MAPPER.readValue(json, TYPE);
        } catch (Exception e) {
            return List.of();
        }
    }

    public static String write(List<CreditDto> credits) {
        try {
            return credits == null || credits.isEmpty() ? null : MAPPER.writeValueAsString(credits);
        } catch (Exception e) {
            throw new IllegalStateException("크레딧 직렬화 실패", e);
        }
    }
}
