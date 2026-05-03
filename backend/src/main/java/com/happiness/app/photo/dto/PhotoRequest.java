package com.happiness.app.photo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PhotoRequest {
    private Long memberId;
    private String title;
    private String imageUrl;
    private String description;
    private String imageRatio;
}
