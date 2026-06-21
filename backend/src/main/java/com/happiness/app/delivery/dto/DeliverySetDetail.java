package com.happiness.app.delivery.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class DeliverySetDetail {
    private Long id;
    private String token;
    private String title;
    private String clientName;
    private String status;
    private String feedback;
    private LocalDateTime expiresAt;
    private List<DeliveryPhotoItem> photos;

    @Data
    @Builder
    public static class DeliveryPhotoItem {
        private Long id;
        private String imageUrl;
        private String thumbnailUrl;
        private String title;
        private boolean liked;
        private int sortOrder;
    }
}
