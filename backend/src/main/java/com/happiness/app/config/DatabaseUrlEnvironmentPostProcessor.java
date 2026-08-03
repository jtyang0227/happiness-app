package com.happiness.app.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Supabase가 제공하는 DATABASE_URL은 libpq 형식(postgresql://user:password@host:port/db)이라
 * user:password가 URL authority에 임베드되어 있음. PostgreSQL JDBC 드라이버는 이 문법을 지원하지
 * 않고(userinfo를 파싱하지 않고 host의 일부로 취급해 UnknownHostException 발생) 별도의
 * username/password 프로퍼티로 전달해야 하므로, 여기서 미리 분해해 스프링 프로퍼티로 주입한다.
 *
 * java.net.URI 대신 수동 문자열 파싱을 사용한다 — Supabase 커넥션 풀러(Supavisor)의 사용자명은
 * "postgres.<project-ref>"처럼 '.'이 포함된 테넌트 접두사 형식이라, username을 한 글자도 잘라내면
 * 안 되기 때문에(테넌트 접두사가 잘리면 "tenant/user ... not found" 인증 오류 발생) userinfo/host
 * 경계를 '@'의 마지막 위치 기준으로 명시적으로 찾아 정확히 보존한다.
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

            int schemeIdx = raw.indexOf("://");
            if (schemeIdx < 0) {
                return;
            }
            String afterScheme = raw.substring(schemeIdx + 3); // user:password@host:port/db...

            // host/db 부분에는 '@'가 나올 수 없으므로, userinfo와 host의 경계는 마지막 '@'로 찾는다.
            // 이렇게 하면 비밀번호에 인코딩되지 않은 '@'가 섞여 있어도 username/tenant 접두사가
            // 잘리지 않고 그대로 보존된다.
            int atIdx = afterScheme.lastIndexOf('@');
            if (atIdx < 0) {
                return; // userinfo가 없는 URL — 손대지 않고 기존 spring.datasource.* 설정 사용
            }

            String userInfo = afterScheme.substring(0, atIdx);
            String hostPortAndPath = afterScheme.substring(atIdx + 1);

            String username = userInfo;
            String password = null;
            int colonIdx = userInfo.indexOf(':');
            if (colonIdx >= 0) {
                username = userInfo.substring(0, colonIdx);
                password = userInfo.substring(colonIdx + 1);
            }
            username = URLDecoder.decode(username, StandardCharsets.UTF_8);
            if (password != null) {
                password = URLDecoder.decode(password, StandardCharsets.UTF_8);
            }

            int slashIdx = hostPortAndPath.indexOf('/');
            String hostPort = slashIdx >= 0 ? hostPortAndPath.substring(0, slashIdx) : hostPortAndPath;
            String pathAndQuery = slashIdx >= 0 ? hostPortAndPath.substring(slashIdx) : "";

            String host = hostPort;
            int port = 5432;
            int lastColonIdx = hostPort.lastIndexOf(':');
            if (lastColonIdx >= 0) {
                host = hostPort.substring(0, lastColonIdx);
                try {
                    port = Integer.parseInt(hostPort.substring(lastColonIdx + 1));
                } catch (NumberFormatException ignored) {
                    // 포트 파싱 실패 시 기본값(5432) 유지
                }
            }

            String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + pathAndQuery;

            Map<String, Object> overrides = new HashMap<>();
            overrides.put("spring.datasource.url", jdbcUrl);
            overrides.put("spring.datasource.username", username);
            if (password != null) {
                overrides.put("spring.datasource.password", password);
            }

            environment.getPropertySources().addFirst(new MapPropertySource("databaseUrlOverride", overrides));
        } catch (Exception e) {
            // 파싱 실패 시 조용히 넘어가고 기존 spring.datasource.* 설정이 그대로 사용되도록 둔다
        }
    }
}
