package com.happiness.app.storage;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class StorageController {

    private final SupabaseStorageService storageService;

    /**
     * POST /api/upload/image?folder=photos
     * Authorization: Bearer <token> 필요
     */
    @PostMapping("/image")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "photos") String folder
    ) {
        // folder 경로 순회 방어
        if (folder.contains("..") || folder.contains("/")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "유효하지 않은 folder 값입니다."));
        }

        String url = storageService.uploadImage(file, folder);
        return ResponseEntity.ok(Map.of(
                "url", url,
                "status", "success"
        ));
    }
}
