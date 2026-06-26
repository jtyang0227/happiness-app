package com.happiness.app.brand;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ClientBrandRepository extends JpaRepository<ClientBrand, Long> {
    List<ClientBrand> findByMemberIdOrderByDisplayOrderAscCreatedAtAsc(Long memberId);
    void deleteByMemberId(Long memberId);
}
