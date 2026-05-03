package com.happiness.mobileapp.common.util;

import net.coobird.thumbnailator.Thumbnails;
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
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    public String uploadAndResizeImage(MultipartFile file, String ratio) throws IOException {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("파일 크기가 5MB를 초과합니다.");
        }
        if (!isValidImageType(file.getContentType())) {
            throw new IllegalArgumentException("지원하지 않는 이미지 형식입니다.");
        }

        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalFilename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(originalFilename);
        Files.copy(file.getInputStream(), filePath);

        String resizedFilename = resizeImage(filePath.toString(), ratio);
        return "/uploads/" + resizedFilename;
    }

    private boolean isValidImageType(String contentType) {
        return contentType != null && (
                contentType.equals("image/jpeg") ||
                contentType.equals("image/png") ||
                contentType.equals("image/webp") ||
                contentType.equals("image/gif")
        );
    }

    private String resizeImage(String originalPath, String ratio) throws IOException {
        File originalFile = new File(originalPath);
        String baseName = originalFile.getName().split("\\.")[0];
        String extension = originalFile.getName().substring(originalFile.getName().lastIndexOf("."));

        int width = 1080;
        int height = 1080;

        if ("4:3".equals(ratio)) {
            height = 810;
        } else if ("16:9".equals(ratio)) {
            height = 608;
        }

        String resizedFilename = baseName + "_" + width + "x" + height + extension;
        Path resizedPath = Paths.get(UPLOAD_DIR, resizedFilename);

        Thumbnails.of(originalFile)
                .size(width, height)
                .toFile(resizedPath.toFile());

        return resizedFilename;
    }

    public void deleteImage(String imageUrl) {
        try {
            String filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
            Path filePath = Paths.get(UPLOAD_DIR, filename);
            if (Files.exists(filePath)) {
                Files.delete(filePath);
            }
        } catch (IOException e) {
            System.err.println("이미지 삭제 실패: " + e.getMessage());
        }
    }
}
