package com.happiness.app.security.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
@Component
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {
    private String secret;
    private long accessTokenExpiryMs = 1800000L;
    private long refreshTokenExpiryMs = 604800000L;
    private String issuer = "happiness-app";
}
