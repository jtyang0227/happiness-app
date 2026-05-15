# ── Stage 1: Build ────────────────────────────────────────────────────
FROM eclipse-temurin:25-jdk-alpine AS builder

WORKDIR /workspace

COPY gradlew .
COPY gradle gradle
RUN chmod +x gradlew

# 의존성 레이어 캐시
COPY build.gradle settings.gradle gradle.properties ./
RUN ./gradlew dependencies --no-daemon -q 2>/dev/null || true

COPY src src
RUN ./gradlew bootJar -x test --no-daemon -q

# ── Stage 2: Runtime ───────────────────────────────────────────────────
FROM eclipse-temurin:25-jre-alpine AS runtime

# 보안: root가 아닌 전용 유저
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /app

COPY --from=builder /workspace/build/libs/app.jar app.jar

# JVM 튜닝 (Railway 512MB 플랜 기준)
ENV JAVA_OPTS="-Xms128m -Xmx400m \
  -XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
