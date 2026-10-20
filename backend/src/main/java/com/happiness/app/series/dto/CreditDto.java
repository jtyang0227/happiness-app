package com.happiness.app.series.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

/** 작업 크레딧 한 줄 — linked는 응답에서만(profileName이 실제 공개 회원일 때 true) */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
@NoArgsConstructor
@AllArgsConstructor
public class CreditDto {
    private String role;
    private String name;
    private String profileName;
    private Boolean linked;
}
