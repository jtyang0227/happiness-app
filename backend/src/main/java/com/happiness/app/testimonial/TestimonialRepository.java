package com.happiness.app.testimonial;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TestimonialRepository extends JpaRepository<Testimonial, Long> {
    List<Testimonial> findByMemberIdOrderByDisplayOrderAscCreatedAtDesc(Long memberId);
    List<Testimonial> findByMemberIdAndFeaturedTrueOrderByDisplayOrderAsc(Long memberId);
    void deleteByMemberId(Long memberId);
}
