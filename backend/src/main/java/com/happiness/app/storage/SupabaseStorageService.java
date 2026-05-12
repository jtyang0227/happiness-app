package com.happiness.app.storage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupabaseStorageService {

    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024L; // 20MB
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key}")
    private String serviceRoleKey;

    @Value("${supabase.storage.bucket}")
    private String bucket;

    @Value("${supabase.storage.public-url}")
    private String publicUrlBase;

    private final WebClient.Builder webClientBuilder;

    /**
     * 이미지 파일을 Supabase Storage에 업로드하고 Public URL을 반환한다.
     */
    public String uploadImage(MultipartFile file, String folder) {
        validateFile(file);

        String ext       = extractExtension(file.getOriginalFilename());
        String objectKey = folder + "/" + UUID.randomUUID() + "." + ext;

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            throw new StorageException("파일 읽기 실패", e);
        }

        WebClient client = webClientBuilder
                .baseUrl(supabaseUrl + "/storage/v1")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                .build();

        client.post()
                .uri("/object/{bucket}/{key}", bucket, objectKey)
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .header("x-upsert", "true")
                .body(BodyInserters.fromValue(bytes))
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp ->
                        resp.bodyToMono(String.class).map(body ->
                                new StorageException("Supabase 업로드 실패: " + body)))
                .bodyToMono(String.class)
                .block();

        String publicUrl = publicUrlBase + "/" + bucket + "/" + objectKey;
        log.info("Supabase upload success: {}", publicUrl);
        return publicUrl;
    }

    /**
     * Supabase Storage에서 오브젝트를 삭제한다.
     * objectKey 예: "photos/uuid.jpg"
     */
    public void deleteImage(String objectKey) {
        WebClient client = webClientBuilder
                .baseUrl(supabaseUrl + "/storage/v1")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                .build();

        client.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/object/{bucket}", bucket)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("{\"prefixes\":[\"" + objectKey + "\"]}")
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp ->
                        resp.bodyToMono(String.class).map(body ->
                                new StorageException("Supabase 삭제 실패: " + body)))
                .bodyToMono(String.class)
                .block();

        log.info("Supabase delete success: {}", objectKey);
    }

    // ── private helpers ───────────────────────────────────────────────

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new StorageException("파일이 비어있습니다.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new StorageException("파일 크기는 20MB를 초과할 수 없습니다.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new StorageException("허용되지 않는 파일 형식입니다. (JPEG, PNG, WebP, GIF만 허용)");
        }
    }

    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "jpg";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
