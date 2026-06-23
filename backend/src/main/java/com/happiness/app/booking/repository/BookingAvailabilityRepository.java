package com.happiness.app.booking.repository;

import com.happiness.app.booking.entity.BookingAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookingAvailabilityRepository extends JpaRepository<BookingAvailability, Long> {

    Optional<BookingAvailability> findByMemberId(Long memberId);
}
