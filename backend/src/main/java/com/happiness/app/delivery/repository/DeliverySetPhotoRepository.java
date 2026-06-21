package com.happiness.app.delivery.repository;

import com.happiness.app.delivery.entity.DeliverySetPhoto;
import com.happiness.app.delivery.entity.DeliverySetPhotoId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeliverySetPhotoRepository extends JpaRepository<DeliverySetPhoto, DeliverySetPhotoId> {

    List<DeliverySetPhoto> findByIdDeliverySetIdOrderBySortOrder(Long deliverySetId);

    @Modifying
    @Query("DELETE FROM DeliverySetPhoto dsp WHERE dsp.id.deliverySetId = :deliverySetId")
    void deleteByDeliverySetId(@Param("deliverySetId") Long deliverySetId);

    long countByIdDeliverySetId(Long deliverySetId);
}
