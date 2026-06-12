package com.happiness.app.comment;

import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CommentResponse {

    private Long id;
    private Long photoId;
    private Long memberId;
    private String memberName;
    private String memberAvatarUrl;
    private String content;
    private Long parentId;
    private LocalDateTime createdAt;

    @Builder.Default
    private List<CommentResponse> replies = new ArrayList<>();

    public static CommentResponse fromEntity(Comment c) {
        return CommentResponse.builder()
                .id(c.getId())
                .photoId(c.getPhotoId())
                .memberId(c.getMemberId())
                .memberName(c.getMemberName())
                .memberAvatarUrl(c.getMemberAvatarUrl())
                .content(c.getContent())
                .parentId(c.getParentId())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
