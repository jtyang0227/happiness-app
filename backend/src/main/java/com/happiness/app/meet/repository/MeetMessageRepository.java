package com.happiness.app.meet.repository;

import com.happiness.app.meet.entity.MeetMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MeetMessageRepository extends JpaRepository<MeetMessage, Long> {

    List<MeetMessage> findByMeetIdOrderByCreatedAtAsc(Long meetId);

    long countByMeetId(Long meetId);
}
