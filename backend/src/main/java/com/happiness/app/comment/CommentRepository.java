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
}
