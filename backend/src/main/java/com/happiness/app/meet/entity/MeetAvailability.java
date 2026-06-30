package com.happiness.app.meet.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "meet_availabilities",
       uniqueConstraints = @UniqueConstraint(columnNames = {"meet_id", "member_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetAvailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long meetId;

    @Column(nullable = false)
    private Long memberId;

    /** "2026-07-10,2026-07-12,2026-07-15" */
    @Column(columnDefinition = "TEXT")
    private String availableDates;

    /** "10:00,14:00,18:00" */
    @Column(columnDefinition = "TEXT")
    private String availableTimes;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
