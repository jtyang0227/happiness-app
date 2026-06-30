package com.happiness.app.meet.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "meet_messages",
       indexes = @Index(name = "idx_meet_messages_meet_id", columnList = "meet_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long meetId;

    @Column(nullable = false)
    private Long senderId;

    @Column(length = 100, nullable = false)
    private String senderName;

    @Column(length = 500)
    private String senderAvatar;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
