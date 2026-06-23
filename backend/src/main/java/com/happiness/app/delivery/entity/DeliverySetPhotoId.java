package com.happiness.app.delivery.entity;

import jakarta.persistence.Embeddable;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class DeliverySetPhotoId implements Serializable {
    private Long deliverySetId;
    private Long photoId;
}
