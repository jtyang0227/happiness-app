package com.happiness.mobileapp.photo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhotoTagDto {
    private Long id;
    private Long memberId;
    private String memberName;
    private Double positionX;
    private Double positionY;
    private LocalDateTime createdAt;
}
