package com.happiness.app.common.util;

import net.coobird.thumbnailator.Thumbnails;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * 업로드 이미지를 Storage에 넣기 전에 줄인다 — 무료 Storage(1GB)를 아끼려는 것.
 * 긴 변이 {@link #MAX_EDGE}px를 넘으면 그 안으로 줄이고, JPEG는 품질 {@link #JPEG_QUALITY}로 다시 인코딩한다.
 * GIF(움직이는 그림일 수 있음)·읽을 수 없는 형식(기본 ImageIO에 WebP 디코더 없음)은 원본 그대로 둔다.
 * 결과가 원본보다 크면 원본을 쓴다.
 */
public final class UploadImageShrinker {

    public static final int MAX_EDGE = 2048;
    public static final double JPEG_QUALITY = 0.85;

    private UploadImageShrinker() {}

    public record Result(byte[] bytes, String contentType, String ext) {}

    public static Result shrink(byte[] original, String contentType, String ext) {
        if (!"image/jpeg".equals(contentType) && !"image/png".equals(contentType)) {
            return new Result(original, contentType, ext);
        }
        try {
            BufferedImage src = ImageIO.read(new ByteArrayInputStream(original));
            if (src == null) return new Result(original, contentType, ext);

            boolean tooBig = Math.max(src.getWidth(), src.getHeight()) > MAX_EDGE;
            boolean jpeg = "image/jpeg".equals(contentType);
            // PNG는 크기가 기준 안이면 다시 인코딩해도 줄지 않으니 그대로 둔다
            if (!tooBig && !jpeg) return new Result(original, contentType, ext);

            String format = jpeg ? "jpg" : "png";
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Thumbnails.Builder<BufferedImage> b = Thumbnails.of(src).outputFormat(format);
            if (tooBig) b.size(MAX_EDGE, MAX_EDGE).keepAspectRatio(true);
            else b.scale(1.0);
            if (jpeg) b.outputQuality(JPEG_QUALITY);
            b.toOutputStream(out);

            byte[] shrunk = out.toByteArray();
            if (shrunk.length >= original.length) return new Result(original, contentType, ext);
            return new Result(shrunk, contentType, jpeg ? "jpg" : "png");
        } catch (IOException | RuntimeException e) {
            return new Result(original, contentType, ext);
        }
    }
}
