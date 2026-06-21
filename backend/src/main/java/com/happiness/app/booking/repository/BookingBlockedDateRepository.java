package com.happiness.app.booking.repository;

import com.happiness.app.booking.entity.BookingBlockedDate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingBlockedDateRepository extends JpaRepository<BookingBlockedDate, Long> {

    List<BookingBlockedDate> findByMemberId(Long memberId);

    @Modifying
    @Query("DELETE FROM BookingBlockedDate b WHERE b.memberId = :memberId AND b.id = :id")
    void deleteByMemberIdAndId(@Param("memberId") Long memberId, @Param("id") Long id);

    List<BookingBlockedDate> findByMemberIdAndBlockedDateBetween(Long memberId, LocalDate from, LocalDate to);

    Optional<BookingBlockedDate> findByMemberIdAndId(Long memberId, Long id);
}
