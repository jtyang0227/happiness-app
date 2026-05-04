# Happiness App — Backend

Spring Boot 3.4.5 REST API server.

## Requirements

| Tool | Version |
|------|---------|
| Java (Temurin) | 25.0.3+ |
| Gradle | 9.5 (wrapper included) |

> The project uses the Gradle Toolchain API — Gradle will locate the JDK automatically via `JAVA_HOME` or the path in `gradle.properties`.

## Local Setup

### 1. Install Java 25

Download Temurin 25 from [adoptium.net](https://adoptium.net) and install it.

Set `JAVA_HOME` in `backend/gradle.properties` (already configured for this machine):

```properties
org.gradle.java.home=/Users/yangjongtae/.jdk/jdk-25.0.3+9/Contents/Home
```

Or export it globally:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 25)
```

### 2. Run the dev server

```bash
cd backend
./gradlew bootRun
```

Server starts on **http://localhost:8080**. H2 in-memory database is used automatically in the `default` profile — no external DB required.

### 3. Build a JAR

```bash
./gradlew clean build -x test
# Output: build/libs/happiness-app-*.jar
```

### 4. Run tests

```bash
./gradlew test
./gradlew test --tests "com.happiness.app.photo.controller.PhotoControllerTest"
```

## Development Database

H2 console: **http://localhost:8080/h2-console**

- JDBC URL: `jdbc:h2:mem:testdb`
- Username: `sa`
- Password: *(empty)*

Schema is created and dropped on each restart (`ddl-auto=create-drop`).

## Production Profile

```bash
./gradlew bootRun --args='--spring.profiles.active=prod'
# or
java -jar build/libs/happiness-app-*.jar --spring.profiles.active=prod
```

Production uses PostgreSQL. Required environment variables:

```
DB_URL=jdbc:postgresql://host:5432/happiness
DB_USERNAME=...
DB_PASSWORD=...
AWS_ACCESS_KEY=...
AWS_SECRET_KEY=...
AWS_S3_BUCKET=...
```

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/photos` | 전체 사진 목록 |
| POST | `/api/photos` | 사진 등록 (JSON) |
| POST | `/api/photos/upload` | 사진 업로드 (multipart, 자동 리사이징) |
| GET | `/api/photos/{id}` | 사진 단건 조회 |
| PUT | `/api/photos/{id}` | 사진 수정 |
| DELETE | `/api/photos/{id}` | 사진 삭제 |
| POST | `/api/photos/{id}/likes` | 좋아요 추가 |
| DELETE | `/api/photos/{id}/likes` | 좋아요 취소 |
| POST | `/api/photos/{id}/saves` | 북마크 추가 |
| DELETE | `/api/photos/{id}/saves` | 북마크 취소 |
| POST | `/api/photos/{id}/tags` | 태그 추가 |
| POST | `/api/members/signup` | 회원가입 |
| POST | `/api/members/login` | 로그인 |

## Image Upload

`POST /api/photos/upload` accepts `multipart/form-data` and:
- Resizes the original to 1080 px wide (quality 0.92) → `imageUrl`
- Generates a 400×400 center-crop thumbnail (quality 0.85) → `thumbnailUrl`

In dev, images are stored under `uploads/` relative to the working directory.

## Grid Layout

Photos carry a `gridColSpan` field (1–12, default 6) that the mobile gallery uses to arrange photos in a 12-column grid. The backend validates and clamps this value on create and update.
