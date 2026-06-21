package com.happiness.app.delivery.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "delivery_set_photos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliverySetPhoto {

    @EmbeddedId
    private DeliverySetPhotoId id;

    @Column(nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean liked = false;
}
