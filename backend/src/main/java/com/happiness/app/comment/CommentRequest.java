package com.happiness.app.comment;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class CommentRequest {
    private Long memberId;
    private String memberName;
    private String memberAvatarUrl;
    private String content;
    private Long parentId;
}
