package com.happiness.app.storage;

import com.happiness.app.common.util.ImageSignature;
import com.happiness.app.common.util.UploadImageShrinker;
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

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            throw new StorageException("파일 읽기 실패", e);
        }

        // 선언한 Content-Type·파일 이름이 아니라 실제 내용으로 형식을 정한다 — 이미지가 아닌 파일(HTML 등)을
        // image/png로 속여 올려 우리 버킷 주소로 배포하는 것을 막고, 저장 키 확장자도 형식에서 정한다
        String actualType = ImageSignature.detect(bytes);
        if (actualType == null) {
            throw new StorageException("이미지 파일이 아닙니다. (JPEG, PNG, WebP, GIF만 허용)");
        }

        // 긴 변 2048px·JPEG 품질 0.85로 줄여 무료 Storage 용량을 아낀다
        UploadImageShrinker.Result shrunk = UploadImageShrinker.shrink(
                bytes, actualType, ImageSignature.extension(actualType));
        String objectKey = folder + "/" + UUID.randomUUID() + "." + shrunk.ext();

        return doUpload(shrunk.bytes(), objectKey, shrunk.contentType());
    }

    /**
     * 이미 메모리상에 있는 바이트 배열(예: 리사이즈된 이미지 변형)을 지정한
     * 오브젝트 키로 Supabase Storage에 업로드하고 Public URL을 반환한다.
     */
    public String uploadBytes(byte[] bytes, String objectKey, String contentType) {
        return doUpload(bytes, objectKey, contentType);
    }

    private String doUpload(byte[] bytes, String objectKey, String contentType) {
        WebClient client = webClientBuilder
                .baseUrl(supabaseUrl + "/storage/v1")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                .build();

        client.post()
                .uri("/object/{bucket}/{key}", bucket, objectKey)
                .contentType(MediaType.parseMediaType(contentType))
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

    /**
     * 사진의 1024 URL을 기준으로 4단계 해상도 변형(1024/512/256/128) 오브젝트를
     * 모두 삭제한다. 이 서비스가 발급한 URL 형식(publicUrlBase/bucket/objectKey)에
     * 맞지 않는 레거시 URL(로컬 디스크 경로, URL 직접 등록 등)은 조용히 건너뛴다.
     * 개별 파일이 이미 없어도(멱등) 예외를 전체 삭제 실패로 전파하지 않는다.
     */
    public void deletePhotoVariants(String imageUrl1024) {
        String objectKey1024 = extractObjectKey(imageUrl1024);
        if (objectKey1024 == null || !objectKey1024.contains("_1024.")) {
            return; // 이 파이프라인으로 업로드되지 않은 레거시 데이터 — 삭제 대상 없음
        }
        for (int size : new int[]{1024, 512, 256, 128}) {
            String key = objectKey1024.replace("_1024.", "_" + size + ".");
            try {
                deleteImage(key);
            } catch (Exception e) {
                log.warn("사진 변형 삭제 실패(무시하고 계속): {} - {}", key, e.getMessage());
            }
        }
    }

    /** publicUrlBase/bucket/{objectKey} 형태의 Public URL에서 objectKey만 추출한다. */
    private String extractObjectKey(String publicUrl) {
        if (publicUrl == null) return null;
        String prefix = publicUrlBase + "/" + bucket + "/";
        if (!publicUrl.startsWith(prefix)) return null;
        return publicUrl.substring(prefix.length());
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

}
