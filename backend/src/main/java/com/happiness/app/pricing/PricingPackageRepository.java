package com.happiness.app.pricing;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PricingPackageRepository extends JpaRepository<PricingPackage, Long> {
    List<PricingPackage> findByMemberIdAndActiveTrueOrderByDisplayOrderAsc(Long memberId);
    List<PricingPackage> findByMemberIdOrderByDisplayOrderAsc(Long memberId);
    void deleteByMemberId(Long memberId);
}
