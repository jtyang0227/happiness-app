package com.happiness.app.pricing;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pricing_packages")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PricingPackage {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 100)
    private String name;

    /** 원 단위 (null이면 priceLabel 사용) */
    private Integer price;

    /** "문의 필요", "50만원~" 등 자유형식 */
    @Column(length = 50)
    private String priceLabel;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** JSON 배열 문자열: ["포함사항1","포함사항2"] */
    @Column(columnDefinition = "TEXT")
    private String features;

    @Column(nullable = false)
    private boolean featured = false;

    @Column(nullable = false)
    private int displayOrder = 0;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }
}
