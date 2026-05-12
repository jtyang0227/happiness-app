package com.happiness.app.config;

import com.happiness.app.interceptor.AdminAuditInterceptor;
import com.happiness.app.interceptor.ApiAccessInterceptor;
import com.happiness.app.interceptor.LoggingInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    private final LoggingInterceptor loggingInterceptor;
    private final AdminAuditInterceptor adminAuditInterceptor;
    private final ApiAccessInterceptor apiAccessInterceptor;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.split(","))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(apiAccessInterceptor)
                .addPathPatterns("/api/**")
                .order(1);

        registry.addInterceptor(loggingInterceptor)
                .addPathPatterns("/api/**")
                .order(2);

        registry.addInterceptor(adminAuditInterceptor)
                .addPathPatterns("/api/admin/**")
                .order(3);
    }
}
