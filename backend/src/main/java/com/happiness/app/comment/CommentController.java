package com.happiness.app.comment;

import com.happiness.app.common.SecurityUtil;
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
        return ResponseEntity.ok(ApiResponse.ok(commentService.addComment(photoId, request, SecurityUtil.getCurrentMemberId())));
    }

    @DeleteMapping("/api/comments/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long id) {
        // memberId 쿼리 파라미터는 예전 웹 클라이언트 호환용으로 보내와도 무시한다
        commentService.deleteComment(id, SecurityUtil.getCurrentMemberId(), SecurityUtil.isAdmin());
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
