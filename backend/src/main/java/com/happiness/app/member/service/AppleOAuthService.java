package com.happiness.app.member.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.happiness.app.member.dto.MemberResponse;
import io.jsonwebtoken.Jwts;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.Date;

@Service
@RequiredArgsConstructor
public class AppleOAuthService {

    private final MemberService memberService;
    private final ObjectMapper objectMapper;

    @Value("${apple.client-id:}")
    private String clientId;     // Apple Services ID (e.g. com.happiness.gallery.web)

    @Value("${apple.team-id:}")
    private String teamId;       // Apple Developer Team ID

    @Value("${apple.key-id:}")
    private String keyId;        // Sign In with Apple Key ID

    @Value("${apple.private-key:}")
    private String privateKeyPem; // PKCS#8 PEM (without header/footer, newlines stripped)

    @Getter
    @Value("${apple.frontend-redirect-uri:http://localhost:3000/oauth/apple/result}")
    private String frontendRedirectUri;

    /**
     * Apple이 POST로 전송하는 콜백 처리.
     * id_token JWT 페이로드에서 sub(고유 ID)와 email을 추출한다.
     * user JSON은 최초 로그인 시에만 Apple이 포함시킨다.
     */
    public MemberResponse appleLogin(String idToken, String userJson) {
        if (idToken == null || idToken.isBlank()) {
            throw new RuntimeException("Apple id_token이 없습니다.");
        }

        String providerId;
        String email;
        String name = "Apple 사용자";

        try {
            // JWT 페이로드 base64 디코딩 (서명 검증 생략 — 프로덕션에서는 Apple JWKs로 검증 권장)
            String[] parts = idToken.split("\\.");
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
            JsonNode tokenPayload = objectMapper.readTree(payload);
            providerId = tokenPayload.get("sub").asText();
            email = tokenPayload.has("email") ? tokenPayload.get("email").asText()
                    : providerId + "@privaterelay.appleid.com";
        } catch (Exception e) {
            throw new RuntimeException("Apple id_token 파싱 실패", e);
        }

        // user 파라미터는 최초 로그인 시에만 포함됨
        if (userJson != null && !userJson.isBlank()) {
            try {
                JsonNode userNode = objectMapper.readTree(userJson);
                if (userNode.has("name")) {
                    JsonNode nameNode = userNode.get("name");
                    String first = nameNode.has("firstName") ? nameNode.get("firstName").asText("") : "";
                    String last = nameNode.has("lastName") ? nameNode.get("lastName").asText("") : "";
                    String full = (first + " " + last).trim();
                    if (!full.isBlank()) name = full;
                }
            } catch (Exception ignored) {}
        }

        return memberService.findOrCreateOAuthMember("apple", providerId, email, name);
    }

    /**
     * Apple 인증 요청용 client_secret JWT 생성 (ES256, 유효기간 5분).
     * 실제 토큰 교환이 필요한 경우 사용.
     */
    public String generateClientSecret() {
        try {
            PrivateKey privateKey = loadPrivateKey();
            return Jwts.builder()
                    .issuer(teamId)
                    .issuedAt(new Date())
                    .expiration(new Date(System.currentTimeMillis() + 5 * 60 * 1000L))
                    .audience().add("https://appleid.apple.com").and()
                    .subject(clientId)
                    .header().keyId(keyId).and()
                    .signWith(privateKey, Jwts.SIG.ES256)
                    .compact();
        } catch (Exception e) {
            throw new RuntimeException("Apple client_secret 생성 실패", e);
        }
    }

    private PrivateKey loadPrivateKey() throws Exception {
        String stripped = privateKeyPem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");
        byte[] decoded = Base64.getDecoder().decode(stripped);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decoded);
        return KeyFactory.getInstance("EC").generatePrivate(spec);
    }
}
