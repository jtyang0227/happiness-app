package com.happiness.app.press;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "achievements")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Achievement {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    /** AWARD | EXHIBITION | PUBLICATION */
    @Column(nullable = false, length = 20)
    private String type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 100)
    private String organizer;

    @Column(length = 100)
    private String location;

    /** "2025.05" 형식 */
    @Column(length = 7)
    private String yearMonth;

    @Column(length = 500)
    private String url;

    @Column(nullable = false)
    private int displayOrder = 0;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }
}
