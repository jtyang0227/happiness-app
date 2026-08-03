package com.happiness.app.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Supabase가 제공하는 DATABASE_URL은 libpq 형식(postgresql://user:password@host:port/db)이라
 * user:password가 URL authority에 임베드되어 있음. PostgreSQL JDBC 드라이버는 이 문법을 지원하지
 * 않고(userinfo를 파싱하지 않고 host의 일부로 취급해 UnknownHostException 발생) 별도의
 * username/password 프로퍼티로 전달해야 하므로, 여기서 미리 분해해 스프링 프로퍼티로 주입한다.
 */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank()) {
            return;
        }

        try {
            String raw = databaseUrl.startsWith("jdbc:") ? databaseUrl.substring("jdbc:".length()) : databaseUrl;
            URI uri = new URI(raw);

            String username = null;
            String password = null;
            String userInfo = uri.getUserInfo();
            if (userInfo != null) {
                int idx = userInfo.indexOf(':');
                if (idx >= 0) {
                    username = URLDecoder.decode(userInfo.substring(0, idx), StandardCharsets.UTF_8);
                    password = URLDecoder.decode(userInfo.substring(idx + 1), StandardCharsets.UTF_8);
                } else {
                    username = URLDecoder.decode(userInfo, StandardCharsets.UTF_8);
                }
            }

            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ":" + port + uri.getPath();

            Map<String, Object> overrides = new HashMap<>();
            overrides.put("spring.datasource.url", jdbcUrl);
            if (username != null) {
                overrides.put("spring.datasource.username", username);
            }
            if (password != null) {
                overrides.put("spring.datasource.password", password);
            }

            environment.getPropertySources().addFirst(new MapPropertySource("databaseUrlOverride", overrides));
        } catch (Exception e) {
            // 파싱 실패 시 조용히 넘어가고 기존 spring.datasource.* 설정이 그대로 사용되도록 둔다
        }
    }
}
