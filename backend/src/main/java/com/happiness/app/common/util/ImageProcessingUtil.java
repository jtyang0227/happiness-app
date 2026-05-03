package com.happiness.app.common.util;

import net.coobird.thumbnailator.Thumbnails;
import net.coobird.thumbnailator.geometry.Positions;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Component
public class ImageProcessingUtil {

    private static final String UPLOAD_DIR = "uploads";
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    private static final int FULL_WIDTH = 1080;
    private static final int THUMB_SIZE = 400;

    public ImageUploadResult uploadAndResizeImage(MultipartFile file, String ratio) throws IOException {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("파일 크기가 10MB를 초과합니다.");
        }
        if (!isValidImageType(file.getContentType())) {
            throw new IllegalArgumentException("지원하지 않는 이미지 형식입니다. (JPEG, PNG, WebP, GIF 허용)");
        }

        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String uid = UUID.randomUUID().toString();
        String ext = resolveExtension(file.getContentType());

        Path originalPath = uploadPath.resolve(uid + "_original" + ext);
        Files.copy(file.getInputStream(), originalPath);

        try {
            String fullName = uid + "_full" + ext;
            Path fullPath = uploadPath.resolve(fullName);
            resizeFull(originalPath.toFile(), fullPath.toFile(), ratio);

            String thumbName = uid + "_thumb" + ext;
            Path thumbPath = uploadPath.resolve(thumbName);
            resizeThumbnail(originalPath.toFile(), thumbPath.toFile());

            return new ImageUploadResult("/uploads/" + fullName, "/uploads/" + thumbName);
        } finally {
            Files.deleteIfExists(originalPath);
        }
    }

    private void resizeFull(File src, File dst, String ratio) throws IOException {
        int width  = FULL_WIDTH;
        int height = FULL_WIDTH;

        if ("4:3".equals(ratio)) {
            height = 810;
        } else if ("16:9".equals(ratio)) {
            height = 608;
        } else if ("3:4".equals(ratio)) {
            width  = 810;
            height = 1080;
        }

        Thumbnails.of(src)
                .size(width, height)
                .keepAspectRatio(true)
                .outputQuality(0.92)
                .toFile(dst);
    }

    private void resizeThumbnail(File src, File dst) throws IOException {
        Thumbnails.of(src)
                .crop(Positions.CENTER)
                .size(THUMB_SIZE, THUMB_SIZE)
                .outputQuality(0.85)
                .toFile(dst);
    }

    private boolean isValidImageType(String contentType) {
        return contentType != null && (
                contentType.equals("image/jpeg") ||
                contentType.equals("image/png")  ||
                contentType.equals("image/webp") ||
                contentType.equals("image/gif")
        );
    }

    private String resolveExtension(String contentType) {
        return switch (contentType) {
            case "image/png"  -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif"  -> ".gif";
            default           -> ".jpg";
        };
    }

    public void deleteImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return;
        try {
            String filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
            String uid = filename.replaceAll("_(full|thumb)\\.[^.]+$", "");

            String[] suffixes = {"_full", "_thumb"};
            String[] exts = {".jpg", ".png", ".webp", ".gif"};
            for (String suffix : suffixes) {
                for (String ext : exts) {
                    Files.deleteIfExists(Paths.get(UPLOAD_DIR, uid + suffix + ext));
                }
            }
        } catch (IOException e) {
            System.err.println("이미지 삭제 실패: " + e.getMessage());
        }
    }

    public record ImageUploadResult(String imageUrl, String thumbnailUrl) {}
}
