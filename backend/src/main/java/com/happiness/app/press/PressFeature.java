package com.happiness.app.press;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "press_features")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PressFeature {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 100)
    private String publication;

    @Column(length = 200)
    private String title;

    @Column(length = 500)
    private String url;

    @Column(length = 20)
    private String publishedDate;

    @Column(length = 500)
    private String logoUrl;

    @Column(nullable = false)
    private int displayOrder = 0;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }
}
