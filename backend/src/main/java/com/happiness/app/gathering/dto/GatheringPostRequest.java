package com.happiness.app.gathering.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GatheringPostRequest {

    /** 텍스트 내용 — photos와 둘 다 null/blank이면 400 */
    private String content;

    /** 해시태그 (콤마 구분, VARCHAR 300) */
    private String hashtags;

    /** 첨부 사진 목록 — null 또는 빈 리스트 허용 */
    private List<PhotoItem> photos;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PhotoItem {
        private String imageUrl;
        private String caption;
        private Integer sortOrder;
    }
}
