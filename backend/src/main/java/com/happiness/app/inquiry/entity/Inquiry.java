package com.happiness.app.inquiry.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "inquiries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 수신 작가의 memberId */
    @Column(nullable = false)
    private Long receiverMemberId;

    @Column(nullable = false, length = 50)
    private String senderName;

    @Column(nullable = false, length = 100)
    private String senderEmail;

    @Column(length = 20)
    private String shootType;

    @Column(length = 50)
    private String shootDate;

    @Column(length = 100)
    private String budget;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.isRead == null) this.isRead = false;
    }
}
