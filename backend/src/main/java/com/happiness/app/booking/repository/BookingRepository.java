package com.happiness.app.booking.repository;

import com.happiness.app.booking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByMemberIdOrderByShootDateAsc(Long memberId);

    List<Booking> findByMemberIdAndStatus(Long memberId, String status);

    List<Booking> findByMemberIdAndShootDateBetween(Long memberId, LocalDate from, LocalDate to);

    Optional<Booking> findByMemberIdAndShootDateAndShootTime(Long memberId, LocalDate shootDate, String shootTime);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.memberId = :memberId AND b.shootDate = :shootDate AND b.status IN :statuses")
    long countByMemberIdAndShootDateAndStatusIn(
            @Param("memberId") Long memberId,
            @Param("shootDate") LocalDate shootDate,
            @Param("statuses") List<String> statuses
    );

    Optional<Booking> findByIdAndMemberId(Long id, Long memberId);
}
