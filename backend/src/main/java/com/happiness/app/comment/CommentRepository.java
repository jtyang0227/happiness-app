package com.happiness.app.comment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByPhotoIdOrderByCreatedAtAsc(Long photoId);

    List<Comment> findByParentId(Long parentId);

    long countByPhotoId(Long photoId);

    @Transactional
    void deleteByPhotoId(Long photoId);

    /** 회원 탈퇴 — 그 회원이 남긴 댓글 (대댓글 포함, 남의 댓글에 달린 답글이 고아가 되는 건 목록 조회에서 걸러짐) */
    @Transactional
    void deleteByMemberId(Long memberId);
}
