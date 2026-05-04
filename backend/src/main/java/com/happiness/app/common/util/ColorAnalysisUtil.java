package com.happiness.app.common.util;

import java.awt.image.BufferedImage;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * 색체학(Color Theory) 기반 이미지 분위기 분석 유틸리티.
 *
 * 알고리즘:
 *  1. 픽셀 샘플링 → 4-bit 채널 버케팅으로 팔레트 추출 (4096 버킷)
 *  2. 주요 색상을 RGB → HSL 변환
 *  3. HSL 값으로 색체학 무드(ColorMood) 분류
 *
 * 무드 분류 기준 (색체학 / Color Psychology):
 *  WARM      - 붉은 계열, 따뜻함·열정 (Hue 0-30°, 330-360°)
 *  ENERGETIC - 주황·노랑 계열, 에너지·활기 (Hue 30-70°)
 *  NATURAL   - 초록 계열, 자연·신선함 (Hue 70-160°)
 *  COOL      - 청록·파랑 계열, 시원함·차분함 (Hue 160-220°)
 *  SERENE    - 남색·보라 계열, 평온·고요함 (Hue 220-270°)
 *  ROMANTIC  - 보라·분홍 계열, 로맨틱·신비 (Hue 270-330°)
 *  VIBRANT   - 채도 높음, 생동감·강렬함
 *  MUTED     - 채도 낮음, 차분·정제됨
 *  DRAMATIC  - 명도 낮음, 극적·어둠
 *  CLEAN     - 명도 높음, 청결·순수
 *  MONOCHROME- 무채색, 미니멀·단색
 */
public class ColorAnalysisUtil {

    public record ColorAnalysisResult(
        String dominantColor,
        String colorMood,
        String colorPalette
    ) {}

    public static ColorAnalysisResult analyze(BufferedImage image) {
        if (image == null) return fallback();

        List<int[]> palette = extractPalette(image);
        if (palette.isEmpty()) return fallback();

        int[] dominant = palette.get(0);
        String paletteJson = palette.stream()
            .map(ColorAnalysisUtil::toHex)
            .map(h -> "\"" + h + "\"")
            .collect(Collectors.joining(",", "[", "]"));

        return new ColorAnalysisResult(toHex(dominant), classifyMood(dominant), paletteJson);
    }

    /**
     * 4-bit 채널 버케팅으로 상위 5개 주요 색상 추출.
     * 16^3 = 4096 버킷에 픽셀을 분류, 빈도순 정렬.
     */
    private static List<int[]> extractPalette(BufferedImage img) {
        int w = img.getWidth();
        int h = img.getHeight();
        int total = w * h;
        int[] counts = new int[4096];
        int step = Math.max(1, total / 2000); // ~2000픽셀 샘플링

        for (int i = 0; i < total; i += step) {
            int rgb = img.getRGB(i % w, i / w);
            if (((rgb >> 24) & 0xFF) < 128) continue; // 투명 픽셀 제외
            int r = (rgb >> 16) & 0xFF;
            int g = (rgb >> 8)  & 0xFF;
            int b =  rgb        & 0xFF;
            counts[((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)]++;
        }

        return IntStream.range(0, 4096)
            .filter(i -> counts[i] > 0)
            .boxed()
            .sorted((a, b) -> counts[b] - counts[a])
            .limit(5)
            .map(bucket -> new int[]{
                ((bucket >> 8) & 0xF) * 17,
                ((bucket >> 4) & 0xF) * 17,
                ( bucket       & 0xF) * 17
            })
            .collect(Collectors.toList());
    }

    /**
     * RGB → HSL 변환 후 색체학 무드 분류.
     * 우선순위: 명도(Lightness) → 채도(Saturation) → 색상(Hue)
     */
    static String classifyMood(int[] rgb) {
        float[] hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
        float hue = hsl[0];
        float sat = hsl[1];
        float lit = hsl[2];

        // 명도 우선 판별
        if (lit < 0.15f) return "DRAMATIC";
        if (lit > 0.88f) return "CLEAN";

        // 채도 판별
        if (sat < 0.12f) return "MONOCHROME";
        if (sat < 0.32f) return "MUTED";
        if (sat > 0.75f) return "VIBRANT";

        // 색상(Hue) 판별
        if (hue < 30f || hue >= 330f) return "WARM";
        if (hue < 70f)                return "ENERGETIC";
        if (hue < 160f)               return "NATURAL";
        if (hue < 220f)               return "COOL";
        if (hue < 270f)               return "SERENE";
        return "ROMANTIC";
    }

    /** RGB → HSL 변환. 반환: [hue(0-360), saturation(0-1), lightness(0-1)] */
    private static float[] rgbToHsl(int r, int g, int b) {
        float rf = r / 255f, gf = g / 255f, bf = b / 255f;
        float max = Math.max(rf, Math.max(gf, bf));
        float min = Math.min(rf, Math.min(gf, bf));
        float delta = max - min;
        float l = (max + min) / 2f;
        float s = (delta < 0.001f) ? 0f : delta / (1f - Math.abs(2f * l - 1f));
        float h = 0f;
        if (delta > 0.001f) {
            if      (max == rf) h = 60f * (((gf - bf) / delta) % 6f);
            else if (max == gf) h = 60f * ((bf - rf) / delta + 2f);
            else                h = 60f * ((rf - gf) / delta + 4f);
            if (h < 0f) h += 360f;
        }
        return new float[]{h, s, l};
    }

    private static String toHex(int[] rgb) {
        return String.format("#%02X%02X%02X", rgb[0], rgb[1], rgb[2]);
    }

    private static ColorAnalysisResult fallback() {
        return new ColorAnalysisResult("#808080", "MUTED", "[\"#808080\"]");
    }
}
