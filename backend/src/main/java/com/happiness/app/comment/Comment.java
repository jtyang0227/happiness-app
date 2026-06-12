package com.happiness.app.comment;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Comment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long photoId;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 100)
    private String memberName;

    @Column(nullable = true, length = 500)
    private String memberAvatarUrl;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /** 대댓글의 경우 부모 댓글 ID, 최상위 댓글은 null */
    @Column(nullable = true)
    private Long parentId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }
}
