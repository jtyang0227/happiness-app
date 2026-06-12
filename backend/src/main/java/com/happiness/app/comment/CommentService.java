package com.happiness.app.comment;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CommentService {

    private final CommentRepository commentRepository;

    public CommentResponse addComment(Long photoId, CommentRequest request) {
        if (request.getContent() == null || request.getContent().isBlank())
            throw new IllegalArgumentException("댓글 내용을 입력해주세요.");
        if (request.getContent().length() > 500)
            throw new IllegalArgumentException("댓글은 500자 이하로 작성해주세요.");

        Comment comment = Comment.builder()
                .photoId(photoId)
                .memberId(request.getMemberId())
                .memberName(request.getMemberName())
                .memberAvatarUrl(request.getMemberAvatarUrl())
                .content(request.getContent().trim())
                .parentId(request.getParentId())
                .build();
        return CommentResponse.fromEntity(commentRepository.save(comment));
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(Long photoId) {
        List<Comment> all = commentRepository.findByPhotoIdOrderByCreatedAtAsc(photoId);

        // 최상위 댓글 맵 (순서 보존)
        Map<Long, CommentResponse> topLevel = new LinkedHashMap<>();
        for (Comment c : all) {
            if (c.getParentId() == null) {
                topLevel.put(c.getId(), CommentResponse.fromEntity(c));
            }
        }
        // 대댓글을 부모에 붙임
        for (Comment c : all) {
            if (c.getParentId() != null && topLevel.containsKey(c.getParentId())) {
                topLevel.get(c.getParentId()).getReplies().add(CommentResponse.fromEntity(c));
            }
        }
        return new ArrayList<>(topLevel.values());
    }

    public void deleteComment(Long commentId, Long memberId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));
        if (!comment.getMemberId().equals(memberId))
            throw new IllegalArgumentException("본인의 댓글만 삭제할 수 있습니다.");
        // 대댓글 먼저 삭제
        commentRepository.findByParentId(commentId)
                .forEach(r -> commentRepository.deleteById(r.getId()));
        commentRepository.deleteById(commentId);
    }

    @Transactional(readOnly = true)
    public long countComments(Long photoId) {
        return commentRepository.countByPhotoId(photoId);
    }
}
