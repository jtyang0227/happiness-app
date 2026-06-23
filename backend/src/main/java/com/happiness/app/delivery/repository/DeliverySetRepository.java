package com.happiness.app.delivery.repository;

import com.happiness.app.delivery.entity.DeliverySet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeliverySetRepository extends JpaRepository<DeliverySet, Long> {

    Optional<DeliverySet> findByToken(String token);

    List<DeliverySet> findByMemberIdOrderByCreatedAtDesc(Long memberId);

    void deleteByExpiresAtBefore(LocalDateTime now);

    Optional<DeliverySet> findByMemberIdAndId(Long memberId, Long id);
}
