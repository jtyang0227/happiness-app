package com.happiness.app.meet.repository;

import com.happiness.app.meet.entity.MeetAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MeetAvailabilityRepository extends JpaRepository<MeetAvailability, Long> {

    List<MeetAvailability> findByMeetId(Long meetId);

    Optional<MeetAvailability> findByMeetIdAndMemberId(Long meetId, Long memberId);
}
