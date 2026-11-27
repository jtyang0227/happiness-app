package com.happiness.app.common.util;

/**
 * 파일 앞부분(매직 바이트)으로 실제 이미지 형식을 판별한다 — 클라이언트가 보낸 Content-Type·파일 이름은 믿지 않는다.
 * 업로드 허용 형식(JPEG·PNG·WebP·GIF)만 알아보고, 그 밖은 null.
 */
public final class ImageSignature {

    private ImageSignature() {}

    public static String detect(byte[] b) {
        if (b == null) return null;
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "image/jpeg";
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) return "image/png";
        if (b.length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8' && (b[4] == '7' || b[4] == '9') && b[5] == 'a') return "image/gif";
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "image/webp";
        return null;
    }

    /** 저장 키 확장자 — 형식에서 정한다(클라이언트 파일 이름의 확장자를 쓰지 않음) */
    public static String extension(String contentType) {
        return switch (contentType) {
            case "image/png" -> "png";
            case "image/gif" -> "gif";
            case "image/webp" -> "webp";
            default -> "jpg";
        };
    }
}
