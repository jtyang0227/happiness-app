package com.happiness.app.common.util;

import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * 사진 업로드 시 1024/512/256/128 4단계 해상도 변형을 생성하는 유틸리티.
 * DB에는 1024(imageUrl)/256(thumbnailUrl)만 저장하고, 512/128은
 * {@link #deriveUrl} 파일명 규칙으로 응답 시점에 파생한다 (스키마 변경 없음).
 */
@Component
public class ImageVariantUtil {

    public static final int[] SIZES = {1024, 512, 256, 128};

    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024L; // 20MB
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    public record VariantPrep(
            Map<Integer, byte[]> variants,
            String ext,
            String contentType,
            String dominantColor,
            String colorMood,
            String colorPalette
    ) {}

    /**
     * 원본 파일을 검증하고 4단계 리사이즈 변형(byte[])을 생성한다.
     * 색체학 분석은 256px 변형을 사용한다(원본 대비 대폭 빠름).
     */
    public VariantPrep prepare(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("파일이 비어있습니다.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("파일 크기가 20MB를 초과합니다.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("지원하지 않는 이미지 형식입니다. (JPEG, PNG, WebP, GIF 허용)");
        }

        BufferedImage source = ImageIO.read(file.getInputStream());
        if (source == null) {
            throw new IllegalArgumentException("이미지를 읽을 수 없습니다.");
        }

        String formatName = resolveFormatName(contentType);
        String ext = formatName;
        String outputContentType = "jpg".equals(formatName) ? "image/jpeg" : "image/" + formatName;

        Map<Integer, byte[]> variants = new LinkedHashMap<>();
        BufferedImage colorSample = null;
        for (int size : SIZES) {
            BufferedImage resized = Thumbnails.of(source)
                    .size(size, size)
                    .keepAspectRatio(true)
                    .outputQuality(0.88)
                    .asBufferedImage();
            variants.put(size, toBytes(resized, formatName));
            if (size == 256) colorSample = resized;
        }

        ColorAnalysisUtil.ColorAnalysisResult color = ColorAnalysisUtil.analyze(colorSample);

        return new VariantPrep(variants, ext, outputContentType,
                color.dominantColor(), color.colorMood(), color.colorPalette());
    }

    /**
     * 1024 URL로부터 다른 크기의 URL을 파일명 규칙으로 파생한다.
     * 규칙에 맞지 않는 레거시 URL(로컬 경로, 단일 URL 모드 등)은 원본을 그대로 반환한다.
     */
    public static String deriveUrl(String imageUrl1024, int size) {
        if (imageUrl1024 == null || !imageUrl1024.contains("_1024.")) return imageUrl1024;
        return imageUrl1024.replace("_1024.", "_" + size + ".");
    }

    /** {folder}/{uuid}_{size}.{ext} 형태의 Supabase Storage 오브젝트 키를 만든다. */
    public static String objectKey(String folder, String uid, int size, String ext) {
        return folder + "/" + uid + "_" + size + "." + ext;
    }

    private byte[] toBytes(BufferedImage image, String formatName) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, formatName, out);
        return out.toByteArray();
    }

    /**
     * 리사이즈 결과 인코딩 포맷. ImageIO 기본 설치본은 WebP 인코더가 없는 경우가
     * 많아 PNG/GIF를 제외한 나머지(WebP 포함)는 JPG로 통일해 확장자와 실제
     * 인코딩 포맷이 항상 일치하도록 한다.
     */
    private String resolveFormatName(String contentType) {
        return switch (contentType) {
            case "image/png" -> "png";
            case "image/gif" -> "gif";
            default          -> "jpg";
        };
    }
}
