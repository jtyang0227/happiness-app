# Happiness App

React + Spring Boot + React Native로 만든 포트폴리오 사진 공유 앱.

## 프로젝트 구조

```
happiness-app/
├── backend/    Spring Boot 3.4.5 + Java 25 (포트 8080)
├── frontend/   React 18 SPA (포트 3000)
└── mobile/     React Native 0.72 + Expo 49 (모바일)
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | Java 25, Spring Boot 3.4.5, Gradle 9.5 |
| DB (개발) | H2 인메모리 |
| DB (운영) | PostgreSQL |
| 프론트엔드 | React 18, React Router DOM v6 |
| 모바일 | React Native 0.72, Expo 49 |

---

## 사전 요구사항

| 도구 | 최소 버전 | 확인 명령 |
|------|-----------|-----------|
| Java | 25 | `java -version` |
| Gradle | 9.5 | `./gradlew --version` |
| Node.js | 16+ | `node -v` |
| npm | 8+ | `npm -v` |
| Expo CLI (모바일) | 최신 | `npx expo --version` |

> **Java 25 설치**: [Eclipse Temurin 25](https://adoptium.net) 또는 `brew install --cask temurin@25`

---

## 로컬 실행 방법

### 1. 백엔드 (Spring Boot)

```bash
cd backend

# 의존성 확인 + 빌드 (테스트 제외)
./gradlew clean build -x test

# 개발 서버 실행
./gradlew bootRun
```

| 엔드포인트 | 설명 |
|-----------|------|
| `http://localhost:8080` | API 서버 |
| `http://localhost:8080/h2-console` | H2 DB 콘솔 (개발 전용) |
| `http://localhost:8080/api/photos` | 사진 목록 API |

H2 콘솔 접속 정보:
- JDBC URL: `jdbc:h2:mem:happinessdb`
- 사용자: `sa` / 비밀번호: 없음

```bash
# 테스트 실행
./gradlew test

# 특정 클래스만
./gradlew test --tests "com.happiness.app.ClassName"

# 운영 프로파일 (PostgreSQL)
./gradlew bootRun --args='--spring.profiles.active=prod'
```

### 2. 프론트엔드 (React)

> **선행 조건**: 백엔드(`http://localhost:8080`)가 실행 중이어야 API가 작동합니다.

```bash
cd frontend

# 패키지 설치
npm install

# 개발 서버 실행
npm start        # http://localhost:3000

# 프로덕션 빌드
npm run build    # build/ 폴더 생성

# 테스트
npm test
```

### 3. 모바일 (React Native + Expo)

```bash
cd mobile

# 패키지 설치
npm install

# Expo 개발 서버
npm start

# 시뮬레이터/에뮬레이터
npm run ios        # iOS 시뮬레이터 (macOS only)
npm run android    # Android 에뮬레이터
```

> **Android**: API 호스트가 `localhost:8080` 대신 `10.0.2.2:8080`으로 설정됩니다.

---

## 포트 정리

| 서비스 | 포트 |
|--------|------|
| 백엔드 API | 8080 |
| H2 콘솔 | 8080/h2-console |
| 프론트엔드 | 3000 |
| Expo 개발 서버 | 19000 |

---

## 주요 기능

### 사진 보정 (프론트엔드 `PhotoFormPage`)

파일 업로드 시 6가지 보정 조정값과 커브 에디터를 제공합니다.

| 파라미터 | 범위 | 설명 |
|---------|------|------|
| 노출 | -3 ~ +3 EV | 전체 밝기 (EV stop 기반) |
| 대비 | -100 ~ +100 | S-커브 대비 조정 |
| 밝은 영역 | -100 ~ +100 | 하이라이트 영역(75% 亮度) 조정 |
| 어두운 영역 | -100 ~ +100 | 쉐도우 영역(25% 亮度) 조정 |
| 흰색 계열 | -100 ~ +100 | 백점 조정 |
| 검정 계열 | -100 ~ +100 | 흑점 조정 |
| 곡선 | — | Catmull-Rom 스플라인 커브 에디터 |

보정 파이프라인: **Blacks → Exposure → Shadows → Highlights → Whites → Contrast → Curve**

Canvas API + LUT(룩업 테이블) 방식으로 256-entry LUT를 빌드해 실시간 픽셀 보정.

### 색채학 분석 (백엔드 자동 적용)

이미지 업로드 시 자동으로 분석:
- `dominantColor`: 대표 색상 (HEX)
- `colorMood`: 분위기 분류 (WARM / ENERGETIC / NATURAL / COOL / SERENE / ROMANTIC / VIBRANT / MUTED / DRAMATIC / CLEAN / MONOCHROME)
- `colorPalette`: 상위 5색 JSON

### 갤러리 12컬럼 그리드

`packRows()` 알고리즘으로 `gridColSpan` 합이 12가 되도록 사진을 행으로 묶음.

---

## API 주요 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/photos` | 전체 사진 목록 |
| `POST` | `/api/photos` | 사진 등록 (JSON + imageUrl) |
| `POST` | `/api/photos/upload` | 파일 업로드 (multipart) |
| `PUT` | `/api/photos/{id}` | 사진 수정 |
| `DELETE` | `/api/photos/{id}` | 사진 삭제 |
| `POST` | `/api/auth/signup` | 회원가입 |
| `POST` | `/api/auth/login` | 로그인 |
| `PUT` | `/api/auth/member/{id}/profile` | 프로필 수정 |

---

## 빌드 검증 체크리스트

```bash
# 1. Java 25 확인
java -version   # openjdk 25.x

# 2. 백엔드 빌드
cd backend && ./gradlew clean build -x test   # BUILD SUCCESSFUL

# 3. 프론트엔드 빌드
cd frontend && npm run build                  # Compiled successfully.
```
