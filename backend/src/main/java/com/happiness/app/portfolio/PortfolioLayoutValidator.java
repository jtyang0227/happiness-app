package com.happiness.app.portfolio;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * "직접 구성"(BLOCKS) 포트폴리오의 sectionsJson·styleJson 검증·정규화 (PLANNING_portfolio-blocks.md 3-3).
 * 모르는 블록 종류·잘못된 값은 400(작가가 저장됐다고 착각하지 않게), 모르는 설정 키는 버린다(다음 버전 웹과의 호환).
 * 새 블록 종류는 BLOCK_PROPS에 한 줄 추가하고 웹 blocks/blockRegistry.js에도 같은 type을 추가한다.
 */
public final class PortfolioLayoutValidator {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    static final int MAX_RAW_LENGTH = 20_000;
    static final int MAX_BLOCKS = 30;
    private static final Pattern ID = Pattern.compile("[a-z0-9-]{1,24}");
    private static final Pattern HEX = Pattern.compile("#[0-9A-Fa-f]{6}");
    private static final Pattern GENRE = Pattern.compile("[A-Z_]{0,20}");
    private static final Pattern TAG = Pattern.compile("<[^>]*>");

    /** 설정 값 규칙: text(최대 길이) · enum(허용 값) · int(범위) · bool */
    private record Prop(String kind, int min, int max, List<String> options) {
        static Prop text(int max) { return new Prop("text", 0, max, null); }
        static Prop oneOf(String... v) { return new Prop("enum", 0, 0, List.of(v)); }
        static Prop num(int min, int max) { return new Prop("int", min, max, null); }
        static Prop bool() { return new Prop("bool", 0, 0, null); }
        static Prop genre() { return new Prop("genre", 0, 0, null); }
    }

    private static final Map<String, Map<String, Prop>> BLOCK_PROPS = Map.ofEntries(
            Map.entry("hero", Map.of("tagline", Prop.text(80), "align", Prop.oneOf("left", "center"), "showStats", Prop.bool())),
            Map.entry("featuredWork", Map.of("title", Prop.text(40))),
            Map.entry("works", Map.of("title", Prop.text(40), "showFilter", Prop.bool())),
            Map.entry("photos", Map.of("title", Prop.text(40), "columns", Prop.num(2, 4), "limit", Prop.num(3, 60), "genre", Prop.genre())),
            Map.entry("text", Map.of("title", Prop.text(60), "body", Prop.text(2000))),
            Map.entry("quote", Map.of("text", Prop.text(300), "author", Prop.text(40))),
            Map.entry("testimonials", Map.of("title", Prop.text(40))),
            Map.entry("pricing", Map.of()),
            Map.entry("press", Map.of()),
            Map.entry("clients", Map.of()),
            Map.entry("contact", Map.of("title", Prop.text(40), "body", Prop.text(300), "showBooking", Prop.bool())),
            Map.entry("newsletter", Map.of())
    );

    private static final Map<String, Prop> STYLE_PROPS = Map.of(
            "accent", new Prop("hex", 0, 0, null),
            "background", Prop.oneOf("light", "paper", "dark"),
            "spacing", Prop.oneOf("compact", "normal", "airy"),
            "headingFont", Prop.oneOf("sans", "serif")
    );

    private PortfolioLayoutValidator() {}

    /** null·빈 문자열은 "구성 없음"(null)으로 저장한다. */
    public static String normalizeSections(String raw) {
        JsonNode root = parse(raw, "구성");
        if (root == null) return null;
        JsonNode blocks = root.get("blocks");
        if (blocks == null || !blocks.isArray()) throw bad("구성에 블록 목록(blocks)이 없습니다.");
        if (blocks.size() > MAX_BLOCKS) throw bad("블록은 최대 " + MAX_BLOCKS + "개까지 둘 수 있습니다.");

        ObjectNode out = MAPPER.createObjectNode().put("version", 1);
        ArrayNode outBlocks = out.putArray("blocks");
        Set<String> ids = new HashSet<>();
        for (JsonNode b : blocks) {
            String type = b.path("type").asText("");
            Map<String, Prop> spec = BLOCK_PROPS.get(type);
            if (spec == null) throw bad("알 수 없는 블록 종류입니다: " + TAG.matcher(type).replaceAll("").strip());

            String id = b.path("id").asText("");
            if (!ID.matcher(id).matches() || !ids.add(id)) {
                id = UUID.randomUUID().toString().substring(0, 8);
                ids.add(id);
            }
            ObjectNode ob = outBlocks.addObject();
            ob.put("id", id);
            ob.put("type", type);
            ob.put("visible", !b.has("visible") || b.get("visible").asBoolean(true));
            ob.set("props", normalizeProps(b.path("props"), spec));
        }
        return out.toString();
    }

    public static String normalizeStyle(String raw) {
        JsonNode root = parse(raw, "스타일");
        if (root == null) return null;
        ObjectNode out = normalizeProps(root, STYLE_PROPS);
        out.put("version", 1);
        return out.toString();
    }

    private static ObjectNode normalizeProps(JsonNode in, Map<String, Prop> spec) {
        ObjectNode out = MAPPER.createObjectNode();
        if (!in.isObject()) return out;
        spec.forEach((key, p) -> {
            JsonNode v = in.get(key);
            if (v == null || v.isNull()) return;
            switch (p.kind()) {
                case "text" -> {
                    String s = TAG.matcher(v.asText("")).replaceAll("").strip();
                    out.put(key, s.length() > p.max() ? s.substring(0, p.max()) : s);
                }
                case "int" -> out.put(key, Math.max(p.min(), Math.min(p.max(), v.asInt(p.min()))));
                case "bool" -> out.put(key, v.asBoolean(false));
                case "enum" -> {
                    String s = v.asText("");
                    if (!p.options().contains(s)) throw bad("허용되지 않는 설정 값입니다: " + key);
                    out.put(key, s);
                }
                case "hex" -> {
                    String s = v.asText("");
                    if (!HEX.matcher(s).matches()) throw bad("색은 #RRGGBB 형식이어야 합니다.");
                    out.put(key, s.toUpperCase());
                }
                case "genre" -> {
                    String s = v.asText("");
                    if (!GENRE.matcher(s).matches()) throw bad("장르 코드가 올바르지 않습니다.");
                    out.put(key, s);
                }
                default -> { }
            }
        });
        return out;
    }

    private static JsonNode parse(String raw, String what) {
        if (raw == null || raw.isBlank()) return null;
        if (raw.length() > MAX_RAW_LENGTH) throw bad(what + " 내용이 너무 큽니다.");
        try {
            JsonNode node = MAPPER.readTree(raw);
            if (node == null || !node.isObject()) throw bad(what + " 형식이 올바르지 않습니다.");
            return node;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw bad(what + " 형식이 올바르지 않습니다.");
        }
    }

    private static ResponseStatusException bad(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
