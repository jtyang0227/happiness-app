package com.happiness.app.comment;

import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
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
    private final MemberRepository memberRepository;

    /**
     * 작성자는 로그인 회원으로 정한다 — 요청의 memberId·memberName을 믿으면 남의 이름으로 댓글을 달 수 있고,
     * 이름을 보내지 않는 모바일은 NOT NULL 제약에 걸려 500이 났다.
     */
    public CommentResponse addComment(Long photoId, CommentRequest request, Long currentMemberId) {
        if (request.getContent() == null || request.getContent().isBlank())
            throw new IllegalArgumentException("댓글 내용을 입력해주세요.");
        if (request.getContent().length() > 500)
            throw new IllegalArgumentException("댓글은 500자 이하로 작성해주세요.");
        if (request.getParentId() != null) {
            Comment parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new IllegalArgumentException("답글을 달 댓글을 찾을 수 없습니다."));
            if (!parent.getPhotoId().equals(photoId))
                throw new IllegalArgumentException("답글을 달 댓글을 찾을 수 없습니다.");
        }
        Member author = memberRepository.findById(currentMemberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        Comment comment = Comment.builder()
                .photoId(photoId)
                .memberId(author.getId())
                .memberName(author.getName())
                .memberAvatarUrl(author.getAvatarUrl())
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

    /** 본인 댓글 또는 관리자(신고 처리)만 삭제 — 요청 파라미터의 memberId는 믿지 않는다. */
    public void deleteComment(Long commentId, Long currentMemberId, boolean admin) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));
        if (!admin && !comment.getMemberId().equals(currentMemberId))
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
