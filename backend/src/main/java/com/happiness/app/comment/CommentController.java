package com.happiness.app.comment;

import com.happiness.app.exception.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/api/photos/{photoId}/comments")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getComments(@PathVariable Long photoId) {
        return ResponseEntity.ok(ApiResponse.ok(commentService.getComments(photoId)));
    }

    @PostMapping("/api/photos/{photoId}/comments")
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(
            @PathVariable Long photoId,
            @RequestBody CommentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(commentService.addComment(photoId, request)));
    }

    @DeleteMapping("/api/comments/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long id,
            @RequestParam Long memberId) {
        commentService.deleteComment(id, memberId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
