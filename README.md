# happiness-app

React + Spring Boot로 만든 사진 공유 앱

## 프로젝트 구조

```
happiness-app/
├── backend/    Spring Boot 백엔드 (포트 8080)
├── frontend/   React 프론트엔드 (포트 3000)
└── mobile/     React Native + Expo 모바일 앱
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | Java 25, Spring Boot 3.4.5, Gradle 9.5, H2(개발) / PostgreSQL(운영) |
| 프론트엔드 | React 18, React Router DOM v6 |
| 모바일 | React Native 0.72, Expo 49 |

---

## 로컬 실행 방법

### 1. 백엔드 (Spring Boot)

```bash
cd backend
./gradlew bootRun
```

- 서버: http://localhost:8080
- H2 콘솔(개발용): http://localhost:8080/h2-console

빌드만 하려면:

```bash
./gradlew clean build -x test
```

### 2. 프론트엔드 (React)

```bash
cd frontend
npm install
npm start
```

- 앱: http://localhost:3000
- 백엔드가 먼저 실행 중이어야 API 호출이 정상 동작합니다.

### 3. 모바일 (React Native + Expo)

```bash
cd mobile
npm install
npm start          # Expo 개발 서버
npm run ios        # iOS 시뮬레이터
npm run android    # Android 에뮬레이터
```

Android 에뮬레이터는 `localhost` 대신 `10.0.2.2:8080`으로 백엔드에 접근합니다.

---

## 포트 요약

| 서비스 | 포트 |
|--------|------|
| 백엔드 | 8080 |
| 프론트엔드 | 3000 |
| H2 콘솔 | 8080/h2-console |
