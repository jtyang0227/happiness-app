package com.happiness.app.newsletter;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "newsletter_subscribers",
       uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "email"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class NewsletterSubscriber {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(nullable = false, updatable = false)
    private LocalDateTime subscribedAt;

    private LocalDateTime unsubscribedAt;

    @PrePersist
    protected void onCreate() {
        this.subscribedAt = LocalDateTime.now();
        if (this.token == null) this.token = UUID.randomUUID().toString().replace("-", "");
    }
}
