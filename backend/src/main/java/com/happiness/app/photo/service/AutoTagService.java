package com.happiness.app.photo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AutoTagService {

    @Value("${google.vision.api-key:}")
    private String visionApiKey;

    private static final Map<String, List<String>> MOOD_TAGS = Map.ofEntries(
        Map.entry("WARM",       List.of("따뜻한", "황금빛", "노을", "여름", "일몰")),
        Map.entry("COOL",       List.of("청량한", "시원한", "겨울", "블루", "새벽")),
        Map.entry("NATURAL",    List.of("자연", "초록", "숲", "자연광", "맑은")),
        Map.entry("VIBRANT",    List.of("활기찬", "생동감", "컬러풀", "선명한")),
        Map.entry("MUTED",      List.of("차분한", "파스텔", "소프트", "은은한")),
        Map.entry("ROMANTIC",   List.of("로맨틱", "핑크", "감성", "봄", "따뜻한")),
        Map.entry("DRAMATIC",   List.of("강렬한", "대비", "어두운", "무거운")),
        Map.entry("ENERGETIC",  List.of("역동적인", "생동감", "선명한", "스포티")),
        Map.entry("SERENE",     List.of("고요한", "평화로운", "미니멀", "여백")),
        Map.entry("CLEAN",      List.of("깔끔한", "화이트", "밝은", "심플")),
        Map.entry("MONOCHROME", List.of("흑백", "모노크롬", "클래식", "필름"))
    );

    private static final Set<String> STOP_WORDS = Set.of(
        "의", "가", "이", "은", "는", "을", "를", "에", "에서", "로", "으로",
        "과", "와", "도", "만", "까지", "부터", "한", "하다", "이다", "있다",
        "없다", "그", "저", "것", "수", "들",
        "a", "the", "an", "is", "are", "was", "were", "in", "on", "at",
        "to", "for", "of", "and", "or", "it", "this", "that", "with"
    );

    private static final Map<String, String> GENRE_KEYWORDS = Map.ofEntries(
        Map.entry("인물", "PORTRAIT"),   Map.entry("portrait", "PORTRAIT"),
        Map.entry("사람", "PORTRAIT"),   Map.entry("얼굴", "PORTRAIT"),   Map.entry("모델", "PORTRAIT"),
        Map.entry("웨딩", "WEDDING"),    Map.entry("wedding", "WEDDING"),
        Map.entry("결혼", "WEDDING"),    Map.entry("신부", "WEDDING"),    Map.entry("신랑", "WEDDING"),
        Map.entry("풍경", "LANDSCAPE"),  Map.entry("landscape", "LANDSCAPE"),
        Map.entry("산", "LANDSCAPE"),    Map.entry("바다", "LANDSCAPE"),  Map.entry("하늘", "LANDSCAPE"),
        Map.entry("꽃", "NATURE"),       Map.entry("나무", "NATURE"),     Map.entry("동물", "NATURE"),
        Map.entry("자연", "NATURE"),     Map.entry("식물", "NATURE"),
        Map.entry("거리", "STREET"),     Map.entry("street", "STREET"),   Map.entry("도시", "STREET"),
        Map.entry("건물", "ARCHITECTURE"), Map.entry("건축", "ARCHITECTURE"), Map.entry("architecture", "ARCHITECTURE"),
        Map.entry("음식", "FOOD"),       Map.entry("카페", "FOOD"),       Map.entry("커피", "FOOD"),     Map.entry("식당", "FOOD"),
        Map.entry("여행", "TRAVEL"),     Map.entry("travel", "TRAVEL"),
        Map.entry("패션", "FASHION"),    Map.entry("fashion", "FASHION"), Map.entry("의상", "FASHION"),  Map.entry("스타일", "FASHION"),
        Map.entry("일상", "LIFESTYLE"),  Map.entry("라이프", "LIFESTYLE"), Map.entry("감성", "LIFESTYLE"),
        Map.entry("제품", "COMMERCIAL"), Map.entry("브랜드", "COMMERCIAL"), Map.entry("광고", "COMMERCIAL"),
        Map.entry("추상", "FINE_ART"),   Map.entry("예술", "FINE_ART"),   Map.entry("아트", "FINE_ART")
    );

    public String suggestGenre(String title, String description) {
        String combined = ((title != null ? title : "") + " " + (description != null ? description : "")).toLowerCase();
        return GENRE_KEYWORDS.entrySet().stream()
            .filter(e -> combined.contains(e.getKey()))
            .map(Map.Entry::getValue)
            .findFirst()
            .orElse(null);
    }

    public List<String> suggest(String title, String description, String colorMood) {
        Set<String> result = new LinkedHashSet<>();

        // 1. 제목·설명에서 키워드 추출
        String text = (title != null ? title : "") + " " + (description != null ? description : "");
        for (String token : text.split("[\\s,.!?;:()/\\[\\]]+")) {
            String w = token.trim();
            if (w.length() >= 2 && !STOP_WORDS.contains(w.toLowerCase())) {
                result.add(w);
            }
            if (result.size() >= 6) break;
        }

        // 2. 색상 무드 기반 태그 추가
        if (colorMood != null) {
            List<String> moodTags = MOOD_TAGS.get(colorMood.toUpperCase());
            if (moodTags != null) moodTags.forEach(result::add);
        }

        return result.stream().limit(10).collect(Collectors.toList());
    }

    /**
     * Google Vision API로 이미지 URL을 분석해 라벨 태그를 반환한다.
     * API 키가 없거나 호출 실패 시 빈 리스트를 반환 (기존 suggest()로 fallback).
     */
    public List<String> analyzeWithVision(String imageUrl) {
        if (visionApiKey == null || visionApiKey.isBlank() || imageUrl == null || imageUrl.isBlank()) {
            return List.of();
        }
        try {
            var client = WebClient.create("https://vision.googleapis.com");
            var body = Map.of(
                "requests", List.of(Map.of(
                    "image", Map.of("source", Map.of("imageUri", imageUrl)),
                    "features", List.of(
                        Map.of("type", "LABEL_DETECTION", "maxResults", 8),
                        Map.of("type", "IMAGE_PROPERTIES", "maxResults", 3)
                    )
                ))
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> response = client.post()
                .uri("/v1/images:annotate?key=" + visionApiKey)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

            if (response == null) return List.of();

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> responses = (List<Map<String, Object>>) response.get("responses");
            if (responses == null || responses.isEmpty()) return List.of();

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> labels = (List<Map<String, Object>>) responses.get(0).get("labelAnnotations");
            if (labels == null) return List.of();

            return labels.stream()
                .filter(l -> {
                    Object score = l.get("score");
                    return score instanceof Number n && n.doubleValue() >= 0.75;
                })
                .map(l -> (String) l.get("description"))
                .filter(Objects::nonNull)
                .limit(8)
                .collect(Collectors.toList());

        } catch (Exception e) {
            return List.of();
        }
    }

    /**
     * Vision API 결과 + 기존 키워드 추출을 합산해 최종 태그 목록을 반환한다.
     */
    public List<String> suggestWithVision(String title, String description, String colorMood, String imageUrl) {
        Set<String> result = new LinkedHashSet<>();

        // Vision API 라벨 (API 키 있을 때)
        List<String> visionTags = analyzeWithVision(imageUrl);
        result.addAll(visionTags);

        // 기존 키워드 + 무드 태그
        result.addAll(suggest(title, description, colorMood));

        return result.stream().limit(10).collect(Collectors.toList());
    }
}
