package com.happiness.app.booking.repository;

import com.happiness.app.booking.entity.BookingAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingAvailabilityRepository extends JpaRepository<BookingAvailability, Long> {

    Optional<BookingAvailability> findByMemberId(Long memberId);

    List<BookingAvailability> findByMemberIdIn(Collection<Long> memberIds);

    /**
     * "예약 받는 중" — 가용 설정 행이 있고 active인 작가만 true.
     * 행이 없으면 예약 페이지는 기본값으로 열리지만, 작가가 직접 켠 적이 없으므로 배지는 붙이지 않는다.
     */
    default boolean isAcceptingBookings(Long memberId) {
        return findByMemberId(memberId).map(BookingAvailability::isActive).orElse(false);
    }
}
