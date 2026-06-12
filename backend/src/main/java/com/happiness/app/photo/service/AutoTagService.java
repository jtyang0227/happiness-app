package com.happiness.app.photo.service;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 사진 제목·설명·색상 무드를 분석해 태그를 자동 제안하는 서비스.
 * 외부 AI API 없이 키워드 추출 + 무드 매핑 방식으로 구현.
 */
@Service
public class AutoTagService {

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
        "없다", "그", "이", "저", "것", "수", "들",
        "a", "the", "an", "is", "are", "was", "were", "in", "on", "at",
        "to", "for", "of", "and", "or", "it", "this", "that", "with"
    );

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
}
