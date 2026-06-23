package com.happiness.app.portfolio.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioConfigResponse {
    private String template;
    private String styleJson;
    private String sectionsJson;
}
